package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"cloud.google.com/go/storage"
	"github.com/disintegration/imaging"
	"github.com/rwcarlsen/goexif/exif"
	_ "github.com/rwcarlsen/goexif/tiff"
	_ "golang.org/x/image/webp"
)

// Canonical storage path contract (must match TypeScript src/lib/storage-paths.ts):
//
// tenants/{user_uuid}/{domain_category}/{year}/{month}/{asset_uuid}/original/{filename}.{ext}
// tenants/{user_uuid}/{domain_category}/{year}/{month}/{asset_uuid}/derivatives/{size}.webp
//
// Segment indices: [0]=tenants [1]=userId [2]=domain [3]=year [4]=month [5]=assetId [6]=original|derivatives [7]=filename

type EventarcPayload struct {
	Bucket string `json:"bucket"`
	Name   string `json:"name"`
}

type Dimensions struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

type TechnicalMetadata struct {
	CameraModel  string  `json:"cameraModel,omitempty"`
	LensModel    string  `json:"lensModel,omitempty"`
	ISO          int     `json:"iso,omitempty"`
	Aperture     float64 `json:"aperture,omitempty"`
	ShutterSpeed string  `json:"shutterSpeed,omitempty"`
	FocalLength  float64 `json:"focalLength,omitempty"`
	CaptureDate  string  `json:"captureDate,omitempty"`
}

type Location struct {
	Latitude  float64 `json:"latitude,omitempty"`
	Longitude float64 `json:"longitude,omitempty"`
}

type Thumbnails struct {
	Small  string `json:"small"`
	Medium string `json:"medium"`
}

type CallbackPayload struct {
	AssetID        string             `json:"assetId"`
	Status         string             `json:"status"`
	ErrorMessage   string             `json:"errorMessage,omitempty"`
	ProcessingStep string             `json:"processingStep,omitempty"`
	Dimensions     *Dimensions        `json:"dimensions,omitempty"`
	Technical      *TechnicalMetadata `json:"technical,omitempty"`
	Location       *Location          `json:"location,omitempty"`
	Thumbnails     *Thumbnails        `json:"thumbnails,omitempty"`
}

// --- Path classification (mirrors TypeScript classifyDomainCategory) ---

func classifyDomainCategory(ext string) string {
	ext = strings.ToLower(ext)
	switch ext {
	case ".dng", ".arw", ".cr2", ".nef", ".orf", ".rw2", ".pef", ".raf":
		return "digital-negatives"
	case ".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif", ".tiff":
		return "visual-media"
	case ".mp4", ".mov", ".mkv", ".avi", ".webm":
		return "motion-media"
	case ".mp3", ".wav", ".flac", ".ogg":
		return "audio-media"
	case ".pdf", ".json", ".csv", ".md", ".txt":
		return "structured-records"
	default:
		return "unclassified-artifacts"
	}
}

type parsedPath struct {
	UserID   string
	Domain   string
	Year     string
	Month    string
	AssetID  string
	Segment  string // "original" or "derivatives"
	Filename string
}

func parseStoragePathV2(objectName string) (*parsedPath, bool) {
	parts := strings.Split(objectName, "/")
	if len(parts) < 8 || parts[0] != "tenants" {
		return nil, false
	}
	segment := parts[6]
	if segment != "original" && segment != "derivatives" {
		return nil, false
	}
	return &parsedPath{
		UserID:   parts[1],
		Domain:   parts[2],
		Year:     parts[3],
		Month:    parts[4],
		AssetID:  parts[5],
		Segment:  segment,
		Filename: strings.Join(parts[7:], "/"),
	}, true
}

func buildDerivativePath(userID, domain, year, month, assetID, name string) string {
	return fmt.Sprintf("tenants/%s/%s/%s/%s/%s/derivatives/%s.webp", userID, domain, year, month, assetID, name)
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	http.HandleFunc("/", handleWebhook)

	log.Printf("Go dual-mode processing worker listening securely on port %s...", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server startup failed: %v", err)
	}
}

func handleWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var event EventarcPayload
	if err := json.Unmarshal(bodyBytes, &event); err != nil {
		var cloudEvent struct {
			Data EventarcPayload `json:"data"`
		}
		if err := json.Unmarshal(bodyBytes, &cloudEvent); err == nil && cloudEvent.Data.Bucket != "" {
			event = cloudEvent.Data
		} else {
			http.Error(w, "Unprocessable GCS Event Envelope", http.StatusUnprocessableEntity)
			return
		}
	}

	if event.Bucket == "" || event.Name == "" {
		log.Printf("Incomplete Event payload received: bucket='%s', name='%s'", event.Bucket, event.Name)
		w.WriteHeader(http.StatusOK)
		return
	}

	parsed, ok := parseStoragePathV2(event.Name)
	if !ok || parsed.Segment != "original" {
		log.Printf("Ignoring non-original or unparseable path: %s", event.Name)
		w.WriteHeader(http.StatusOK)
		return
	}

	if strings.Contains(event.Name, "/derivatives/") {
		log.Printf("Ignoring derivatives path to prevent loops: %s", event.Name)
		w.WriteHeader(http.StatusOK)
		return
	}

	log.Printf("Active Ingestion Session: User='%s', Domain='%s', Asset='%s', File='%s'",
		parsed.UserID, parsed.Domain, parsed.AssetID, parsed.Filename)

	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Minute)
	go func() {
		defer cancel()
		processAssetPipeline(ctx, event.Bucket, event.Name, parsed)
	}()

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Asset ingestion processing initiated asynchronously"))
}

func processAssetPipeline(ctx context.Context, bucketName, objectName string, p *parsedPath) {
	isLocalMode := bucketName == "local" || os.Getenv("GCS_BUCKET") == ""

	ext := strings.ToLower(filepath.Ext(p.Filename))
	isRaw := ext == ".dng" || ext == ".arw" || ext == ".cr2" || ext == ".nef"
	isImage := ext == ".jpg" || ext == ".jpeg" || ext == ".png" || isRaw
	isVideo := ext == ".mp4" || ext == ".mov" || ext == ".mkv" || ext == ".avi"

	var dims *Dimensions
	var tech *TechnicalMetadata
	var loc *Location

	// Stage 1: EXIF Metadata Extraction
	if isImage {
		sendStageUpdate(p.AssetID, "exif_parsing")
		log.Printf("[%s] Performing EXIF range parse (64KB)...", p.AssetID)
		rangeReader, rangeErr := getRangeReader(ctx, isLocalMode, bucketName, objectName, p)
		if rangeErr == nil {
			tech, loc = parseEXIF(rangeReader)
			rangeReader.Close()
		} else {
			log.Printf("[%s] Range reader request failed: %v", p.AssetID, rangeErr)
		}
	}

	// Stage 2: Image Decoding & Thumbnail Generation
	if isImage {
		sendStageUpdate(p.AssetID, "generating_webp")
		log.Printf("[%s] Downloading original asset bytes for thumbnail generation...", p.AssetID)
		reader, readErr := getFullReader(ctx, isLocalMode, bucketName, objectName, p)
		if readErr != nil {
			log.Printf("[%s] Failed to open original reader: %v", p.AssetID, readErr)
			triggerCallbackError(p.AssetID, fmt.Sprintf("Download failed: %v", readErr))
			return
		}

		var buf bytes.Buffer
		if _, copyErr := io.Copy(&buf, reader); copyErr != nil {
			reader.Close()
			triggerCallbackError(p.AssetID, fmt.Sprintf("Reading asset buffer failed: %v", copyErr))
			return
		}
		reader.Close()

		decodedImg, decodedFormat, decodeErr := decodeOriginalImage(buf.Bytes(), ext)
		if decodeErr != nil {
			log.Printf("[%s] Failed to decode image: %v", p.AssetID, decodeErr)
			triggerCallbackError(p.AssetID, fmt.Sprintf("Decoder failure: %v", decodeErr))
			return
		}

		bounds := decodedImg.Bounds()
		dims = &Dimensions{Width: bounds.Dx(), Height: bounds.Dy()}
		log.Printf("[%s] Decoded format: %s, Dimensions: %dx%d", p.AssetID, decodedFormat, dims.Width, dims.Height)

		thumbsErr := renderImageThumbnails(ctx, isLocalMode, bucketName, p, decodedImg)
		if thumbsErr != nil {
			log.Printf("[%s] Thumbnail rendering failed: %v", p.AssetID, thumbsErr)
			triggerCallbackError(p.AssetID, fmt.Sprintf("Thumbnail generation failed: %v", thumbsErr))
			return
		}
	} else if isVideo {
		sendStageUpdate(p.AssetID, "generating_webp")
		log.Printf("[%s] Processing video asset poster frame...", p.AssetID)
		var extractErr error
		dims, extractErr = processVideoPoster(ctx, isLocalMode, bucketName, p, objectName)
		if extractErr != nil {
			log.Printf("[%s] Video poster generation failed: %v", p.AssetID, extractErr)
			triggerCallbackError(p.AssetID, fmt.Sprintf("Video processing failed: %v", extractErr))
			return
		}
	}

	// Stage 3: Webhook Success Callback
	sendStageUpdate(p.AssetID, "registering_assets")
	triggerCallbackSuccess(isLocalMode, p, dims, tech, loc, isImage || isVideo)
}

