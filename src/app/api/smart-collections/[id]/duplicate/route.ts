import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const original = await payload.findByID({
      collection: 'smart-collections',
      id,
      depth: 0,
    })

    const ownerId =
      typeof original.owner === 'object'
        ? (original.owner as { id: number }).id
        : original.owner
    if (ownerId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // FRH-47: data cast to any — new fields not yet in generated payload-types.ts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {
      name: `${original.name} (Copy)`,
      owner: user.id,
      filterQuery: original.filterQuery as Record<string, unknown>,
      icon: original.icon ?? 'folder',
      description: original.description ?? '',
      isSystemGenerated: false,
      isHidden: false,
      sortOrder: 0,
      generatedFrom: 'manual',
    }

    const copy = await payload.create({ collection: 'smart-collections', data })

    return NextResponse.json(copy)
  } catch (err) {
    console.error('[smart-collections/duplicate]', err)
    return NextResponse.json({ error: 'Duplicate failed' }, { status: 500 })
  }
}
