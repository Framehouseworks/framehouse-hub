import { describe, it, expect } from 'vitest'
import {
  evaluatePreviewEligibility,
  PREVIEW_THRESHOLDS,
} from '@/components/Transfers/Preview/types'

describe('FRH-82: Preview Eligibility & Thresholds (Unit)', () => {
  describe('Images (JPEG, PNG, WebP)', () => {
    it('approves JPEG image within 10MB limit', () => {
      const result = evaluatePreviewEligibility('photo.jpg', 'image/jpeg', 5 * 1024 * 1024)
      expect(result.eligible).toBe(true)
      expect(result.mediaType).toBe('image')
    })

    it('approves PNG image within 10MB limit', () => {
      const result = evaluatePreviewEligibility('graphic.png', 'image/png', 9 * 1024 * 1024)
      expect(result.eligible).toBe(true)
      expect(result.mediaType).toBe('image')
    })

    it('approves WebP image within 10MB limit', () => {
      const result = evaluatePreviewEligibility('banner.webp', 'image/webp', 2 * 1024 * 1024)
      expect(result.eligible).toBe(true)
      expect(result.mediaType).toBe('image')
    })

    it('rejects image exceeding 10MB threshold', () => {
      const overLimit = PREVIEW_THRESHOLDS.IMAGE_MAX_BYTES + 1
      const result = evaluatePreviewEligibility('heavy_raw_export.jpg', 'image/jpeg', overLimit)
      expect(result.eligible).toBe(false)
      expect(result.mediaType).toBe('image')
      expect(result.reason).toBe('size_exceeded')
      expect(result.message).toContain('10MB')
    })
  })

  describe('Documents (PDF)', () => {
    it('approves PDF document within 15MB limit', () => {
      const result = evaluatePreviewEligibility('brief.pdf', 'application/pdf', 8 * 1024 * 1024)
      expect(result.eligible).toBe(true)
      expect(result.mediaType).toBe('document')
    })

    it('rejects PDF exceeding 15MB threshold', () => {
      const overLimit = PREVIEW_THRESHOLDS.DOCUMENT_MAX_BYTES + 1024
      const result = evaluatePreviewEligibility('huge_catalog.pdf', 'application/pdf', overLimit)
      expect(result.eligible).toBe(false)
      expect(result.mediaType).toBe('document')
      expect(result.reason).toBe('size_exceeded')
      expect(result.message).toContain('15MB')
    })
  })

  describe('Video (MP4, WebM)', () => {
    it('approves MP4 video within 25MB limit', () => {
      const result = evaluatePreviewEligibility('clip.mp4', 'video/mp4', 20 * 1024 * 1024)
      expect(result.eligible).toBe(true)
      expect(result.mediaType).toBe('video')
    })

    it('approves WebM video within 25MB limit', () => {
      const result = evaluatePreviewEligibility('motion.webm', 'video/webm', 15 * 1024 * 1024)
      expect(result.eligible).toBe(true)
      expect(result.mediaType).toBe('video')
    })

    it('rejects video exceeding 25MB threshold', () => {
      const overLimit = PREVIEW_THRESHOLDS.VIDEO_MAX_BYTES + 1
      const result = evaluatePreviewEligibility('4k_master.mp4', 'video/mp4', overLimit)
      expect(result.eligible).toBe(false)
      expect(result.mediaType).toBe('video')
      expect(result.reason).toBe('size_exceeded')
      expect(result.message).toContain('25MB')
    })
  })

  describe('Audio (MP3, WAV, OGG)', () => {
    it('approves MP3 within 25MB limit', () => {
      const result = evaluatePreviewEligibility('master.mp3', 'audio/mpeg', 12 * 1024 * 1024)
      expect(result.eligible).toBe(true)
      expect(result.mediaType).toBe('audio')
    })

    it('approves WAV within 25MB limit', () => {
      const result = evaluatePreviewEligibility('track.wav', 'audio/wav', 24 * 1024 * 1024)
      expect(result.eligible).toBe(true)
      expect(result.mediaType).toBe('audio')
    })

    it('rejects audio exceeding 25MB threshold', () => {
      const overLimit = PREVIEW_THRESHOLDS.AUDIO_MAX_BYTES + 1
      const result = evaluatePreviewEligibility('multitrack.wav', 'audio/wav', overLimit)
      expect(result.eligible).toBe(false)
      expect(result.mediaType).toBe('audio')
      expect(result.reason).toBe('size_exceeded')
      expect(result.message).toContain('25MB')
    })
  })

  describe('Unsupported Binary / RAW / Archive Formats', () => {
    it('identifies ZIP archives as unsupported', () => {
      const result = evaluatePreviewEligibility('assets.zip', 'application/zip', 1024)
      expect(result.eligible).toBe(false)
      expect(result.mediaType).toBe('unsupported')
      expect(result.reason).toBe('unsupported')
    })

    it('identifies RAW camera files (.dng, .cr2, .arw) as unsupported', () => {
      const result = evaluatePreviewEligibility('IMG_0001.dng', 'image/x-adobe-dng', 2048)
      expect(result.eligible).toBe(false)
      expect(result.mediaType).toBe('unsupported')
      expect(result.reason).toBe('unsupported')
    })

    it('identifies design project files (.psd, .ai) as unsupported', () => {
      const result = evaluatePreviewEligibility('poster.psd', 'application/octet-stream', 4096)
      expect(result.eligible).toBe(false)
      expect(result.mediaType).toBe('unsupported')
      expect(result.reason).toBe('unsupported')
    })
  })
})