// gcsReadCloser keeps the GCS client alive until the caller closes the reader.
// The previous pattern of `defer client.Close()` inside the getter functions
// closed the client transport before the caller could read a single byte,
// causing io.Copy to hang indefinitely.
type gcsReadCloser struct {
	io.ReadCloser
	client *storage.Client
}

func (g *gcsReadCloser) Close() error {
	err := g.ReadCloser.Close()
	g.client.Close()
	return err
}

func getRangeReader(ctx context.Context, isLocal bool, bucketName, objectName string, p *parsedPath) (io.ReadCloser, error) {
	if isLocal {
		localPath := getLocalAssetPath(p)
		file, err := os.Open(localPath)
		if err != nil {
			return nil, err
		}
		return struct {
			io.Reader
			io.Closer
		}{io.LimitReader(file, 65536), file}, nil
	}

	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, err
	}
	reader, err := client.Bucket(bucketName).Object(objectName).NewRangeReader(ctx, 0, 65536)
	if err != nil {
		client.Close()
		return nil, err
	}
	return &gcsReadCloser{reader, client}, nil
}

func getFullReader(ctx context.Context, isLocal bool, bucketName, objectName string, p *parsedPath) (io.ReadCloser, error) {
	if isLocal {
		localPath := getLocalAssetPath(p)
		return os.Open(localPath)
	}

	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, err
	}
	reader, err := client.Bucket(bucketName).Object(objectName).NewReader(ctx)
	if err != nil {
		client.Close()
		return nil, err
	}
	return &gcsReadCloser{reader, client}, nil
}

// localMediaRoot returns the absolute path of the project's public/media
// directory. The dev wrapper (scripts/dev-with-worker.sh) sets
// LOCAL_MEDIA_ROOT so we don't have to guess from a relative cwd. As a
// fallback, prefer cwd-relative `public/media` (worker launched from
// project root) before `../../public/media` (worker launched from
// scripts/worker/) so we never write outside the project by accident.
func localMediaRoot() string {
	if env := os.Getenv("LOCAL_MEDIA_ROOT"); env != "" {
		return env
	}
	for _, candidate := range []string{"public/media", "../../public/media"} {
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			abs, absErr := filepath.Abs(candidate)
			if absErr == nil {
				return abs
			}
			return candidate
		}
	}
	// Last resort: cwd-relative public/media. Will be created on first write.
	abs, _ := filepath.Abs("public/media")
	return abs
}

func localTenantPath(p *parsedPath, segment string) string {
	return filepath.Join(localMediaRoot(), "tenants", p.UserID, p.Domain, p.Year, p.Month, p.AssetID, segment)
}

