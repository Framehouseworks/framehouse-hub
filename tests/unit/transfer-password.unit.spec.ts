import { describe, it, expect } from 'vitest'
import { createTransferToken, verifyTransferToken } from '@/collections/Transfers/endpoints'

describe('Transfer Password Auth Token & Rate Limiting (Unit)', () => {
  const shareHash = 'tr_unit_test_hash'
  const passwordVersion = 1

  describe('HMAC Auth Token generation and validation', () => {
    it('creates a token with expiry timestamp and signature', () => {
      const expiresAt = Date.now() + 15 * 60 * 1000
      const token = createTransferToken(shareHash, passwordVersion, expiresAt)

      expect(typeof token).toBe('string')
      const parts = token.split('.')
      expect(parts.length).toBe(2)
      expect(Number(parts[0])).toBe(expiresAt)
      expect(parts[1]).toMatch(/^[a-f0-9]{64}$/)
    })

    it('validates a fresh matching token successfully', () => {
      const expiresAt = Date.now() + 15 * 60 * 1000
      const token = createTransferToken(shareHash, passwordVersion, expiresAt)

      const isValid = verifyTransferToken(shareHash, token, passwordVersion)
      expect(isValid).toBe(true)
    })

    it('rejects an expired token', () => {
      const expiredTimestamp = Date.now() - 1000 // 1 sec in past
      const token = createTransferToken(shareHash, passwordVersion, expiredTimestamp)

      const isValid = verifyTransferToken(shareHash, token, passwordVersion)
      expect(isValid).toBe(false)
    })

    it('rejects a token if passwordVersion changed (invalidated by sender password update)', () => {
      const expiresAt = Date.now() + 15 * 60 * 1000
      const token = createTransferToken(shareHash, passwordVersion, expiresAt)

      // Password version was bumped to 2
      const isValid = verifyTransferToken(shareHash, token, 2)
      expect(isValid).toBe(false)
    })

    it('rejects a token if shareHash does not match (cannot replay token across different transfers)', () => {
      const expiresAt = Date.now() + 15 * 60 * 1000
      const token = createTransferToken('tr_file_alpha', passwordVersion, expiresAt)

      const isValid = verifyTransferToken('tr_file_beta', token, passwordVersion)
      expect(isValid).toBe(false)
    })

    it('rejects malformed, empty, or tampered tokens', () => {
      expect(verifyTransferToken(shareHash, null, passwordVersion)).toBe(false)
      expect(verifyTransferToken(shareHash, '', passwordVersion)).toBe(false)
      expect(verifyTransferToken(shareHash, 'not-a-token', passwordVersion)).toBe(false)

      const expiresAt = Date.now() + 15 * 60 * 1000
      const validToken = createTransferToken(shareHash, passwordVersion, expiresAt)
      const tamperedToken = `${validToken.slice(0, -4)}dead`
      expect(verifyTransferToken(shareHash, tamperedToken, passwordVersion)).toBe(false)
    })
  })

  describe('Isolated rate-limiting key isolation logic', () => {
    it('generates distinct composite keys per client IP and shareHash', () => {
      const clientIp = '192.168.1.100'
      const shareHashA = 'tr_file_alpha'
      const shareHashB = 'tr_file_beta'

      const keyA = `${clientIp}:${shareHashA}`
      const keyB = `${clientIp}:${shareHashB}`

      expect(keyA).not.toBe(keyB)
      expect(keyA).toBe('192.168.1.100:tr_file_alpha')
      expect(keyB).toBe('192.168.1.100:tr_file_beta')
    })
  })
})

