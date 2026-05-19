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

// EventarcPayload defines the typical GCS Eventarc event properties
type EventarcPayload struct {
	Bucket string `json:"bucket"`
	Name   string `json:"name"`
}

type Dimensions struct {
	Width  int     `json:"width"`
	Height int     `json:"height"`
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
	AssetID      string            `json:"assetId"`
	Status       string            `json:"status"` // "ready" or "failed"
	ErrorMessage string            `json:"errorMessage,omitempty"`
	Dimensions   *Dimensions       `json:"dimensions,omitempty"`
	Technical    *TechnicalMetadata `json:"technical,omitempty"`
	Location     *Location         `json:"location,omitempty"`
	Thumbnails   *Thumbnails       `json:"thumbnails,omitempty"`
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

	// 1. Read and parse incoming GCS event payload
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var event EventarcPayload
	if err := json.Unmarshal(bodyBytes, &event); err != nil {
		log.Printf("Standard JSON unmarshal failed, checking CloudEvent envelope: %v", err)
		
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

	// 2. Path Isolation Inspection
	// Expected key layout: [USER_UUID]/[YEAR]/[ASSET_UUID]/original.[EXTENSION]
	parts := strings.Split(event.Name, "/")
	if len(parts) < 4 || strings.Contains(event.Name, "/thumbs/") {
		// Prevent loops: Ignore any objects residing inside the "thumbs" directory
		log.Printf("Ignoring non-original file event path: %s", event.Name)
		w.WriteHeader(http.StatusOK)
		return
	}

	userID := parts[0]
	year := parts[1]
	assetID := parts[2]
	fileName := parts[3]
	extension := strings.ToLower(filepath.Ext(fileName))

	log.Printf("Active Ingestion Session: User='%s', Asset='%s', File='%s', Extension='%s'", userID, assetID, fileName, extension)

	// Trigger asynchronous pipeline run
	ctx := context.Background()
	go processAssetPipeline(ctx, event.Bucket, event.Name, userID, year, assetID, fileName, extension)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Asset ingestion processing initiated asynchronously"))
}

func processAssetPipeline(ctx context.Context, bucketName, objectName, userID, year, assetID, fileName, ext string) {
	isLocalMode := bucketName == "local" || os.Getenv("GCS_BUCKET") == ""

	isRaw := ext == ".dng" || ext == ".arw" || ext == ".cr2" || ext == ".nef"
	isImage := ext == ".jpg" || ext == ".jpeg" || ext == ".png" || isRaw
	isVideo := ext == ".mp4" || ext == ".mov" || ext == ".mkv" || ext == ".avi"

	var dims *Dimensions
	var tech *TechnicalMetadata
	var loc *Location
	var imgData []byte

	// 1. EXIF Metadata Extraction via Range Reader (64KB Limit)
	if isImage {
		log.Printf("[%s] Performing EXIF range parse (64KB)...", assetID)
		rangeReader, rangeErr := getRangeReader(ctx, isLocalMode, bucketName, objectName, userID, year, assetID, fileName)
		if rangeErr == nil {
			tech, loc = parseEXIF(rangeReader)
			rangeReader.Close()
		} else {
			log.Printf("[%s] Range reader request failed: %v", assetID, rangeErr)
		}
	}

	// 2. Image Decoding & Thumbnail Generation
	if isImage {
		log.Printf("[%s] Downloading original asset bytes for thumbnail generation...", assetID)
		reader, readErr := getFullReader(ctx, isLocalMode, bucketName, objectName, userID, year, assetID, fileName)
		if readErr != nil {
			log.Printf("[%s] Failed to open original reader: %v", assetID, readErr)
			triggerCallbackError(assetID, fmt.Sprintf("Download failed: %v", readErr))
			return
		}
		
		var buf bytes.Buffer
		if _, copyErr := io.Copy(&buf, reader); copyErr != nil {
			reader.Close()
			triggerCallbackError(assetID, fmt.Sprintf("Reading asset buffer failed: %v", copyErr))
			return
		}
		reader.Close()
		imgData = buf.Bytes()

		// Decode original image
		decodedImg, decodedFormat, decodeErr := decodeOriginalImage(imgData, ext)
		if decodeErr != nil {
			log.Printf("[%s] Failed to decode image: %v", assetID, decodeErr)
			triggerCallbackError(assetID, fmt.Sprintf("Decoder failure: %v", decodeErr))
			return
		}

		bounds := decodedImg.Bounds()
		dims = &Dimensions{Width: bounds.Dx(), Height: bounds.Dy()}
		log.Printf("[%s] Decoded format: %s, Dimensions: %dx%d", assetID, decodedFormat, dims.Width, dims.Height)

		// Render WebP thumbnails
		thumbsErr := renderImageThumbnails(ctx, isLocalMode, bucketName, userID, year, assetID, decodedImg)
		if thumbsErr != nil {
			log.Printf("[%s] Thumbnail rendering failed: %v", assetID, thumbsErr)
			triggerCallbackError(assetID, fmt.Sprintf("Thumbnail generation failed: %v", thumbsErr))
			return
		}
	} else if isVideo {
		log.Printf("[%s] Processing video asset poster frame...", assetID)
		// Extract video details and poster frame via ffmpeg
		var extractErr error
		dims, extractErr = processVideoPoster(ctx, isLocalMode, bucketName, userID, year, assetID, fileName, objectName)
		if extractErr != nil {
			log.Printf("[%s] Video poster generation failed: %v", assetID, extractErr)
			triggerCallbackError(assetID, fmt.Sprintf("Video processing failed: %v", extractErr))
			return
		}
	}

	// 3. Webhook Success Callback
	triggerCallbackSuccess(isLocalMode, assetID, userID, year, dims, tech, loc, isImage || isVideo)
}

// getRangeReader conditionally opens a local file or standard GCS range stream
func getRangeReader(ctx context.Context, isLocal bool, bucketName, objectName, userID, year, assetID, fileName string) (io.ReadCloser, error) {
	if isLocal {
		localPath := getLocalAssetPath(userID, year, assetID, fileName)
		file, err := os.Open(localPath)
		if err != nil {
			return nil, err
		}
		// Return 64KB range limit slice
		return struct {
			io.Reader
			io.Closer
		}{io.LimitReader(file, 65536), file}, nil
	}

	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()
	return client.Bucket(bucketName).Object(objectName).NewRangeReader(ctx, 0, 65536)
}

// getFullReader conditionally opens a local file or standard GCS stream
func getFullReader(ctx context.Context, isLocal bool, bucketName, objectName, userID, year, assetID, fileName string) (io.ReadCloser, error) {
	if isLocal {
		localPath := getLocalAssetPath(userID, year, assetID, fileName)
		return os.Open(localPath)
	}

	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()
	return client.Bucket(bucketName).Object(objectName).NewReader(ctx)
}

func getLocalAssetPath(userID, year, assetID, fileName string) string {
	// Look up in Next.js public directory
	paths := []string{
		filepath.Join("../../public/media", userID, year, assetID, fileName),
		filepath.Join("public/media", userID, year, assetID, fileName),
		filepath.Join("../../public/media", fileName),
		filepath.Join("public/media", fileName),
	}
	for _, p := range paths {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	// Fallback to first path
	return paths[0]
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

func renderImageThumbnails(ctx context.Context, isLocal bool, bucketName, userID, year, assetID string, img image.Image) error {
	sizes := map[string]int{
		"small":  300,
		"medium": 1200,
	}

	for name, width := range sizes {
		bounds := img.Bounds()
		ratio := float64(bounds.Dy()) / float64(bounds.Dx())
		height := int(float64(width) * ratio)

		resized := imaging.Resize(img, width, height, imaging.Lanczos)

		// 1. Encode the resized image into a lossless PNG buffer
		var pngBuf bytes.Buffer
		if err := png.Encode(&pngBuf, resized); err != nil {
			return fmt.Errorf("encoding png for cwebp failed: %v", err)
		}

		// 2. Compress PNG into highly optimized WebP via subprocess piping using cwebp
		// cwebp -q 80 -o - -- -
		cmd := exec.Command("cwebp", "-q", "80", "-o", "-", "--", "-")
		cmd.Stdin = &pngBuf
		var webpBuf bytes.Buffer
		cmd.Stdout = &webpBuf
		var stderr bytes.Buffer
		cmd.Stderr = &stderr

		if err := cmd.Run(); err != nil {
			return fmt.Errorf("cwebp execution failed: %v, stderr: %s", err, stderr.String())
		}

		if isLocal {
			// Write directly to local disk public/media/thumbs/
			thumbnailDir := filepath.Join("../../public/media", userID, year, assetID, "thumbs")
			_ = os.MkdirAll(thumbnailDir, 0755)
			thumbnailPath := filepath.Join(thumbnailDir, fmt.Sprintf("%s.webp", name))
			
			err := os.WriteFile(thumbnailPath, webpBuf.Bytes(), 0644)
			if err != nil {
				// Try writing to alternative folder if running inside a different CWD
				altDir := filepath.Join("public/media", userID, year, assetID, "thumbs")
				_ = os.MkdirAll(altDir, 0755)
				err = os.WriteFile(filepath.Join(altDir, fmt.Sprintf("%s.webp", name)), webpBuf.Bytes(), 0644)
			}
			if err != nil {
				return fmt.Errorf("writing local thumbnail failed: %v", err)
			}
			log.Printf("[%s] Local Thumbnail '%s' saved to path: %s", assetID, name, thumbnailPath)
		} else {
			// Write to GCS
			client, err := storage.NewClient(ctx)
			if err != nil {
				return err
			}
			defer client.Close()

			thumbnailPath := fmt.Sprintf("%s/%s/%s/thumbs/%s.webp", userID, year, assetID, name)
			writer := client.Bucket(bucketName).Object(thumbnailPath).NewWriter(ctx)
			writer.ContentType = "image/webp"

			if _, err := io.Copy(writer, &webpBuf); err != nil {
				writer.Close()
				return fmt.Errorf("uploading thumbnail '%s' failed: %v", name, err)
			}
			writer.Close()
			log.Printf("[%s] GCS Thumbnail '%s' uploaded successfully to path: %s", assetID, name, thumbnailPath)
		}
	}

	return nil
}

func processVideoPoster(ctx context.Context, isLocal bool, bucketName, userID, year, assetID, fileName, objectName string) (*Dimensions, error) {
	var mediaSource string

	if isLocal {
		mediaSource = getLocalAssetPath(userID, year, assetID, fileName)
	} else {
		// Generate GCS secure read URL for ffmpeg streaming input
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

	// 1. Probe video dimensions via ffprobe
	cmdProbe := exec.Command("ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", mediaSource)
	var outProbe bytes.Buffer
	cmdProbe.Stdout = &outProbe
	if err := cmdProbe.Run(); err != nil {
		return nil, fmt.Errorf("ffprobe failed: %v", err)
	}

	dimStr := strings.TrimSpace(outProbe.String())
	parts := strings.Split(dimStr, "x")
	width := 1920
	height := 1080
	if len(parts) == 2 {
		width, _ = strconv.Atoi(parts[0])
		height, _ = strconv.Atoi(parts[1])
	}

	// 2. Extract single frame at 00:00:01 using ffmpeg piped stdout
	cmdExtract := exec.Command("ffmpeg", "-ss", "00:00:01", "-i", mediaSource, "-vframes", "1", "-f", "image2pipe", "-vcodec", "png", "-")
	var outFrame bytes.Buffer
	cmdExtract.Stdout = &outFrame
	if err := cmdExtract.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg extraction failed: %v", err)
	}

	// Decode extracted frame
	img, _, err := image.Decode(bytes.NewReader(outFrame.Bytes()))
	if err != nil {
		return nil, fmt.Errorf("decoding extracted poster frame failed: %v", err)
	}

	// Upload as standard small/medium thumbs
	if err := renderImageThumbnails(ctx, isLocal, bucketName, userID, year, assetID, img); err != nil {
		return nil, err
	}

	return &Dimensions{Width: width, Height: height}, nil
}

func triggerCallbackSuccess(isLocal bool, assetID, userID, year string, dims *Dimensions, tech *TechnicalMetadata, loc *Location, hasThumbs bool) {
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
			// Local URL paths matching standard Next.js static asset server mapping
			thumbs = &Thumbnails{
				Small:  fmt.Sprintf("/media/%s/%s/%s/thumbs/small.webp", userID, year, assetID),
				Medium: fmt.Sprintf("/media/%s/%s/%s/thumbs/medium.webp", userID, year, assetID),
			}
		} else {
			thumbs = &Thumbnails{
				Small:  fmt.Sprintf("https://storage.googleapis.com/%s/%s/%s/%s/thumbs/small.webp", bucketName, userID, year, assetID),
				Medium: fmt.Sprintf("https://storage.googleapis.com/%s/%s/%s/%s/thumbs/medium.webp", bucketName, userID, year, assetID),
			}
		}
	}

	payload := CallbackPayload{
		AssetID:    assetID,
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