// assertInsideMediaRoot is a safety guard against any future regression
// that resolves a write path outside the project's public/media tree.
// Returns an error if `candidate` doesn't sit under `localMediaRoot()`.
func assertInsideMediaRoot(candidate string) error {
	root, err := filepath.Abs(localMediaRoot())
	if err != nil {
		return fmt.Errorf("media root resolution failed: %v", err)
	}
	abs, err := filepath.Abs(candidate)
	if err != nil {
		return fmt.Errorf("candidate path resolution failed: %v", err)
	}
	if !strings.HasPrefix(abs+string(filepath.Separator), root+string(filepath.Separator)) && abs != root {
		return fmt.Errorf("refusing write outside media root: %s (root=%s)", abs, root)
	}
	return nil
}

func getLocalAssetPath(p *parsedPath) string {
	candidate := filepath.Join(localTenantPath(p, "original"), p.Filename)
	if _, err := os.Stat(candidate); err == nil {
		log.Printf("[%s] Resolved local asset at: %s", p.AssetID, candidate)
		return candidate
	}
	log.Printf("[%s] WARNING: Could not locate local asset at: %s", p.AssetID, candidate)
	return candidate
}

func decodeOriginalImage(data []byte, ext string) (image.Image, string, error) {
	buf := bytes.NewReader(data)
	if ext == ".png" {
		img, err := png.Decode(buf)
		return img, "png", err
	}
	img, err := jpeg.Decode(buf)
	return img, "jpeg", err
}

func parseEXIF(r io.Reader) (*TechnicalMetadata, *Location) {
	x, err := exif.Decode(r)
	if err != nil {
		log.Printf("EXIF decoding skipped: %v", err)
		return nil, nil
	}

	tech := &TechnicalMetadata{}
	loc := &Location{}

	if camModel, err := x.Get(exif.Model); err == nil {
		tech.CameraModel = strings.Trim(camModel.String(), "\" ")
	}

	if lensModel, err := x.Get(exif.FieldName("LensModel")); err == nil {
		tech.LensModel = strings.Trim(lensModel.String(), "\" ")
	}

	if isoVal, err := x.Get(exif.ISOSpeedRatings); err == nil {
		if isoInt, err := isoVal.Int(0); err == nil {
			tech.ISO = isoInt
		}
	}

	if fNum, err := x.Get(exif.FNumber); err == nil {
		if rat, err := fNum.Rat(0); err == nil {
			val, _ := rat.Float64()
			tech.Aperture = math.Round(val*10) / 10
		}
	}

	if expTime, err := x.Get(exif.ExposureTime); err == nil {
		if rat, err := expTime.Rat(0); err == nil {
			val, _ := rat.Float64()
			if val < 1.0 {
				tech.ShutterSpeed = fmt.Sprintf("1/%d", int(math.Round(1.0/val)))
			} else {
				tech.ShutterSpeed = fmt.Sprintf("%.1fs", val)
			}
		}
	}

	if fLength, err := x.Get(exif.FocalLength); err == nil {
		if rat, err := fLength.Rat(0); err == nil {
			val, _ := rat.Float64()
			tech.FocalLength = math.Round(val)
		}
	}

	if datetime, err := x.DateTime(); err == nil {
		tech.CaptureDate = datetime.Format(time.RFC3339)
	}

	if lat, lng, err := x.LatLong(); err == nil {
		loc.Latitude = lat
		loc.Longitude = lng
	}

	return tech, loc
}

