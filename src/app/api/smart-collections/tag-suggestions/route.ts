/**
 * FRH-47: Tag suggestions for rule editor autocomplete.
 * Returns distinct tag values from both manualTags and heuristicTags
 * matching an optional prefix query, scoped to the authed user.
 */
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const q = (url.searchParams.get('q') || '').trim().toLowerCase()
    const type = url.searchParams.get('type') || 'all' // 'manual' | 'heuristic' | 'all'

    // Fetch a sample of user's media with tag fields only
    const { docs } = await payload.find({
      collection: 'media',
      where: { owner: { equals: user.id } },
      limit: 2000,
      depth: 0,
      select: { manualTags: true, heuristicTags: true },
    })

    const tagSet = new Set<string>()

    for (const doc of docs) {
      if (type === 'all' || type === 'manual') {
        for (const t of (doc.manualTags as { tag?: string }[] | null) || []) {
          if (t.tag) tagSet.add(t.tag)
        }
      }
      if (type === 'all' || type === 'heuristic') {
        for (const t of (doc.heuristicTags as { tag?: string }[] | null) || []) {
          if (t.tag) tagSet.add(t.tag)
        }
      }
    }

    let tags = Array.from(tagSet).sort()

    if (q) {
      tags = tags.filter((t) => t.toLowerCase().includes(q))
    }

    // Cap at 20 suggestions
    return NextResponse.json({ suggestions: tags.slice(0, 20) })
  } catch (err) {
    console.error('[tag-suggestions]', err)
    return NextResponse.json({ suggestions: [] })
  }
}
