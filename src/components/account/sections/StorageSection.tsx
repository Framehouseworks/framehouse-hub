'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { StorageMeter, type StorageData } from '@/components/account/StorageMeter'

const POLL_INTERVAL_MS = 10_000

export const StorageSection: React.FC = () => {
  const [data, setData] = useState<StorageData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStorage = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me/storage', { credentials: 'include' })
      if (res.ok) {
        const json: StorageData = await res.json()
        setData(json)
      }
    } catch {
      // Non-fatal — leave previous data visible
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStorage()
    const interval = setInterval(fetchStorage, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchStorage])

  const empty: StorageData = {
    totalBytes: 0,
    byType: { image: 0, video: 0, audio: 0, other: 0 },
    tierLimitBytes: 2 * 1024 ** 4,
    usagePercent: 0,
  }

  return (
    <section id="storage" className="space-y-6 scroll-mt-[148px] lg:scroll-mt-8">
      <div>
        <h2 className="text-lg font-semibold text-on-surface">Cloud Storage</h2>
        <p className="mt-1 text-sm text-on-surface/50">
          Live utilisation across your archive. Updated every 10 seconds.
        </p>
      </div>

      <div className="bg-gallery-surface/60 rounded-2xl p-4 sm:p-6 shadow-[0px_20px_40px_rgba(26,28,28,0.06)]">
        <StorageMeter data={data ?? empty} loading={loading && !data} />
      </div>
    </section>
  )
}