func renderImageThumbnails(ctx context.Context, isLocal bool, bucketName string, p *parsedPath, img image.Image) error {
	sizes := map[string]int{
		"small":  300,
		"medium": 1200,
	}

	for name, width := range sizes {
		bounds := img.Bounds()
		ratio := float64(bounds.Dy()) / float64(bounds.Dx())
		height := int(float64(width) * ratio)

		resized := imaging.Resize(img, width, height, imaging.Lanczos)

		var pngBuf bytes.Buffer
		if err := png.Encode(&pngBuf, resized); err != nil {
			return fmt.Errorf("encoding png for cwebp failed: %v", err)
		}

		cmd := exec.CommandContext(ctx, "cwebp", "-q", "80", "-o", "-", "--", "-")
		cmd.Stdin = &pngBuf
		var webpBuf bytes.Buffer
		cmd.Stdout = &webpBuf
		var stderr bytes.Buffer
		cmd.Stderr = &stderr

		if err := cmd.Run(); err != nil {
			return fmt.Errorf("cwebp execution failed: %v, stderr: %s", err, stderr.String())
		}

		if isLocal {
			derivDir := localTenantPath(p, "derivatives")
			if err := assertInsideMediaRoot(derivDir); err != nil {
				return err
			}
			if err := os.MkdirAll(derivDir, 0755); err != nil {
				return fmt.Errorf("creating derivative dir failed: %v", err)
			}
			derivPath := filepath.Join(derivDir, fmt.Sprintf("%s.webp", name))
			if err := os.WriteFile(derivPath, webpBuf.Bytes(), 0644); err != nil {
				return fmt.Errorf("writing local derivative failed: %v", err)
			}
			log.Printf("[%s] Local derivative '%s' saved: %s", p.AssetID, name, derivPath)
		} else {
			client, err := storage.NewClient(ctx)
			if err != nil {
				return err
			}
			defer client.Close()

			derivPath := buildDerivativePath(p.UserID, p.Domain, p.Year, p.Month, p.AssetID, name)
			writer := client.Bucket(bucketName).Object(derivPath).NewWriter(ctx)
			writer.ContentType = "image/webp"

			if _, err := io.Copy(writer, &webpBuf); err != nil {
				writer.Close()
				return fmt.Errorf("uploading derivative '%s' failed: %v", name, err)
			}
			writer.Close()
			log.Printf("[%s] GCS derivative '%s' uploaded: %s", p.AssetID, name, derivPath)
		}
	}

	return nil
}

func processVideoPoster(ctx context.Context, isLocal bool, bucketName string, p *parsedPath, objectName string) (*Dimensions, error) {
	var mediaSource string

	if isLocal {
		mediaSource = getLocalAssetPath(p)
	} else {
		storageClient, err := storage.NewClient(ctx)
		if err != nil {
			return nil, err
		}
		defer storageClient.Close()

		signedURL, err := storageClient.Bucket(bucketName).SignedURL(objectName, &storage.SignedURLOptions{
			Method:  "GET",
			Expires: time.Now().Add(30 * time.Minute),
		})
		if err != nil {
			return nil, fmt.Errorf("video signed read URL failed: %v", err)
		}
		mediaSource = signedURL
	}

	cmdProbe := exec.CommandContext(ctx, "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", mediaSource)
	var outProbe bytes.Buffer
	cmdProbe.Stdout = &outProbe
	if err := cmdProbe.Run(); err != nil {
		return nil, fmt.Errorf("ffprobe failed: %v", err)
	}

	dimStr := strings.TrimSpace(outProbe.String())
	dimParts := strings.Split(dimStr, "x")
	width := 1920
	height := 1080
	if len(dimParts) == 2 {
		width, _ = strconv.Atoi(dimParts[0])
		height, _ = strconv.Atoi(dimParts[1])
	}

	cmdExtract := exec.CommandContext(ctx, "ffmpeg", "-ss", "00:00:01", "-i", mediaSource, "-vframes", "1", "-f", "image2pipe", "-vcodec", "png", "-")
	var outFrame bytes.Buffer
	cmdExtract.Stdout = &outFrame
	if err := cmdExtract.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg extraction failed: %v", err)
	}

	img, _, err := image.Decode(bytes.NewReader(outFrame.Bytes()))
	if err != nil {
		return nil, fmt.Errorf("decoding extracted poster frame failed: %v", err)
	}

	if err := renderImageThumbnails(ctx, isLocal, bucketName, p, img); err != nil {
		return nil, err
	}

	return &Dimensions{Width: width, Height: height}, nil
}

