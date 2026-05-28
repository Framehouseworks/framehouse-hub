import type { Payload } from 'payload'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it, beforeAll, expect } from 'vitest'
import { getTestPayload } from '../helpers/payload'

const FIXTURE_PATH = path.resolve(__dirname, '../../src/seed/fixtures/alpine-summit-01.jpg')

function loadFixture(name?: string) {
  const unique = name ?? `int-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  return {
    data: fs.readFileSync(FIXTURE_PATH),
    name: unique,
    mimetype: 'image/jpeg',
    size: fs.statSync(FIXTURE_PATH).size,
  }
}

async function createOwner(payload: Payload, suffix: string) {
  return payload.create({
    collection: 'users',
    data: {
      email: `sessions-${suffix}-${Date.now()}@example.test`,
      password: 'password123',
      roles: ['creative'],
    },
  })
}

let payload: Payload

describe('Sessions collection (integration)', () => {
  beforeAll(async () => {
    payload = await getTestPayload()
  })

  describe('CRUD', () => {
    it('creates a session and reads it back', async () => {
      const owner = await createOwner(payload, 'crud')
      const session = await payload.create({
        collection: 'sessions',
        data: {
          name: 'Golden Hour Rooftop',
          shootDate: '2026-04-15T00:00:00.000Z',
          description: 'Sunset shoot on Southwark rooftop.',
          owner: owner.id,
        },
      })

      expect(session.id).toBeDefined()
      expect(session.name).toBe('Golden Hour Rooftop')
      const ownerId =
        typeof session.owner === 'object' ? (session.owner as { id: number }).id : session.owner
      expect(ownerId).toBe(owner.id)
    })

    it('normalizes session name to title-case', async () => {
      const owner = await createOwner(payload, 'normalize')
      const session = await payload.create({
        collection: 'sessions',
        data: { name: 'studio portraits for brand x', owner: owner.id },
      })
      expect(session.name).toBe('Studio Portraits For Brand X')
    })
  })

  describe('syncShootNameFromSession hook', () => {
    it('stamps shootName on media when session FK is set at create time', async () => {
      const owner = await createOwner(payload, 'sync-create')
      const session = await payload.create({
        collection: 'sessions',
        data: { name: 'Winter Fashion Campaign', owner: owner.id },
      })

      const media = await payload.create({
        collection: 'media',
        data: {
          title: 'Coat Look 01',
          alt: 'coat',
          mediaType: 'image',
          owner: owner.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          session: session.id as any,
        },
        file: loadFixture(),
      })

      expect((media as { shootName?: string }).shootName).toBe('Winter Fashion Campaign')
    })

    it('updates shootName when session FK is changed via update', async () => {
      const owner = await createOwner(payload, 'sync-update')
      const sessionA = await payload.create({
        collection: 'sessions',
        data: { name: 'Spring Lookbook', owner: owner.id },
      })
      const sessionB = await payload.create({
        collection: 'sessions',
        data: { name: 'Autumn Editorial', owner: owner.id },
      })

      const media = await payload.create({
        collection: 'media',
        data: {
          title: 'Look 01',
          alt: 'look',
          mediaType: 'image',
          owner: owner.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          session: sessionA.id as any,
        },
        file: loadFixture(),
      })
      expect((media as { shootName?: string }).shootName).toBe('Spring Lookbook')

      const updated = await payload.update({
        collection: 'media',
        id: media.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { session: sessionB.id as any },
      })
      expect((updated as { shootName?: string }).shootName).toBe('Autumn Editorial')
    })
  })

  describe('FK cascade on session delete', () => {
    it('nullifies media.session when the session is deleted', async () => {
      const owner = await createOwner(payload, 'cascade')
      const session = await payload.create({
        collection: 'sessions',
        data: { name: 'Cascade Test Session', owner: owner.id },
      })

      const media = await payload.create({
        collection: 'media',
        data: {
          title: 'Cascade Asset',
          alt: 'cascade',
          mediaType: 'image',
          owner: owner.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          session: session.id as any,
        },
        file: loadFixture(),
      })

      // Verify FK is set
      const before = await payload.findByID({ collection: 'media', id: media.id, depth: 0 })
      const sessionRef = (before as { session?: unknown }).session
      const sessionId = typeof sessionRef === 'object' && sessionRef !== null
        ? (sessionRef as { id: number }).id
        : sessionRef
      expect(sessionId).toBe(session.id)

      // Delete the session
      await payload.delete({ collection: 'sessions', id: session.id })

      // Media survives; FK nulled
      const after = await payload.findByID({ collection: 'media', id: media.id, depth: 0 })
      expect(after).toBeDefined()
      expect((after as { session?: unknown }).session == null).toBe(true)
    })
  })
})
