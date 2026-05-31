'use client'

import { useScrollReset } from '@/hooks/useScrollReset'

/** Zero-render client island — resets window scroll on every route change. */
export function ScrollResetEffect() {
  useScrollReset()
  return null
}