func triggerCallbackSuccess(isLocal bool, p *parsedPath, dims *Dimensions, tech *TechnicalMetadata, loc *Location, hasThumbs bool) {
	serverURL := os.Getenv("NEXT_PUBLIC_SERVER_URL")
	if serverURL == "" {
		serverURL = "http://localhost:3000"
	}

	bucketName := os.Getenv("GCS_BUCKET")
	secret := os.Getenv("PROCESSOR_CALLBACK_SECRET")
	if secret == "" {
		secret = "fallback-dev-secret-key-9988"
	}

	var thumbs *Thumbnails
	if hasThumbs {
		if isLocal {
			thumbs = &Thumbnails{
				Small:  fmt.Sprintf("/media/tenants/%s/%s/%s/%s/%s/derivatives/small.webp", p.UserID, p.Domain, p.Year, p.Month, p.AssetID),
				Medium: fmt.Sprintf("/media/tenants/%s/%s/%s/%s/%s/derivatives/medium.webp", p.UserID, p.Domain, p.Year, p.Month, p.AssetID),
			}
		} else {
			thumbs = &Thumbnails{
				Small:  fmt.Sprintf("https://storage.googleapis.com/%s/%s", bucketName, buildDerivativePath(p.UserID, p.Domain, p.Year, p.Month, p.AssetID, "small")),
				Medium: fmt.Sprintf("https://storage.googleapis.com/%s/%s", bucketName, buildDerivativePath(p.UserID, p.Domain, p.Year, p.Month, p.AssetID, "medium")),
			}
		}
	}

	payload := CallbackPayload{
		AssetID:    p.AssetID,
		Status:     "ready",
		Dimensions: dims,
		Technical:  tech,
		Location:   loc,
		Thumbnails: thumbs,
	}

	sendCallbackPayload(serverURL, secret, payload)
}

func triggerCallbackError(assetID, errMsg string) {
	serverURL := os.Getenv("NEXT_PUBLIC_SERVER_URL")
	if serverURL == "" {
		serverURL = "http://localhost:3000"
	}

	secret := os.Getenv("PROCESSOR_CALLBACK_SECRET")
	if secret == "" {
		secret = "fallback-dev-secret-key-9988"
	}

	payload := CallbackPayload{
		AssetID:      assetID,
		Status:       "failed",
		ErrorMessage: errMsg,
	}

	sendCallbackPayload(serverURL, secret, payload)
}

func sendStageUpdate(assetID, step string) {
	serverURL := os.Getenv("NEXT_PUBLIC_SERVER_URL")
	if serverURL == "" {
		serverURL = "http://localhost:3000"
	}

	secret := os.Getenv("PROCESSOR_CALLBACK_SECRET")
	if secret == "" {
		secret = "fallback-dev-secret-key-9988"
	}

	payload := CallbackPayload{
		AssetID:        assetID,
		Status:         "stage_update",
		ProcessingStep: step,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[%s] Failed to marshal stage update: %v", assetID, err)
		return
	}

	callbackURL := fmt.Sprintf("%s/api/media/process-callback", serverURL)
	req, err := http.NewRequest("POST", callbackURL, bytes.NewBuffer(body))
	if err != nil {
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-processor-secret", secret)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[%s] Stage update dispatch failed: %v", assetID, err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[%s] Stage update rejected %d: %s", assetID, resp.StatusCode, string(body))
	}
}

func sendCallbackPayload(serverURL, secret string, payload CallbackPayload) {
	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Failed to marshal callback JSON: %v", err)
		return
	}

	callbackURL := fmt.Sprintf("%s/api/media/process-callback", serverURL)
	log.Printf("Dispatching processing callback to %s...", callbackURL)

	req, err := http.NewRequest("POST", callbackURL, bytes.NewBuffer(body))
	if err != nil {
		log.Printf("Failed to create webhook request: %v", err)
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-processor-secret", secret)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Webhook dispatch failed: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("Webhook callback rejected with status %d: %s", resp.StatusCode, string(respBody))
	} else {
		log.Printf("Webhook callback successfully accepted for asset %s!", payload.AssetID)
	}
}
