import type { Payload } from 'payload'
import { describe, it, beforeAll, expect } from 'vitest'
import { getTestPayload } from '../helpers/payload'

let payload: Payload

describe('API', () => {
  beforeAll(async () => {
    payload = await getTestPayload()
  })

  it('fetches users', async () => {
    const users = await payload.find({
      collection: 'users',
    })
    expect(users).toBeDefined()
  })
})
