/**
 * FRH-47: Tag/field suggestions for rule editor autocomplete.
 *
 * Query params:
 *   q     — prefix filter (case-insensitive)
 *   type  — 'manual' | 'heuristic' | 'all'  (for tag array fields)
 *   field — 'shootName' | 'cameraModel' | 'lensModel'  (for scalar fields)
 *
 * When `field` is set, returns distinct non-empty values for that scalar field.
 * Otherwise returns tag values from manualTags / heuristicTags arrays.
 */
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SCALAR_FIELD_MAP: Record<string, string> = {
  shootName: 'shootName',
  cameraMake: 'technical.cameraMake',
  cameraModel: 'technical.cameraModel',
  lensModel: 'technical.lensModel',
}

export async function GET(req: Request) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const q = (url.searchParams.get('q') || '').trim().toLowerCase()
    const type = url.searchParams.get('type') || 'all'
    const field = url.searchParams.get('field') || ''

    // ── Scalar field suggestions (shootName, cameraModel, lensModel) ──────────
    if (field && SCALAR_FIELD_MAP[field]) {
      const payloadField = SCALAR_FIELD_MAP[field]
      // Build a "not-empty" where clause for the field
      const whereField = payloadField.includes('.')
        ? { [payloadField]: { not_equals: '' } }
        : { [payloadField]: { not_equals: '' } }

      const { docs } = await payload.find({
        collection: 'media',
        where: {
          and: [
            { owner: { equals: user.id } },
            whereField,
          ],
        },
        limit: 2000,
        depth: 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        select: { [payloadField.split('.')[0]]: true } as any,
      })

      const valueSet = new Set<string>()
      for (const doc of docs) {
        let val: string | undefined
        if (field === 'shootName') {
          val = (doc as { shootName?: string }).shootName
        } else if (field === 'cameraMake') {
          val = (doc as { technical?: { cameraMake?: string } }).technical?.cameraMake
        } else if (field === 'cameraModel') {
          val = (doc as { technical?: { cameraModel?: string } }).technical?.cameraModel
        } else if (field === 'lensModel') {
          val = (doc as { technical?: { lensModel?: string } }).technical?.lensModel
        }
        if (val && val.trim()) valueSet.add(val.trim())
      }

      let values = Array.from(valueSet).sort()
      if (q) values = values.filter((v) => v.toLowerCase().includes(q))

      return NextResponse.json({ suggestions: values.slice(0, 20) })
    }

    // ── Tag array suggestions (manualTags, heuristicTags) ────────────────────
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
    if (q) tags = tags.filter((t) => t.toLowerCase().includes(q))

    return NextResponse.json({ suggestions: tags.slice(0, 20) })
  } catch (err) {
    console.error('[tag-suggestions]', err)
    return NextResponse.json({ suggestions: [] })
  }
}
