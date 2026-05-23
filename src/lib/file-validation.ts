/**
 * File header (magic bytes) validation.
 *
 * Validates that a file's leading bytes match the expected signature for its
 * declared extension. Catches corrupt, truncated, or misrepresented files
 * before they reach the worker pipeline.
 *
 * Used in:
 *   - register-local: validates raw bytes at upload time (fails fast, no DB record created)
 *   - Go worker: mirrors this logic for the GCS path (validated from 64KB range read)
 */

export class FileValidationError extends Error {
  status: number
  constructor(message: string) {
    super(message)
    this.name = 'FileValidationError'
    this.status = 422
  }
}

/** Returns a hex string of the first n bytes for error messages. */
function hexSnippet(buf: Buffer, n = 4): string {
  return buf
    .slice(0, Math.min(n, buf.length))
    .toString('hex')
    .toUpperCase()
    .replace(/../g, '$& ')
    .trim()
}

/**
 * Validates the file's magic bytes against its extension.
 * Throws FileValidationError with a specific reason on mismatch.
 * No-ops for extensions without a known signature (e.g. CSV, TXT).
 */
export function validateFileMagicBytes(buf: Buffer, filename: string): void {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''

  if (buf.length === 0) {
    throw new FileValidationError('File is empty (0 bytes)')
  }

  // Minimum sizes required to read the signature
  const MIN_HEADER = 12

  switch (ext) {
    case 'jpg':
    case 'jpeg': {
      // FF D8 FF
      if (buf.length < 3 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) {
        throw new FileValidationError(
          `Invalid JPEG: expected header FF D8 FF, got ${hexSnippet(buf, 3)}`,
        )
      }
      break
    }

    case 'png': {
      // 89 50 4E 47 0D 0A 1A 0A
      const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      if (buf.length < 8 || !PNG_SIG.every((b, i) => buf[i] === b)) {
        throw new FileValidationError(
          `Invalid PNG: expected header 89 50 4E 47 0D 0A 1A 0A, got ${hexSnippet(buf, 8)}`,
        )
      }
      break
    }

    case 'webp': {
      // RIFF????WEBP
      if (
        buf.length < MIN_HEADER ||
        buf.slice(0, 4).toString('ascii') !== 'RIFF' ||
        buf.slice(8, 12).toString('ascii') !== 'WEBP'
      ) {
        throw new FileValidationError(
          `Invalid WebP: RIFF/WEBP container not found, got ${hexSnippet(buf, 12)}`,
        )
      }
      break
    }

    case 'gif': {
      // GIF87a or GIF89a
      const sig = buf.slice(0, 6).toString('ascii')
      if (sig !== 'GIF87a' && sig !== 'GIF89a') {
        throw new FileValidationError(`Invalid GIF: expected GIF87a or GIF89a, got "${sig}"`)
      }
      break
    }

    case 'dng':
    case 'tiff': {
      // Little-endian TIFF: 49 49 2A 00  |  Big-endian TIFF: 4D 4D 00 2A
      if (buf.length < 4) {
        throw new FileValidationError(`${ext.toUpperCase()} file too small to read TIFF header`)
      }
      const isLE = buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00
      const isBE = buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a
      if (!isLE && !isBE) {
        throw new FileValidationError(
          `Invalid ${ext.toUpperCase()}: missing TIFF header (II/MM byte-order mark), got ${hexSnippet(buf, 4)}`,
        )
      }
      break
    }

    case 'arw':
    case 'nef':
    case 'orf':
    case 'rw2':
    case 'pef':
    case 'raf':
    case 'cr2': {
      // All common RAW formats use a TIFF-like header
      if (buf.length < 4) {
        throw new FileValidationError(`${ext.toUpperCase()} file too small to read RAW header`)
      }
      const isLE = buf[0] === 0x49 && buf[1] === 0x49
      const isBE = buf[0] === 0x4d && buf[1] === 0x4d
      if (!isLE && !isBE) {
        throw new FileValidationError(
          `Invalid ${ext.toUpperCase()} RAW file: expected TIFF-based header (II or MM), got ${hexSnippet(buf, 4)}`,
        )
      }
      break
    }

    case 'mp4':
    case 'mov': {
      // ftyp box: 4 bytes size + "ftyp" at offset 4, OR "wide" + "mdat" (some QuickTime)
      // Also accept "free", "mdat", "moov" as valid top-level MP4/MOV atoms
      const VALID_BOXES = ['ftyp', 'free', 'mdat', 'moov', 'wide', 'pnot']
      if (buf.length < 8) {
        throw new FileValidationError(
          `${ext.toUpperCase()} file too small to read container header`,
        )
      }
      const boxType = buf.slice(4, 8).toString('ascii')
      if (!VALID_BOXES.includes(boxType)) {
        throw new FileValidationError(
          `Invalid ${ext.toUpperCase()}: expected MP4/QuickTime container (ftyp box), got box type "${boxType}"`,
        )
      }
      break
    }

    case 'mkv':
    case 'webm': {
      // EBML signature: 1A 45 DF A3
      if (
        buf.length < 4 ||
        buf[0] !== 0x1a ||
        buf[1] !== 0x45 ||
        buf[2] !== 0xdf ||
        buf[3] !== 0xa3
      ) {
        throw new FileValidationError(
          `Invalid ${ext.toUpperCase()}: EBML header not found, got ${hexSnippet(buf, 4)}`,
        )
      }
      break
    }

    case 'avi': {
      // RIFF????AVI
      if (
        buf.length < MIN_HEADER ||
        buf.slice(0, 4).toString('ascii') !== 'RIFF' ||
        buf.slice(8, 12).toString('ascii') !== 'AVI '
      ) {
        throw new FileValidationError(
          `Invalid AVI: RIFF/AVI container not found, got ${hexSnippet(buf, 12)}`,
        )
      }
      break
    }

    case 'mp3': {
      // ID3 tag (49 44 33) or MPEG sync (FF FB / FF F3 / FF F2)
      const hasID3 = buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33
      const hasMpegSync = buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0
      if (!hasID3 && !hasMpegSync) {
        throw new FileValidationError(
          `Invalid MP3: no ID3 tag or MPEG sync header found, got ${hexSnippet(buf, 4)}`,
        )
      }
      break
    }

    case 'wav': {
      // RIFF????WAVE
      if (
        buf.length < MIN_HEADER ||
        buf.slice(0, 4).toString('ascii') !== 'RIFF' ||
        buf.slice(8, 12).toString('ascii') !== 'WAVE'
      ) {
        throw new FileValidationError(
          `Invalid WAV: RIFF/WAVE container not found, got ${hexSnippet(buf, 12)}`,
        )
      }
      break
    }

    case 'flac': {
      // fLaC: 66 4C 61 43
      if (buf.slice(0, 4).toString('ascii') !== 'fLaC') {
        throw new FileValidationError(
          `Invalid FLAC: "fLaC" marker not found, got ${hexSnippet(buf, 4)}`,
        )
      }
      break
    }

    case 'ogg': {
      // OggS: 4F 67 67 53
      if (buf.slice(0, 4).toString('ascii') !== 'OggS') {
        throw new FileValidationError(
          `Invalid OGG: "OggS" capture pattern not found, got ${hexSnippet(buf, 4)}`,
        )
      }
      break
    }

    case 'pdf': {
      // %PDF
      if (buf.slice(0, 4).toString('ascii') !== '%PDF') {
        throw new FileValidationError(
          `Invalid PDF: "%PDF" header not found, got ${hexSnippet(buf, 4)}`,
        )
      }
      break
    }

    // Text/structured formats (CSV, JSON, MD, TXT) have no reliable binary signature — skip.
    default:
      break
  }
}
