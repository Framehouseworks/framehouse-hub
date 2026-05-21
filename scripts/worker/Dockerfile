# Stage 1: Build static Go binary
FROM golang:1.20-alpine AS builder

WORKDIR /app

# Copy dependency files and download modules
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY main.go ./

# Compile static binary with zero external OS dynamic links
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o worker main.go

# Stage 2: Minimal runner container
FROM alpine:latest

# Install ffmpeg for video poster and meta extraction, plus webp CLI tools
# (libwebp-tools provides the `cwebp` binary main.go shells out to) and
# ca-certificates for secure GCS connections. Note: on Alpine the package
# name is `libwebp-tools`, NOT `webp` (the Ubuntu/Debian name).
RUN apk add --no-cache ffmpeg ca-certificates libwebp-tools

WORKDIR /app
COPY --from=builder /app/worker .

EXPOSE 8080

CMD ["./worker"]
