import type { Media, Portfolio, Session } from '@/payload-types'
import type { PaginatedDocs, Payload } from 'payload'
import { aboutPageData, companyPageData, hubPageData, learnPageData } from './content/hubPages'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import {
  buildStoragePath,
  classifyDomainCategory,
  mediaTypeFromMimeAndExtension,
} from '@/lib/storage-paths'

const MEDIA_ROOT = path.resolve(process.cwd(), 'public/media')

const FIXTURE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  'alpine-summit-01.jpg': { width: 1600, height: 1200 },
  'urban-neon-02.jpg': { width: 1200, height: 1800 },
  'coastal-dawn-03.jpg': { width: 2000, height: 1000 },
  'studio-portrait-04.jpg': { width: 1400, height: 1400 },
  'forest-canopy-05.jpg': { width: 1800, height: 1200 },
  'desert-horizon-06.jpg': { width: 2400, height: 1350 },
  'mountain-mist-07.jpg': { width: 1920, height: 1280 },
  'night-market-08.jpg': { width: 1080, height: 1620 },
  'tide-pools-09.jpg': { width: 2200, height: 1100 },
  'rooftop-light-10.jpg': { width: 1500, height: 2000 },
  'dune-shadows-11.jpg': { width: 2560, height: 1440 },
  'moss-grove-12.jpg': { width: 1600, height: 1067 },
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const seedHubContent = async (payload: Payload): Promise<void> => {
  payload.logger.info('Seeding Company and Hub pages...')

  // Disable the triggerLocalWorker afterChange hook for the duration of the
  // seed. We install pre-built derivatives inline below, so the worker
  // dispatch (and its racy fire-and-forget doc update) would only stomp on
  // the ready state we set here.
  const prevAsyncFlag = process.env.LOCAL_ASYNC_PROCESSING
  process.env.LOCAL_ASYNC_PROCESSING = 'false'

  // Fail-fast if secrets are missing
  if (!process.env.PAYLOAD_SECRET) {
    throw new Error('PAYLOAD_SECRET is missing. Cannot proceed with seeding.')
  }

  try {
    // 0. Ensure the default system admin user is always created and available
    const defaultAdminEmail = 'sys.admin@framehouseworks.com'
    const existingAdmins = await payload.find({
      collection: 'users',
      where: {
        email: { equals: defaultAdminEmail },
      },
      limit: 1,
    })

    let ownerId = existingAdmins.docs[0]?.id

    if (!ownerId) {
      payload.logger.info(`Seeding default system admin (${defaultAdminEmail})...`)
      const newUser = await payload.create({
        collection: 'users',
        data: {
          email: defaultAdminEmail,
          password: 'password123',
          name: 'System Admin',
          roles: ['admin'],
        },
        context: { disableRevalidate: true },
      })
      ownerId = newUser.id
    } else {
      payload.logger.info(`Aligning default system admin credentials (${defaultAdminEmail})...`)
      await payload.update({
        collection: 'users',
        id: ownerId,
        data: {
          password: 'password123',
          roles: ['admin'],
        },
        context: { disableRevalidate: true },
      })
    }

    // 0b. Seed a creative user for dashboard testing
    const creativeEmail = 'creative@framehouseworks.com'
    const existingCreative = await payload.find({
      collection: 'users',
      where: { email: { equals: creativeEmail } },
      limit: 1,
    })

    if (!existingCreative.docs[0]) {
      payload.logger.info(`Seeding creative user (${creativeEmail})...`)
      await payload.create({
        collection: 'users',
        data: {
          email: creativeEmail,
          password: 'password123',
          name: 'Creative User',
          roles: ['creative'],
        },
        context: { disableRevalidate: true },
      })
    } else {
      await payload.update({
        collection: 'users',
        id: existingCreative.docs[0].id,
        data: { password: 'password123', roles: ['creative'] },
        context: { disableRevalidate: true },
      })
    }

    // 0c. Seed a viewer user for read-only testing
    const viewerEmail = 'viewer@framehouseworks.com'
    const existingViewer = await payload.find({
      collection: 'users',
      where: { email: { equals: viewerEmail } },
      limit: 1,
    })

    if (!existingViewer.docs[0]) {
      payload.logger.info(`Seeding viewer user (${viewerEmail})...`)
      await payload.create({
        collection: 'users',
        data: {
          email: viewerEmail,
          password: 'password123',
          name: 'Viewer User',
          roles: ['viewer'],
        },
        context: { disableRevalidate: true },
      })
    } else {
      await payload.update({
        collection: 'users',
        id: existingViewer.docs[0].id,
        data: { password: 'password123', roles: ['viewer'] },
        context: { disableRevalidate: true },
      })
    }

    // 0d. Seed additional creative users
    const additionalCreatives = [
      { email: 'alex.chen@framehouseworks.com', name: 'Alex Chen' },
      { email: 'maya.patel@framehouseworks.com', name: 'Maya Patel' },
      { email: 'leo.strand@framehouseworks.com', name: 'Leo Strand' },
    ]
    const creativeUserIds: Record<string, string | number> = {}
    for (const { email, name } of additionalCreatives) {
      const existing = await payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1,
      })
      if (!existing.docs[0]) {
        payload.logger.info(`Seeding creative user (${email})...`)
        const u = await payload.create({
          collection: 'users',
          data: { email, password: 'password123', name, roles: ['creative'] },
          context: { disableRevalidate: true },
        })
        creativeUserIds[email] = u.id
      } else {
        await payload.update({
          collection: 'users',
          id: existing.docs[0].id,
          data: { password: 'password123', roles: ['creative'] },
          context: { disableRevalidate: true },
        })
        creativeUserIds[email] = existing.docs[0].id
      }
    }

    // 1. Seed test media fixtures distributed across creative users
    let mediaDocs = await payload.find({
      collection: 'media',
      limit: 20,
    })

    const creativeUser = await payload.find({
      collection: 'users',
      where: { email: { equals: creativeEmail } },
      limit: 1,
    })
    const creativeOwnerId = creativeUser.docs[0]?.id || ownerId

    // Reconcile DB + disk: if any "Seed Portfolio" docs reference enclave
    // files that no longer exist (e.g., operator wiped public/media), nuke
    // those rows so the fixture loop below can rewrite them. Leaves
    // user-uploaded media untouched.
    const seedOrphans = await payload.find({
      collection: 'media',
      where: { shootName: { like: 'Seed' } },
      limit: 100,
    })
    const orphanIds: (number | string)[] = []
    for (const doc of seedOrphans.docs) {
      const storagePath = (doc as { storagePath?: string }).storagePath
      if (!storagePath) {
        orphanIds.push(doc.id)
        continue
      }
      const onDisk = path.join(process.cwd(), 'public', 'media', storagePath)
      if (!fs.existsSync(onDisk)) orphanIds.push(doc.id)
    }
    if (orphanIds.length > 0) {
      payload.logger.info(
        `Dropping ${orphanIds.length} seed-fixture row(s) with missing enclave files; will re-seed`,
      )
      await payload.delete({
        collection: 'media',
        where: { id: { in: orphanIds } },
      })
      mediaDocs = await payload.find({ collection: 'media', limit: 100 })
    }

    const fixturesDir = path.join(__dirname, 'fixtures')
    const fixtureFiles = fs.existsSync(fixturesDir)
      ? fs.readdirSync(fixturesDir).filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
      : []

    // Determine which fixture filenames are already represented by a doc with
    // its file on disk. Query by the exact fixture filenames to avoid pagination
    // limits on large media tables missing the original fixture docs.
    const presentFixtureFilenames = new Set<string>()
    if (fixtureFiles.length > 0) {
      const fixtureQuery = await payload.find({
        collection: 'media',
        where: { filename: { in: fixtureFiles } },
        limit: fixtureFiles.length * 10,
        overrideAccess: true,
      })
      for (const doc of fixtureQuery.docs) {
        const sp = (doc as { storagePath?: string }).storagePath
        const docFilename = (doc as { filename?: string }).filename
        if (!sp || !docFilename) continue
        if (!fs.existsSync(path.join(MEDIA_ROOT, sp))) continue
        presentFixtureFilenames.add(docFilename)
      }
    }

    const missingFixtures = fixtureFiles.filter((f) => !presentFixtureFilenames.has(f))

    const allCreativeIds: Record<string, string | number> = {
      [creativeEmail]: creativeOwnerId,
      ...creativeUserIds,
    }

    const FIXTURE_OWNERSHIP: Record<string, { ownerEmail: string; shootName: string }> = {
      'alpine-summit-01.jpg': { ownerEmail: creativeEmail, shootName: 'Seed: Main Portfolio' },
      'urban-neon-02.jpg': { ownerEmail: creativeEmail, shootName: 'Seed: Main Portfolio' },
      'mountain-mist-07.jpg': { ownerEmail: creativeEmail, shootName: 'Seed: Main Portfolio' },
      'coastal-dawn-03.jpg': {
        ownerEmail: 'alex.chen@framehouseworks.com',
        shootName: 'Seed: Street & Shore',
      },
      'night-market-08.jpg': {
        ownerEmail: 'alex.chen@framehouseworks.com',
        shootName: 'Seed: Street & Shore',
      },
      'studio-portrait-04.jpg': {
        ownerEmail: 'maya.patel@framehouseworks.com',
        shootName: 'Seed: Studio & Nature',
      },
      'rooftop-light-10.jpg': {
        ownerEmail: 'maya.patel@framehouseworks.com',
        shootName: 'Seed: Studio & Nature',
      },
      'tide-pools-09.jpg': {
        ownerEmail: 'maya.patel@framehouseworks.com',
        shootName: 'Seed: Studio & Nature',
      },
      'forest-canopy-05.jpg': {
        ownerEmail: 'leo.strand@framehouseworks.com',
        shootName: 'Seed: Landscape',
      },
      'desert-horizon-06.jpg': {
        ownerEmail: 'leo.strand@framehouseworks.com',
        shootName: 'Seed: Landscape',
      },
      'dune-shadows-11.jpg': {
        ownerEmail: 'leo.strand@framehouseworks.com',
        shootName: 'Seed: Landscape',
      },
      'moss-grove-12.jpg': {
        ownerEmail: 'leo.strand@framehouseworks.com',
        shootName: 'Seed: Landscape',
      },
    }

    if (missingFixtures.length > 0) {
      payload.logger.info(
        `Seeding ${missingFixtures.length} missing fixture(s): ${missingFixtures.join(', ')}`,
      )

      // One UploadBatch per creative user so each user's fixtures share a batch
      const seedBatches: Record<string, { id: string | number }> = {}
      for (const [email, id] of Object.entries(allCreativeIds)) {
        seedBatches[email] = await payload.create({
          collection: 'upload-batches',
          data: { owner: id as number, source: 'seed', notes: 'Fixture seed' },
        })
      }

      if (fixtureFiles.length > 0) {
        for (const filename of missingFixtures) {
          try {
            const ownership = FIXTURE_OWNERSHIP[filename] ?? {
              ownerEmail: creativeEmail,
              shootName: 'Seed: Main Portfolio',
            }
            const fixtureOwnerId = allCreativeIds[ownership.ownerEmail] ?? creativeOwnerId
            const fixtureBatch = seedBatches[ownership.ownerEmail] ?? seedBatches[creativeEmail]

            const filePath = path.join(fixturesDir, filename)
            const data = fs.readFileSync(filePath)
            const mimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg'
            const title = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
            const mediaType = mediaTypeFromMimeAndExtension(mimeType, filename)

            const gcsBucket = process.env.GCS_BUCKET

            if (gcsBucket) {
              // Cloud mode: generate storagePath, upload to GCS, create doc directly.
              // writeOriginalToEnclave no-ops in cloud so we own the path generation here.
              // Eventarc will fire from the GCS upload and the worker will generate thumbnails.
              const now = new Date()
              const year = now.getFullYear().toString()
              const month = (now.getMonth() + 1).toString().padStart(2, '0')
              const assetId = crypto.randomUUID()
              const domainCategory = classifyDomainCategory(mimeType, filename)
              const storagePath = buildStoragePath({
                userId: String(fixtureOwnerId),
                domainCategory,
                year,
                month,
                assetId,
                filename,
              })

              const { Storage } = await import('@google-cloud/storage')
              const gcs = new Storage({ projectId: process.env.GCS_PROJECT_ID })
              await gcs.bucket(gcsBucket).file(storagePath).save(data, { contentType: mimeType })

              const dims = FIXTURE_DIMENSIONS[filename]
              const newMedia = await payload.create({
                collection: 'media',
                data: {
                  title,
                  alt: title,
                  mediaType,
                  owner: fixtureOwnerId as number,
                  ingestionStatus: 'ready',
                  processingStep: 'ready',
                  processedAt: new Date().toISOString(),
                  shootName: ownership.shootName,
                  uploadBatchId: fixtureBatch.id as number,
                  storagePath,
                  originalUrl: `https://storage.googleapis.com/${gcsBucket}/${storagePath}`,
                  filename,
                  originalFilename: filename,
                  mimeType,
                  filesize: data.length,
                  ...(dims
                    ? {
                        width: dims.width,
                        height: dims.height,
                        aspectRatio: (dims.width / dims.height).toFixed(2),
                      }
                    : {}),
                },
                context: { disableRevalidate: true },
              })

              payload.logger.info(`  Seeded (cloud): ${filename} → id=${newMedia.id}`)
            } else {
              // Local mode: writeOriginalToEnclave lays the original on disk and stamps
              // storagePath. Install pre-built derivatives and mark ready immediately so
              // the blank-slate seed doesn't require the Go worker to be running.
              const newMedia = await payload.create({
                collection: 'media',
                data: {
                  title,
                  alt: title,
                  mediaType,
                  owner: fixtureOwnerId as number,
                  ingestionStatus: 'active',
                  shootName: ownership.shootName,
                  uploadBatchId: fixtureBatch.id as number,
                },
                file: {
                  data,
                  name: filename,
                  mimetype: mimeType,
                  size: data.length,
                },
                context: { disableRevalidate: true },
              })

              try {
                const storagePath = (newMedia as { storagePath?: string }).storagePath
                if (!storagePath) {
                  throw new Error('storagePath not populated by enclave write hook')
                }

                const enclaveOriginal = path.join(MEDIA_ROOT, storagePath)
                const derivativeBase = path.join(
                  path.dirname(path.dirname(enclaveOriginal)),
                  'derivatives',
                )
                const derivativesSrc = path.join(
                  fixturesDir,
                  'derivatives',
                  filename.replace(/\.[^.]+$/, ''),
                )
                fs.mkdirSync(derivativeBase, { recursive: true })

                const derivativeUrlBase = storagePath
                  .split('/')
                  .slice(0, -2)
                  .join('/')
                  .concat('/derivatives')

                let thumbnailUrl: string | undefined
                let proxyUrl: string | undefined
                for (const size of ['small', 'medium'] as const) {
                  const src = path.join(derivativesSrc, `${size}.webp`)
                  if (!fs.existsSync(src)) continue
                  fs.copyFileSync(src, path.join(derivativeBase, `${size}.webp`))
                  const url = `/media/${derivativeUrlBase}/${size}.webp`
                  if (size === 'small') thumbnailUrl = url
                  if (size === 'medium') proxyUrl = url
                }

                const dims = FIXTURE_DIMENSIONS[filename]
                await payload.update({
                  collection: 'media',
                  id: newMedia.id,
                  data: {
                    thumbnailUrl,
                    proxyUrl,
                    ingestionStatus: 'ready',
                    processingStep: 'ready',
                    processedAt: new Date().toISOString(),
                    ...(dims
                      ? {
                          width: dims.width,
                          height: dims.height,
                          aspectRatio: (dims.width / dims.height).toFixed(2),
                        }
                      : {}),
                  },
                  context: { disableRevalidate: true },
                })
              } catch (derivErr) {
                payload.logger.warn(
                  `  Derivative wiring failed for ${filename}: ${derivErr instanceof Error ? derivErr.message : String(derivErr)}`,
                )
              }

              payload.logger.info(`  Seeded: ${filename} → id=${newMedia.id}`)
            }
          } catch (fixtureErr) {
            payload.logger.error(
              `  Failed to seed ${filename}: ${fixtureErr instanceof Error ? fixtureErr.message : String(fixtureErr)}`,
            )
          }
        }
      } else {
        payload.logger.info('No fixtures found, creating inline placeholder...')
        const newMedia = await payload.create({
          collection: 'media',
          data: {
            title: 'Placeholder',
            alt: 'Placeholder',
            mediaType: 'image',
            owner: ownerId,
            ingestionStatus: 'ready',
          },
          file: {
            data: Buffer.from(
              'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
              'base64',
            ),
            name: 'placeholder.png',
            mimetype: 'image/png',
            size: 100,
          },
          context: { disableRevalidate: true },
        })
        mediaDocs = { docs: [newMedia] } as unknown as PaginatedDocs<Media>
      }

      // Re-fetch after seeding
      mediaDocs = await payload.find({ collection: 'media', limit: 100 })
    }

    // Build filename → doc map for the new seeding sections
    const mediaByFilename = new Map<string, Media>()
    for (const doc of mediaDocs.docs) {
      const fn = doc.filename
      if (fn) mediaByFilename.set(fn, doc)
    }

    // 1a. Sessions — one per creative user, idempotent
    try {
      payload.logger.info('Seeding Sessions...')
      const sessionDefs: Array<{
        ownerEmail: string
        name: string
        shootDate: string
        coverFilename: string
      }> = [
        {
          ownerEmail: creativeEmail,
          name: 'Seed: Main Portfolio',
          shootDate: '2025-08-15',
          coverFilename: 'alpine-summit-01.jpg',
        },
        {
          ownerEmail: 'alex.chen@framehouseworks.com',
          name: 'Seed: Street & Shore',
          shootDate: '2025-09-10',
          coverFilename: 'coastal-dawn-03.jpg',
        },
        {
          ownerEmail: 'maya.patel@framehouseworks.com',
          name: 'Seed: Studio & Nature',
          shootDate: '2025-10-05',
          coverFilename: 'studio-portrait-04.jpg',
        },
        {
          ownerEmail: 'leo.strand@framehouseworks.com',
          name: 'Seed: Landscape',
          shootDate: '2025-07-22',
          coverFilename: 'forest-canopy-05.jpg',
        },
      ]

      for (const def of sessionDefs) {
        const ownerId = allCreativeIds[def.ownerEmail]
        if (!ownerId) continue
        const existing = await payload.find({
          collection: 'sessions',
          where: { and: [{ owner: { equals: ownerId } }, { name: { equals: def.name } }] },
          limit: 1,
        })
        if (existing.docs.length > 0) {
          payload.logger.info(`  Session "${def.name}" already exists, skipping.`)
          continue
        }
        const coverDoc = mediaByFilename.get(def.coverFilename)
        await payload.create({
          collection: 'sessions',
          data: {
            name: def.name,
            shootDate: def.shootDate,
            owner: Number(ownerId),
            ...(coverDoc ? { coverAsset: coverDoc.id } : {}),
          },
          context: { disableRevalidate: true },
        })
        payload.logger.info(`  Created session "${def.name}"`)
      }
    } catch (err) {
      payload.logger.error(
        `Error seeding Sessions: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    // 1b. Media → Session links
    try {
      payload.logger.info('Linking media docs to sessions...')
      // Re-fetch sessions to get their IDs
      const sessionDocs = await payload.find({ collection: 'sessions', limit: 50 })
      const sessionByName = new Map<string, Session>()
      for (const s of sessionDocs.docs) {
        sessionByName.set(s.name, s)
      }

      for (const doc of mediaDocs.docs) {
        const shootName = doc.shootName
        if (!shootName) continue
        const session = sessionByName.get(shootName)
        if (!session) continue
        const currentSession = typeof doc.session === 'object' ? doc.session?.id : doc.session
        if (currentSession === session.id) continue
        await payload.update({
          collection: 'media',
          id: doc.id,
          data: { session: session.id },
          context: { disableRevalidate: true },
        })
      }
      payload.logger.info('  Media session links updated.')
    } catch (err) {
      payload.logger.error(
        `Error linking media to sessions: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    // 1c. SmartCollections — 2-3 per user, scoped by owner
    try {
      payload.logger.info('Seeding SmartCollections...')

      type SmartCollectionDef = {
        name: string
        filterQuery: Record<string, unknown>
        icon: 'folder' | 'map' | 'tag' | 'sparkles' | 'camera' | null
        isSystemGenerated: boolean
        generatedFrom: 'location' | 'camera' | 'manual' | 'ai_tags' | 'metadata' | 'tags' | 'media_type' | 'date' | null
        sortOrder: number
      }

      const smartCollectionsByOwner: Array<{
        ownerEmail: string
        collections: SmartCollectionDef[]
      }> = [
        {
          ownerEmail: creativeEmail,
          collections: [
            {
              name: 'All Images',
              filterQuery: { mediaType: { equals: 'image' } },
              icon: 'camera',
              isSystemGenerated: true,
              generatedFrom: 'media_type',
              sortOrder: 0,
            },
            {
              name: 'Main Portfolio Shoot',
              filterQuery: { shootName: { equals: 'Seed: Main Portfolio' } },
              icon: 'folder',
              isSystemGenerated: true,
              generatedFrom: 'metadata',
              sortOrder: 1,
            },
            {
              name: 'Ready to Publish',
              filterQuery: { ingestionStatus: { equals: 'ready' } },
              icon: 'sparkles',
              isSystemGenerated: false,
              generatedFrom: 'manual',
              sortOrder: 2,
            },
          ],
        },
        {
          ownerEmail: 'alex.chen@framehouseworks.com',
          collections: [
            {
              name: 'All Images',
              filterQuery: { mediaType: { equals: 'image' } },
              icon: 'camera',
              isSystemGenerated: true,
              generatedFrom: 'media_type',
              sortOrder: 0,
            },
            {
              name: 'Street & Shore Shoot',
              filterQuery: { shootName: { equals: 'Seed: Street & Shore' } },
              icon: 'folder',
              isSystemGenerated: true,
              generatedFrom: 'metadata',
              sortOrder: 1,
            },
          ],
        },
        {
          ownerEmail: 'maya.patel@framehouseworks.com',
          collections: [
            {
              name: 'All Images',
              filterQuery: { mediaType: { equals: 'image' } },
              icon: 'camera',
              isSystemGenerated: true,
              generatedFrom: 'media_type',
              sortOrder: 0,
            },
            {
              name: 'Studio & Nature Shoot',
              filterQuery: { shootName: { equals: 'Seed: Studio & Nature' } },
              icon: 'folder',
              isSystemGenerated: true,
              generatedFrom: 'metadata',
              sortOrder: 1,
            },
          ],
        },
        {
          ownerEmail: 'leo.strand@framehouseworks.com',
          collections: [
            {
              name: 'All Images',
              filterQuery: { mediaType: { equals: 'image' } },
              icon: 'camera',
              isSystemGenerated: true,
              generatedFrom: 'media_type',
              sortOrder: 0,
            },
            {
              name: 'Landscape Shoot',
              filterQuery: { shootName: { equals: 'Seed: Landscape' } },
              icon: 'folder',
              isSystemGenerated: true,
              generatedFrom: 'metadata',
              sortOrder: 1,
            },
          ],
        },
      ]

      for (const { ownerEmail, collections } of smartCollectionsByOwner) {
        const ownerId = allCreativeIds[ownerEmail]
        if (!ownerId) continue
        for (const col of collections) {
          const existing = await payload.find({
            collection: 'smart-collections',
            where: { and: [{ owner: { equals: ownerId } }, { name: { equals: col.name } }] },
            limit: 1,
          })
          if (existing.docs.length > 0) {
            payload.logger.info(`  SmartCollection "${col.name}" for ${ownerEmail} exists, skipping.`)
            continue
          }
          await payload.create({
            collection: 'smart-collections',
            data: {
              name: col.name,
              owner: Number(ownerId),
              filterQuery: col.filterQuery,
              icon: col.icon,
              isSystemGenerated: col.isSystemGenerated,
              generatedFrom: col.generatedFrom,
              sortOrder: col.sortOrder,
            },
            context: { disableRevalidate: true },
          })
          payload.logger.info(`  Created SmartCollection "${col.name}" for ${ownerEmail}`)
        }
      }
    } catch (err) {
      payload.logger.error(
        `Error seeding SmartCollections: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    // 1d. Portfolios — 1 per creative user
    try {
      payload.logger.info('Seeding Portfolios...')

      const portfolioDefs: Array<{
        ownerEmail: string
        name: string
        fixtureFilenames: string[]
      }> = [
        {
          ownerEmail: creativeEmail,
          name: 'Main Portfolio',
          fixtureFilenames: ['alpine-summit-01.jpg', 'urban-neon-02.jpg', 'mountain-mist-07.jpg'],
        },
        {
          ownerEmail: 'alex.chen@framehouseworks.com',
          name: 'Street Photography',
          fixtureFilenames: ['coastal-dawn-03.jpg', 'night-market-08.jpg'],
        },
        {
          ownerEmail: 'maya.patel@framehouseworks.com',
          name: 'Studio Work',
          fixtureFilenames: ['studio-portrait-04.jpg', 'rooftop-light-10.jpg', 'tide-pools-09.jpg'],
        },
        {
          ownerEmail: 'leo.strand@framehouseworks.com',
          name: 'Landscape Series',
          fixtureFilenames: [
            'forest-canopy-05.jpg',
            'desert-horizon-06.jpg',
            'dune-shadows-11.jpg',
            'moss-grove-12.jpg',
          ],
        },
      ]

      for (const def of portfolioDefs) {
        const ownerId = allCreativeIds[def.ownerEmail]
        if (!ownerId) continue
        const existing = await payload.find({
          collection: 'portfolios',
          where: { and: [{ owner: { equals: ownerId } }, { name: { equals: def.name } }] },
          limit: 1,
        })
        if (existing.docs.length > 0) {
          payload.logger.info(`  Portfolio "${def.name}" already exists, skipping.`)
          continue
        }
        const items = def.fixtureFilenames
          .map((fn) => mediaByFilename.get(fn))
          .filter((doc): doc is Media => Boolean(doc))
          .map((doc) => ({ media: doc.id, size: 'medium' as const }))

        const seedTitle = {
          root: {
            children: [
              {
                children: [
                  { detail: 0, format: 0, mode: 'normal', style: '', text: def.name, type: 'text', version: 1 },
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'root',
            version: 1,
          },
        }
        await payload.create({
          collection: 'portfolios',
          data: {
            name: def.name,
            title: seedTitle as Portfolio['title'],
            owner: Number(ownerId),
            visibility: 'private',
            layoutBlocks: (items.length > 0 ? [{ blockType: 'grid' as const, items }] : []) as Portfolio['layoutBlocks'],
          },
          context: { disableRevalidate: true },
        })
        payload.logger.info(`  Created portfolio "${def.name}" for ${def.ownerEmail}`)
      }

      // Seed one multi-section portfolio to exercise all three layout styles
      try {
        const multiOwnerId = allCreativeIds[creativeEmail]
        if (multiOwnerId) {
          const multiName = 'Section Layout Demo'
          const multiExisting = await payload.find({
            collection: 'portfolios',
            where: { and: [{ owner: { equals: multiOwnerId } }, { name: { equals: multiName } }] },
            limit: 1,
          })
          if (multiExisting.docs.length === 0) {
            // Grab any available images for the 3 sections
            const allSeededMedia = [...mediaByFilename.values()].filter((m) => m.owner === multiOwnerId)
            const section1Items = allSeededMedia.slice(0, 2).map((m) => ({ media: m.id, size: 'medium' as const }))
            const section2Items = allSeededMedia.slice(2, 5).map((m) => ({ media: m.id, size: 'medium' as const }))
            const section3Items = allSeededMedia.slice(0, 3).map((m) => ({ media: m.id, size: 'medium' as const }))

            const multiBlocks = [
              {
                blockType: 'grid' as const,
                sectionName: 'Filmstrip Demo',
                sectionAnchor: 'filmstrip-demo',
                showSectionHeader: true,
                layoutStyle: 'filmstrip',
                filmstripTrackHeight: 'comfortable',
                uniformGridColumns: '3',
                spacing: 'medium' as const,
                items: section1Items,
              },
              {
                blockType: 'grid' as const,
                sectionName: 'Masonry Demo',
                sectionAnchor: 'masonry-demo',
                showSectionHeader: true,
                layoutStyle: 'masonry',
                filmstripTrackHeight: 'comfortable',
                uniformGridColumns: '3',
                spacing: 'medium' as const,
                items: section2Items,
              },
              {
                blockType: 'grid' as const,
                sectionName: 'Uniform Grid Demo',
                sectionAnchor: 'uniform-grid-demo',
                showSectionHeader: true,
                layoutStyle: 'uniform_grid',
                filmstripTrackHeight: 'comfortable',
                uniformGridColumns: '3',
                spacing: 'medium' as const,
                items: section3Items,
              },
            ]
            await payload.create({
              collection: 'portfolios',
              data: {
                name: multiName,
                owner: Number(multiOwnerId),
                visibility: 'private',
                layoutBlocks: multiBlocks as Portfolio['layoutBlocks'],
              },
              context: { disableRevalidate: true },
            })
            payload.logger.info(`  Created multi-section portfolio "${multiName}"`)
          }
        }
      } catch (seedMultiErr) {
        payload.logger.warn(`Could not seed multi-section portfolio: ${seedMultiErr}`)
      }

      // Seed a public review-portal demo portfolio for E2E tests (FRH-62)
      try {
        const reviewDemoOwnerId = allCreativeIds[creativeEmail]
        if (reviewDemoOwnerId) {
          const reviewDemoName = 'Client Review Demo'
          const reviewDemoExisting = await payload.find({
            collection: 'portfolios',
            where: { and: [{ owner: { equals: reviewDemoOwnerId } }, { name: { equals: reviewDemoName } }] },
            limit: 1,
          })
          if (reviewDemoExisting.docs.length === 0) {
            const demoMedia = [...mediaByFilename.values()].filter((m) => m.owner === reviewDemoOwnerId).slice(0, 4)
            const demoItems = demoMedia.map((m) => ({ media: m.id, size: 'medium' as const }))
            if (demoItems.length > 0) {
              await payload.create({
                collection: 'portfolios',
                data: {
                  name: reviewDemoName,
                  owner: Number(reviewDemoOwnerId),
                  visibility: 'public',
                  layoutBlocks: [{ blockType: 'grid' as const, items: demoItems, spacing: 'medium' as const }] as Portfolio['layoutBlocks'],
                  clientReviewSettings: {
                    allowSelection: true,
                    allowComments: true,
                    allowDownload: false,
                    requireClientIdentification: false,
                    selectionLimit: 3,
                    downloadQuality: 'proxy',
                    reviewMessage: 'Please select your favourite images from this session.',
                  },
                },
                context: { disableRevalidate: true },
              })
              payload.logger.info(`  Created review demo portfolio "${reviewDemoName}"`)
            }
          }
        }
      } catch (seedReviewErr) {
        payload.logger.warn(`Could not seed review demo portfolio: ${seedReviewErr}`)
      }
    } catch (err) {
      payload.logger.error(
        `Error seeding Portfolios: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    const fallbackMediaIds = mediaDocs.docs.map((doc) => doc.id)

    // 1e. Tutorials — platform usage guides
    try {
      payload.logger.info('Seeding Tutorials...')

      const tutorialDefs = [
        {
          title: 'Getting Started: Upload Your First Asset',
          slug: 'getting-started-upload-first-asset',
          description:
            'Learn how to upload a photo or video to your library, understand the ingestion flow, and confirm your asset is ready.',
          category: 'getting-started',
          difficulty: 'beginner',
          duration: '4 min',
          order: 1,
          steps: [
            {
              stepTitle: 'Sign in and open your Library',
              stepContent: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'paragraph',
                      version: 1,
                      children: [
                        {
                          text: 'After logging in, navigate to the Library from the left-hand sidebar. This is your personal asset archive — everything you upload lives here, organised chronologically.',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1,
                },
              },
            },
            {
              stepTitle: 'Click "Start Archival Ingest"',
              stepContent: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'paragraph',
                      version: 1,
                      children: [
                        {
                          text: 'In the top-right of the Library, click the "Start Archival Ingest" button. A staging panel will open where you can drag and drop files or browse your device. Supported formats include JPEG, PNG, WebP, MP4, and MOV.',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1,
                },
              },
            },
            {
              stepTitle: 'Add files and begin the ingest',
              stepContent: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'paragraph',
                      version: 1,
                      children: [
                        {
                          text: 'Once your files are staged, click "Begin Ingest". Each asset is uploaded, processed, and given a unique accession ID. You will see real-time progress in the overlay — statuses move from "Uploading" → "Processing" → "Ready".',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1,
                },
              },
            },
            {
              stepTitle: 'Confirm your asset is ready',
              stepContent: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'paragraph',
                      version: 1,
                      children: [
                        {
                          text: 'When processing is complete, your asset appears in the Library grid with its thumbnail visible. Click any asset to open the detail view where you can see metadata, accession ID, and file details.',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1,
                },
              },
            },
          ],
        },
        {
          title: 'Organising with Sessions',
          slug: 'organising-with-sessions',
          description:
            'Sessions group assets from a single shoot. Learn how to create a session, assign assets, and navigate by shoot date.',
          category: 'organise',
          difficulty: 'beginner',
          duration: '3 min',
          order: 2,
          steps: [
            {
              stepTitle: 'What is a Session?',
              stepContent: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'paragraph',
                      version: 1,
                      children: [
                        {
                          text: 'A Session represents a single shoot or work session — a day on location, a studio portrait session, or any batch of related work. Assets ingested with a matching shoot name are automatically linked to their Session.',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1,
                },
              },
            },
            {
              stepTitle: 'Create a Session',
              stepContent: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'paragraph',
                      version: 1,
                      children: [
                        {
                          text: 'Navigate to Sessions in the sidebar. Click "New Session", give it a name (e.g. "Spring Campaign 2025"), and set the shoot date. You can optionally assign a cover asset after you have uploaded media.',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1,
                },
              },
            },
            {
              stepTitle: 'Browse and filter by Session',
              stepContent: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'paragraph',
                      version: 1,
                      children: [
                        {
                          text: 'In the Library, use the Session filter in the left panel to view only assets from a specific shoot. Your sessions are sorted by shoot date, making it easy to find any job regardless of when it was ingested.',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1,
                },
              },
            },
          ],
        },
        {
          title: 'Building Your First Portfolio',
          slug: 'building-your-first-portfolio',
          description:
            'Create a portfolio, add assets to a grid layout, and choose your visibility settings.',
          category: 'publish',
          difficulty: 'beginner',
          duration: '5 min',
          order: 3,
          steps: [
            {
              stepTitle: 'Create a new Portfolio',
              stepContent: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'paragraph',
                      version: 1,
                      children: [
                        {
                          text: 'From the sidebar, navigate to Portfolios and click "New Portfolio". Give it a name — this is your internal label, not visible to the public. A portfolio is a curated selection of your assets presented in a grid layout.',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1,
                },
              },
            },
            {
              stepTitle: 'Add assets to your grid',
              stepContent: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'paragraph',
                      version: 1,
                      children: [
                        {
                          text: 'Inside the portfolio editor, click "Add Grid Block". A grid block lets you select assets from your Library and set their display size (small, medium, or large). You can add multiple grid blocks to build a varied layout.',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1,
                },
              },
            },
            {
              stepTitle: 'Set visibility and publish',
              stepContent: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'paragraph',
                      version: 1,
                      children: [
                        {
                          text: 'Portfolios have three visibility options: Private (only you), Shared (link access), and Public (visible on your profile). Set your visibility in the sidebar, then save. Public portfolios are accessible at /p/[your-slug].',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1,
                },
              },
            },
          ],
        },
        {
          title: 'Smart Collections: Dynamic Asset Filters',
          slug: 'smart-collections-dynamic-asset-filters',
          description:
            'Smart Collections automatically populate based on rules you define — filter by media type, shoot name, status, or any metadata field.',
          category: 'organise',
          difficulty: 'intermediate',
          duration: '4 min',
          order: 4,
          steps: [
            {
              stepTitle: 'What makes a collection "Smart"?',
              stepContent: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'paragraph',
                      version: 1,
                      children: [
                        {
                          text: 'Unlike a manual folder, a Smart Collection runs a saved query against your Library every time you open it. Any asset matching the filter appears automatically — no manual sorting required. They update in real time as you add new assets.',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1,
                },
              },
            },
            {
              stepTitle: 'Create a Smart Collection',
              stepContent: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'paragraph',
                      version: 1,
                      children: [
                        {
                          text: 'Navigate to Smart Collections in the sidebar and click "New Collection". Give it a name and set your filter — for example, filter by mediaType = "video" to create an "All Videos" collection, or by ingestionStatus = "ready" for a "Ready to Publish" collection.',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1,
                },
              },
            },
            {
              stepTitle: 'System-generated collections',
              stepContent: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'paragraph',
                      version: 1,
                      children: [
                        {
                          text: 'When you upload your first assets, Framehouse Hub automatically creates a set of Smart Collections for you — including "All Images" and one for each detected shoot name. These system collections cannot be deleted, but you can create as many custom ones as you need.',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1,
                },
              },
            },
          ],
        },
        {
          title: 'Understanding Asset Metadata',
          slug: 'understanding-asset-metadata',
          description:
            'Learn what metadata is extracted automatically, how accession IDs work, and how to use metadata for search and filtering.',
          category: 'advanced',
          difficulty: 'intermediate',
          duration: '5 min',
          order: 5,
          steps: [
            {
              stepTitle: 'Automatic metadata extraction',
              stepContent: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'paragraph',
                      version: 1,
                      children: [
                        {
                          text: 'When an asset is ingested, Framehouse Hub automatically extracts EXIF and IPTC metadata — including camera model, lens, aperture, ISO, and GPS coordinates where available. This happens during the processing step and requires no manual input.',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1,
                },
              },
            },
            {
              stepTitle: 'Accession IDs',
              stepContent: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'paragraph',
                      version: 1,
                      children: [
                        {
                          text: 'Every asset receives a unique accession ID on ingestion — a permanent reference that never changes even if you rename the file. This is the canonical identifier for your asset across exports, portfolios, and integrations.',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1,
                },
              },
            },
            {
              stepTitle: 'Searching and filtering by metadata',
              stepContent: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'paragraph',
                      version: 1,
                      children: [
                        {
                          text: 'Use the Library search bar to find assets by title, filename, camera model, lens, or shoot name. The search index is full-text and very fast — try searching for a camera model like "Sony A7" or a shoot name like "Campaign 2025" to see all matching assets instantly.',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1,
                },
              },
            },
          ],
        },
      ]

      for (const def of tutorialDefs) {
        const existing = await payload.find({
          collection: 'tutorials',
          where: { slug: { equals: def.slug } },
          limit: 1,
        })
        if (existing.docs.length > 0) {
          payload.logger.info(`  Tutorial "${def.title}" exists, skipping.`)
          continue
        }
        await payload.create({
          collection: 'tutorials',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { ...def, _status: 'published' } as any,
          context: { disableRevalidate: true },
        })
        payload.logger.info(`  Created tutorial "${def.title}"`)
      }
    } catch (err) {
      payload.logger.error(
        `Error seeding Tutorials: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    // 1f. Articles — guides and platform insights
    try {
      payload.logger.info('Seeding Articles...')

      const articleDefs = [
        {
          title: 'The Philosophy Behind Framehouse Hub',
          slug: 'philosophy-behind-framehouse-hub',
          excerpt:
            'Why we built a DAM that feels like a gallery, not a filing cabinet — and why that distinction matters for creative work.',
          category: 'guide',
          readTime: 5,
          content: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'heading',
                  tag: 'h2',
                  version: 1,
                  children: [{ text: 'Software as a showcase', type: 'text', version: 1 }],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
                {
                  type: 'paragraph',
                  version: 1,
                  children: [
                    {
                      text: "Most digital asset management tools are built for IT departments. They prioritise compliance, auditability, and storage cost over the experience of the person actually using them. We built Framehouse Hub for the other person in the room — the creative.",
                      type: 'text',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
                {
                  type: 'heading',
                  tag: 'h2',
                  version: 1,
                  children: [{ text: 'The museum principle', type: 'text', version: 1 }],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
                {
                  type: 'paragraph',
                  version: 1,
                  children: [
                    {
                      text: 'A well-curated museum does not show you everything at once. It guides your attention, provides context, and frames each piece deliberately. That is the standard we hold our interface to. Your assets deserve to be presented, not just stored.',
                      type: 'text',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
                {
                  type: 'heading',
                  tag: 'h2',
                  version: 1,
                  children: [{ text: 'What this means practically', type: 'text', version: 1 }],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
                {
                  type: 'paragraph',
                  version: 1,
                  children: [
                    {
                      text: 'It means the library view uses white space deliberately. It means thumbnails are large enough to evaluate composition. It means metadata is present but never dominant. And it means that publishing a portfolio feels like opening a gallery — not sharing a Dropbox link.',
                      type: 'text',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
            },
          },
        },
        {
          title: '5 Workflow Habits That Keep Your Archive Clean',
          slug: '5-workflow-habits-clean-archive',
          excerpt:
            "Simple practices that take under a minute each and prevent the archive chaos that accumulates over years of shooting.",
          category: 'workflow',
          readTime: 4,
          content: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'heading',
                  tag: 'h2',
                  version: 1,
                  children: [
                    { text: '1. Name your session before you upload', type: 'text', version: 1 },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
                {
                  type: 'paragraph',
                  version: 1,
                  children: [
                    {
                      text: 'Before starting an ingest, create a Session first and give it a descriptive name. Assets ingested during that session will automatically be linked, making them instantly findable even years later.',
                      type: 'text',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
                {
                  type: 'heading',
                  tag: 'h2',
                  version: 1,
                  children: [
                    { text: '2. Set your cover asset immediately', type: 'text', version: 1 },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
                {
                  type: 'paragraph',
                  version: 1,
                  children: [
                    {
                      text: "Right after an ingest completes, pick the strongest image from the session and assign it as the cover. It takes 10 seconds and makes every future session review much faster — you won't have to remember which shoot a generic thumbnail belongs to.",
                      type: 'text',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
                {
                  type: 'heading',
                  tag: 'h2',
                  version: 1,
                  children: [
                    {
                      text: '3. Use Smart Collections for work-in-progress',
                      type: 'text',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
                {
                  type: 'paragraph',
                  version: 1,
                  children: [
                    {
                      text: 'Create a Smart Collection filtered by ingestionStatus = "ready" and name it "Ready to Edit". This becomes a live queue of assets that have been processed but not yet added to a portfolio — your automatic to-do list.',
                      type: 'text',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
            },
          },
        },
        {
          title: 'How Asset Ingestion Works Under the Hood',
          slug: 'how-asset-ingestion-works',
          excerpt:
            'A transparent look at what happens between clicking "Upload" and seeing your asset marked as ready.',
          category: 'guide',
          readTime: 6,
          content: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'heading',
                  tag: 'h2',
                  version: 1,
                  children: [
                    { text: 'From upload to ready in four steps', type: 'text', version: 1 },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
                {
                  type: 'paragraph',
                  version: 1,
                  children: [
                    {
                      text: 'When you upload an asset, four distinct things happen in sequence: the file is transferred to secure storage, a document record is created in the database, a processing worker picks up the job, and the processed derivatives are linked back to your asset record.',
                      type: 'text',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
                {
                  type: 'heading',
                  tag: 'h2',
                  version: 1,
                  children: [{ text: 'What "processing" actually means', type: 'text', version: 1 }],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
                {
                  type: 'paragraph',
                  version: 1,
                  children: [
                    {
                      text: 'The processing step generates optimised WebP derivatives of your original at two sizes — a small thumbnail and a medium proxy. These are what you see in the library grid and on the detail view. Your original is always preserved at full quality in secure cloud storage.',
                      type: 'text',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
                {
                  type: 'heading',
                  tag: 'h2',
                  version: 1,
                  children: [{ text: 'Accession and lineage', type: 'text', version: 1 }],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
                {
                  type: 'paragraph',
                  version: 1,
                  children: [
                    {
                      text: 'On creation, every asset receives an accession ID — a UUID that serves as its permanent identifier. Unlike filenames, accession IDs are immutable. They are the stable reference for API integrations, portfolio embeds, and any downstream system that references your assets.',
                      type: 'text',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
            },
          },
        },
      ]

      for (const def of articleDefs) {
        const existing = await payload.find({
          collection: 'articles',
          where: { slug: { equals: def.slug } },
          limit: 1,
        })
        if (existing.docs.length > 0) {
          payload.logger.info(`  Article "${def.title}" exists, skipping.`)
          continue
        }
        await payload.create({
          collection: 'articles',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { ...def, _status: 'published', publishedOn: new Date().toISOString() } as any,
          context: { disableRevalidate: true },
        })
        payload.logger.info(`  Created article "${def.title}"`)
      }
    } catch (err) {
      payload.logger.error(
        `Error seeding Articles: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    // 1g. Downloads — gated free resources
    try {
      payload.logger.info('Seeding Downloads...')

      const downloadDefs = [
        {
          title: 'Cinematic Teal & Orange LUT Pack',
          description:
            'Three colour grades inspired by modern cinema — warm highlights, teal shadows. Compatible with Lightroom, Premiere Pro, and DaVinci Resolve.',
          fileType: 'lut',
          requiresAccount: true,
          tags: [{ tag: 'colour' }, { tag: 'cinema' }, { tag: 'lightroom' }],
        },
        {
          title: 'Minimal Portfolio Grid Template',
          description:
            'A clean three-column grid layout template for building a portfolio in Framehouse Hub. Optimised for photography and mixed-media work.',
          fileType: 'template',
          requiresAccount: true,
          tags: [{ tag: 'portfolio' }, { tag: 'grid' }, { tag: 'photography' }],
        },
        {
          title: 'Muted Film Preset Collection',
          description:
            'Five film-inspired presets with lifted shadows and desaturated midtones. Great for documentary, portrait, and street photography.',
          fileType: 'preset',
          requiresAccount: true,
          tags: [{ tag: 'film' }, { tag: 'muted' }, { tag: 'portrait' }],
        },
      ]

      for (const def of downloadDefs) {
        const existing = await payload.find({
          collection: 'downloads',
          where: { title: { equals: def.title } },
          limit: 1,
        })
        if (existing.docs.length > 0) {
          payload.logger.info(`  Download "${def.title}" exists, skipping.`)
          continue
        }
        await payload.create({
          collection: 'downloads',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { ...def, _status: 'published' } as any,
          context: { disableRevalidate: true },
        })
        payload.logger.info(`  Created download "${def.title}"`)
      }
    } catch (err) {
      payload.logger.error(
        `Error seeding Downloads: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    const pagesToSeed = [aboutPageData, hubPageData, learnPageData, companyPageData]

    // 2. Sync Pages
    for (const pageData of pagesToSeed) {
      try {
        const { slug } = pageData

        // Enrich Hero with media (only high/medium impact heroes have media field)
        if (
          pageData.hero &&
          (pageData.hero.type === 'highImpact' || pageData.hero.type === 'mediumImpact')
        ) {
          // @ts-expect-error - conditional media injection on discriminated hero union
          pageData.hero.media = fallbackMediaIds[0]
        }

        // 1. Enrich layout blocks with media if available.
        // Company and learn pages have dedicated page components that use static
        // bundled assets — skip media injection so no local-only fixture IDs leak in.
        const skipMediaEnrichment = slug === 'company' || slug === 'learn'
        if (!skipMediaEnrichment && pageData.layout && fallbackMediaIds.length > 0) {
          // @ts-expect-error - Dynamic block enrichment type mismatch
          pageData.layout = pageData.layout.map((block: Record<string, unknown>) => {
            const typedBlock = block
            if (
              typedBlock.blockType === 'threeItemGrid' &&
              typedBlock.style === 'pillars' &&
              typedBlock.items
            ) {
              return {
                ...typedBlock,
                items: (typedBlock.items as unknown[]).map((item: unknown, i: number) => ({
                  ...(item as Record<string, unknown>),
                  media:
                    (item as Record<string, unknown>)['media'] ||
                    fallbackMediaIds[i % fallbackMediaIds.length],
                })),
              }
            }
            if (
              typedBlock.blockType === 'content' &&
              (typedBlock.layoutStyle === 'asymmetric' ||
                typedBlock.layoutStyle === 'side_by_side') &&
              typedBlock.columns
            ) {
              return {
                ...typedBlock,
                columns: (typedBlock.columns as unknown[]).map((col: unknown, i: number) => {
                  // In these layouts, ensure at least one column has media if it's meant to be there
                  const typedCol = col as Record<string, unknown>
                  if (typedCol['media'] === null && i === 0 && typedCol['size'] !== 'full') {
                    return { ...typedCol, media: fallbackMediaIds[1 % fallbackMediaIds.length] }
                  }
                  // For side_by_side, we often want the other column to have media too if it's reversed
                  if (
                    typedBlock.layoutStyle === 'side_by_side' &&
                    typedCol['media'] === null &&
                    i === 1
                  ) {
                    return { ...typedCol, media: fallbackMediaIds[2 % fallbackMediaIds.length] }
                  }
                  return typedCol
                }),
              }
            }
            if (typedBlock.blockType === 'about3') {
              return {
                ...typedBlock,
                mainImage: typedBlock.mainImage || fallbackMediaIds[0],
                secondaryImage:
                  typedBlock.secondaryImage || fallbackMediaIds[1 % fallbackMediaIds.length],
                breakout: {
                  ...(typedBlock.breakout as Record<string, unknown>),
                  logo:
                    (typedBlock.breakout as Record<string, unknown>)?.logo ||
                    fallbackMediaIds[2 % fallbackMediaIds.length],
                },
                companies: (typedBlock.companies as unknown[])?.map((item: unknown, i: number) => ({
                  ...(item as Record<string, unknown>),
                  logo:
                    (item as Record<string, unknown>).logo ||
                    fallbackMediaIds[i % fallbackMediaIds.length],
                })),
                contentSections: (typedBlock.contentSections as unknown[])?.map(
                  (section: unknown, i: number) => ({
                    ...(section as Record<string, unknown>),
                    media:
                      (section as Record<string, unknown>).media ||
                      fallbackMediaIds[(i + 1) % fallbackMediaIds.length],
                  }),
                ),
              }
            }
            if (
              typedBlock.blockType === 'carousel' &&
              typedBlock.populateBy === 'selection' &&
              typedBlock.selectedDocs
            ) {
              return {
                ...typedBlock,
                selectedDocs: (typedBlock.selectedDocs as unknown[]).map(
                  (item: unknown, i: number) => ({
                    ...(item as Record<string, unknown>),
                    value:
                      ((item as Record<string, unknown>).value as string | number) ||
                      fallbackMediaIds[i % fallbackMediaIds.length],
                  }),
                ),
              }
            }
            return typedBlock
          })
        }

        const existingPages = await payload.find({
          collection: 'pages',
          where: { slug: { equals: slug } },
        })

        if (existingPages.docs.length > 0) {
          payload.logger.info(`Page [${slug}] exists. Refreshing records...`)
          await payload.update({
            collection: 'pages',
            id: existingPages.docs[0].id,
            // @ts-expect-error - Dynamic page data type mismatch
            data: pageData,
            context: { disableRevalidate: true },
          })
        } else {
          payload.logger.info(`Creating page [${slug}]...`)
          await payload.create({
            collection: 'pages',
            // @ts-expect-error - Dynamic page data type mismatch
            data: pageData,
            context: { disableRevalidate: true },
          })
        }
      } catch (err) {
        payload.logger.error(
          `Error processing page [${pageData.slug}]: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    // 3. Sync Pricing Global
    try {
      payload.logger.info('Updating Pricing global...')
      await payload.updateGlobal({
        slug: 'pricing',
        data: {
          plans: [
            {
              name: 'Free',
              priceMonthly: '£0',
              priceAnnual: '£0',
              description: 'Perfect for individual creators starting their portfolio journey.',
              ctaText: 'Get Started',
              summaryFeatures: [
                { feature: 'Up to 500MB storage' },
                { feature: 'Public Portfolio' },
                { feature: 'Basic Asset Management' },
              ],
            },
            {
              name: 'Creator',
              priceMonthly: '£49',
              priceAnnual: '£41',
              description: 'For growing brands requiring advanced asset organization.',
              ctaText: 'Go Creator',
              isRecommended: true,
              summaryFeatures: [
                { feature: 'Up to 10GB storage' },
                { feature: 'Custom Domain Support' },
                { feature: 'Advanced AI Tagging' },
              ],
            },
            {
              name: 'Production',
              priceMonthly: '£99',
              priceAnnual: '£83',
              description: 'Enterprise-grade speed and collaboration at scale.',
              ctaText: 'Join Production',
              summaryFeatures: [
                { feature: 'Unlimited storage' },
                { feature: 'Global Edge Delivery' },
                { feature: 'Multi-user Collaboration' },
              ],
            },
          ],
          featureCategories: [
            {
              name: 'ASSET MANAGEMENT',
              features: [
                {
                  name: 'Storage capacity',
                  description: 'Total cloud storage for your assets.',
                  plan1Value: '500 MB',
                  plan2Value: '10 GB',
                  plan3Value: 'Unlimited',
                },
                {
                  name: 'AI Optimization',
                  description: 'Automatic image and video transcoding.',
                  plan1Value: 'Basic',
                  plan2Value: 'Advanced',
                  plan3Value: 'Priority',
                },
              ],
            },
            {
              name: 'DELIVERY',
              features: [
                {
                  name: 'Bandwidth',
                  description: 'Monthly data transfer limit.',
                  plan1Value: '2 GB',
                  plan2Value: '50 GB',
                  plan3Value: 'Unlimited',
                },
                {
                  name: 'Custom Domain',
                  description: 'Host your portfolio on your own domain.',
                  plan1Value: '×',
                  plan2Value: '✓',
                  plan3Value: '✓',
                },
              ],
            },
          ],
          partnerLogos: fallbackMediaIds.slice(0, 3).map((id) => ({ logo: id })),
          enterpriseHeading: 'Architect your custom solution.',
          enterpriseDescription:
            'For high-volume production houses requiring custom integrations and global scale.',
          enterpriseCtaLabel: 'Talk to an Architect',
        },
        context: { disableRevalidate: true },
      })
    } catch (err) {
      payload.logger.error(
        `Error syncing Pricing global: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    // 4. Sync Header Global
    try {
      payload.logger.info('Rebuilding Header global nav...')
      await payload.updateGlobal({
        slug: 'header',
        data: ({
          navItems: [
            {
              group: true,
              menuTitle: 'Company',
              subItems: [
                { link: { label: 'About Us', url: '/about', type: 'custom' } },
                { link: { label: 'Company', url: '/company', type: 'custom' } },
                { link: { label: 'Hub', url: '/hub', type: 'custom' } },
              ],
            },
            {
              group: false,
              link: { label: 'Learn', url: '/learn', type: 'custom' },
            },
            {
              group: false,
              link: { label: 'Pricing', url: '/pricing', type: 'custom' },
            },
          ],
        }) as unknown as Parameters<typeof payload.updateGlobal>[0]['data'],
        context: { disableRevalidate: true },
      })
    } catch (err) {
      payload.logger.error(
        `Error syncing Header global: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    // 5. Sync Footer Global
    try {
      payload.logger.info('Updating Footer global...')
      await payload.updateGlobal({
        slug: 'footer',
        data: {
          navItems: [
            { link: { label: 'Company', url: '/company', type: 'custom' } },
            { link: { label: 'Learn', url: '/learn', type: 'custom' } },
            { link: { label: 'Platform', url: '/hub', type: 'custom' } },
            { link: { label: 'Pricing', url: '/pricing', type: 'custom' } },
            { link: { label: 'Login', url: '/login', type: 'custom' } },
          ],
        },
        context: { disableRevalidate: true },
      })
    } catch (err) {
      payload.logger.error(
        `Error syncing Footer global: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    // Seed admin oversight example activity log entry
    try {
      const adminUser = await payload.find({
        collection: 'users',
        where: { email: { equals: 'sys.admin@framehouseworks.com' } },
        limit: 1,
      })
      const creativeUser = await payload.find({
        collection: 'users',
        where: { email: { equals: creativeEmail } },
        limit: 1,
      })
      if (adminUser.docs[0] && creativeUser.docs[0]) {
        const existing = await payload.find({
          collection: 'admin-activity-logs',
          where: { actionType: { equals: 'inspect_account' } },
          limit: 1,
        })
        if (existing.docs.length === 0) {
          await payload.create({
            collection: 'admin-activity-logs',
            data: {
              adminUser: adminUser.docs[0].id,
              targetUser: creativeUser.docs[0].id,
              actionType: 'inspect_account',
              actionDescription: `Admin 'System Admin' viewed diagnostic mirror for creative 'Creative User' (seed example)`,
              metadata: { seeded: true },
            },
            overrideAccess: true,
            context: { disableRevalidate: true },
          })
          payload.logger.info('Seeded example AdminActivityLog entry.')
        }
      }
    } catch (err) {
      payload.logger.warn(
        `Could not seed AdminActivityLog example: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    payload.logger.info('Seeding complete.')
  } catch (error: unknown) {
    payload.logger.error('Critical Error during Company/Hub seeding:')
    payload.logger.error(error instanceof Error ? error.message : String(error))
    throw error
  } finally {
    if (prevAsyncFlag === undefined) {
      delete process.env.LOCAL_ASYNC_PROCESSING
    } else {
      process.env.LOCAL_ASYNC_PROCESSING = prevAsyncFlag
    }
  }
}
