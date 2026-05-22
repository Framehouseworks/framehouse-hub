/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * Generates lightweight JPEG test fixtures for the seed pipeline.
 * Run: npx tsx src/seed/fixtures/generate.ts
 *
 * Creates 6 images (~20-40KB each) with varied dimensions and embedded EXIF
 * so the Go worker gets a real end-to-end test (EXIF parsing, WebP generation).
 *
 * One-shot dev utility; not part of the build path. Bypasses TS checks to
 * keep loose sharp metadata typings out of the way.
 */
// @ts-nocheck
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface FixtureSpec {
  name: string
  width: number
  height: number
  color: { r: number; g: number; b: number }
  exif: {
    Make?: string
    Model?: string
    ISO?: number
    DateTimeOriginal?: string
  }
}

const fixtures: FixtureSpec[] = [
  {
    name: 'alpine-summit-01.jpg',
    width: 1600,
    height: 1200,
    color: { r: 45, g: 85, b: 120 },
    exif: { Make: 'FUJIFILM', Model: 'X-T5', ISO: 200, DateTimeOriginal: '2026-03-15T08:30:00' },
  },
  {
    name: 'urban-neon-02.jpg',
    width: 1200,
    height: 1800,
    color: { r: 180, g: 40, b: 90 },
    exif: { Make: 'Sony', Model: 'A7IV', ISO: 3200, DateTimeOriginal: '2026-04-22T22:15:00' },
  },
  {
    name: 'coastal-dawn-03.jpg',
    width: 2000,
    height: 1000,
    color: { r: 220, g: 170, b: 100 },
    exif: { Make: 'Canon', Model: 'EOS R5', ISO: 100, DateTimeOriginal: '2026-01-08T06:45:00' },
  },
  {
    name: 'studio-portrait-04.jpg',
    width: 1400,
    height: 1400,
    color: { r: 60, g: 60, b: 65 },
    exif: { Make: 'Nikon', Model: 'Z8', ISO: 400, DateTimeOriginal: '2026-05-10T14:00:00' },
  },
  {
    name: 'forest-canopy-05.jpg',
    width: 1800,
    height: 1200,
    color: { r: 30, g: 100, b: 50 },
    exif: { Make: 'FUJIFILM', Model: 'GFX100S', ISO: 640, DateTimeOriginal: '2025-09-20T11:20:00' },
  },
  {
    name: 'desert-horizon-06.jpg',
    width: 2400,
    height: 1350,
    color: { r: 210, g: 160, b: 80 },
    exif: { Make: 'Leica', Model: 'Q3', ISO: 100, DateTimeOriginal: '2026-02-28T17:30:00' },
  },
  {
    name: 'mountain-mist-07.jpg',
    width: 1920,
    height: 1280,
    color: { r: 140, g: 160, b: 180 },
    exif: { Make: 'FUJIFILM', Model: 'X-T5', ISO: 400, DateTimeOriginal: '2026-03-20T07:10:00' },
  },
  {
    name: 'night-market-08.jpg',
    width: 1080,
    height: 1620,
    color: { r: 200, g: 120, b: 40 },
    exif: { Make: 'Sony', Model: 'A7IV', ISO: 6400, DateTimeOriginal: '2026-04-10T21:45:00' },
  },
  {
    name: 'tide-pools-09.jpg',
    width: 2200,
    height: 1100,
    color: { r: 40, g: 130, b: 140 },
    exif: { Make: 'Canon', Model: 'EOS R5', ISO: 200, DateTimeOriginal: '2026-02-14T09:20:00' },
  },
  {
    name: 'rooftop-light-10.jpg',
    width: 1500,
    height: 2000,
    color: { r: 230, g: 190, b: 80 },
    exif: { Make: 'Nikon', Model: 'Z8', ISO: 800, DateTimeOriginal: '2026-05-05T18:30:00' },
  },
  {
    name: 'dune-shadows-11.jpg',
    width: 2560,
    height: 1440,
    color: { r: 195, g: 150, b: 70 },
    exif: { Make: 'Leica', Model: 'Q3', ISO: 100, DateTimeOriginal: '2026-03-01T16:00:00' },
  },
  {
    name: 'moss-grove-12.jpg',
    width: 1600,
    height: 1067,
    color: { r: 20, g: 80, b: 40 },
    exif: {
      Make: 'FUJIFILM',
      Model: 'GFX100S',
      ISO: 1000,
      DateTimeOriginal: '2025-10-12T13:45:00',
    },
  },
]

