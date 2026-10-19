// Strict 3-day (72-hour) retention policy
export const TRANSFER_EXPIRY_DAYS = 3
export const TRANSFER_EXPIRY_MS = TRANSFER_EXPIRY_DAYS * 24 * 60 * 60 * 1000 // 259,200,000 ms

// Maximum transfer upload size: 250MB
export const MAX_TRANSFER_BYTES = 250 * 1024 * 1024

// Canonical storage path prefix
export const TRANSFERS_PREFIX = 'transfers'

// GCS Lifecycle rule age (includes 1-day safety buffer)
export const GCS_LIFECYCLE_AGE_DAYS = 4
