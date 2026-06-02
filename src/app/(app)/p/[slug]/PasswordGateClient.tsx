'use client'

import React, { useState } from 'react'
import { PasswordGate } from '@/components/Portfolio/PasswordGate'
import { useRouter } from 'next/navigation'

interface Props {
  slug: string
}

export function PasswordGateClient({ slug }: Props) {
  const router = useRouter()

  async function handleUnlock(password: string): Promise<boolean> {
    const res = await fetch(`/api/portfolios/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, password }),
    })
    if (res.ok) {
      // Cookie set by the API route — refresh page to re-run server component
      router.refresh()
      return true
    }
    return false
  }

  return <PasswordGate slug={slug} onUnlock={handleUnlock} />
}
