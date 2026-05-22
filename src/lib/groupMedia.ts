import type { Media } from '@/payload-types'

export type DateMode = 'capture' | 'ingest'

export interface MediaGroup {
  key: string
  label: string
  labelType: 'date' | 'shoot'
  items: Media[]
}

function getDateBucket(date: Date): string {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const itemStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((todayStart.getTime() - itemStart.getTime()) / 86_400_000)

  if (diffDays === 0) return 'TODAY'
  if (diffDays < 7) return 'THIS WEEK'
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()
}

export function groupMedia(items: Media[], mode: DateMode): MediaGroup[] {
  const sorted = [...items].sort((a, b) => {
    const aMs =
      mode === 'capture'
        ? new Date(a.captureDate || a.createdAt).getTime()
        : new Date(a.createdAt).getTime()
    const bMs =
      mode === 'capture'
        ? new Date(b.captureDate || b.createdAt).getTime()
        : new Date(b.createdAt).getTime()
    return bMs - aMs
  })

  // Only treat a shootName as a cluster header if shared by 2+ items
  const shootFreq = new Map<string, number>()
  for (const item of sorted) {
    if (item.shootName) shootFreq.set(item.shootName, (shootFreq.get(item.shootName) ?? 0) + 1)
  }

  const groups: MediaGroup[] = []
  let currentGroup: MediaGroup | null = null

  for (const item of sorted) {
    const dateStr = mode === 'capture' ? item.captureDate || item.createdAt : item.createdAt
    const date = new Date(dateStr)
    const shootName =
      item.shootName && (shootFreq.get(item.shootName) ?? 0) > 1 ? item.shootName : null
    const groupKey = shootName ? `shoot:${shootName}` : `date:${getDateBucket(date)}`

    if (!currentGroup || currentGroup.key !== groupKey) {
      currentGroup = {
        key: groupKey,
        label: shootName || getDateBucket(date),
        labelType: shootName ? 'shoot' : 'date',
        items: [],
      }
      groups.push(currentGroup)
    }
    currentGroup.items.push(item)
  }

  return groups
}