function buildExifBuffer(spec: FixtureSpec['exif']): Buffer {
  const entries: Buffer[] = []
  let ifdCount = 0

  const addAscii = (tag: number, value: string) => {
    const strBuf = Buffer.from(value + '\0', 'ascii')
    const entry = Buffer.alloc(12)
    entry.writeUInt16BE(tag, 0)
    entry.writeUInt16BE(2, 2) // ASCII type
    entry.writeUInt32BE(strBuf.length, 4)
    if (strBuf.length <= 4) {
      strBuf.copy(entry, 8)
    } else {
      entry.writeUInt32BE(0, 8) // offset placeholder — filled later
    }
    entries.push(entry)
    ifdCount++
    return strBuf.length > 4 ? strBuf : null
  }

  const addShort = (tag: number, value: number) => {
    const entry = Buffer.alloc(12)
    entry.writeUInt16BE(tag, 0)
    entry.writeUInt16BE(3, 2) // SHORT type
    entry.writeUInt32BE(1, 4)
    entry.writeUInt16BE(value, 8)
    entries.push(entry)
    ifdCount++
    return null
  }

  const overflows: Array<{ entryIdx: number; data: Buffer }> = []

  if (spec.Make) {
    const overflow = addAscii(0x010f, spec.Make)
    if (overflow) overflows.push({ entryIdx: entries.length - 1, data: overflow })
  }
  if (spec.Model) {
    const overflow = addAscii(0x0110, spec.Model)
    if (overflow) overflows.push({ entryIdx: entries.length - 1, data: overflow })
  }
  if (spec.ISO) {
    addShort(0x8827, spec.ISO)
  }
  if (spec.DateTimeOriginal) {
    const formatted = spec.DateTimeOriginal.replace('T', ' ').replace(/-/g, ':').slice(0, 19)
    const overflow = addAscii(0x9003, formatted)
    if (overflow) overflows.push({ entryIdx: entries.length - 1, data: overflow })
  }

  // Build IFD0
  const ifdHeader = Buffer.alloc(2)
  ifdHeader.writeUInt16BE(ifdCount, 0)
  const ifdTerminator = Buffer.alloc(4, 0)

  const ifdBody = Buffer.concat(entries)
  const ifdBlock = Buffer.concat([ifdHeader, ifdBody, ifdTerminator])

  // Tiff header: "II" (little-endian marker for compat, but we write BE — use "MM" for Motorola)
  const tiffHeader = Buffer.from('4d4d002a00000008', 'hex') // MM, 42, offset to IFD0 = 8

  // Calculate overflow offsets
  let overflowStart = 8 + ifdBlock.length
  for (const ov of overflows) {
    entries[ov.entryIdx].writeUInt32BE(overflowStart, 8)
    overflowStart += ov.data.length
  }

  // Rebuild ifd body with corrected offsets
  const correctedIfdBody = Buffer.concat(entries)
  const correctedIfd = Buffer.concat([ifdHeader, correctedIfdBody, ifdTerminator])

  const overflowData = Buffer.concat(overflows.map((o) => o.data))
  const tiffData = Buffer.concat([tiffHeader, correctedIfd, overflowData])

  // Wrap in APP1 EXIF segment
  const exifHeader = Buffer.from('457869660000', 'hex') // "Exif\0\0"
  const app1Payload = Buffer.concat([exifHeader, tiffData])
  const app1Marker = Buffer.alloc(4)
  app1Marker.writeUInt16BE(0xffe1, 0)
  app1Marker.writeUInt16BE(app1Payload.length + 2, 2)

  return Buffer.concat([app1Marker, app1Payload])
}

async function generate() {
  console.log(`Generating ${fixtures.length} test fixtures in ${__dirname}/...`)

  for (const spec of fixtures) {
    const img = sharp({
      create: {
        width: spec.width,
        height: spec.height,
        channels: 3,
        background: spec.color,
      },
    })

    // Add subtle noise/gradient by compositing a semi-transparent overlay
    const overlay = await sharp(
      Buffer.from(
        `<svg width="${spec.width}" height="${spec.height}">
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:rgba(255,255,255,0.15)"/>
              <stop offset="100%" style="stop-color:rgba(0,0,0,0.2)"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
          <text x="50%" y="50%" font-family="monospace" font-size="24" fill="rgba(255,255,255,0.3)" text-anchor="middle" dy=".35em">${spec.name.replace('.jpg', '').toUpperCase()}</text>
        </svg>`,
      ),
    )
      .png()
      .toBuffer()

    const exifBuf = buildExifBuffer(spec.exif)

    const jpegBuffer = await img
      .composite([{ input: overlay, blend: 'over' }])
      .jpeg({ quality: 75 })
      .toBuffer()

    // Inject EXIF: insert APP1 after SOI marker (first 2 bytes FF D8)
    const soi = jpegBuffer.subarray(0, 2)
    const rest = jpegBuffer.subarray(2)
    const withExif = Buffer.concat([soi, exifBuf, rest])

    const outPath = path.join(__dirname, spec.name)
    fs.writeFileSync(outPath, withExif)

    console.log(
      `  ✓ ${spec.name} (${spec.width}×${spec.height}, ~${Math.round(withExif.length / 1024)}KB, ${spec.exif.Model})`,
    )
  }

  console.log('Done.')
}

generate().catch(console.error)
