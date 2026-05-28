import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, filterQuery, icon, description } = body as {
      name: string
      filterQuery: Record<string, unknown>
      icon?: string
      description?: string
    }

    if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
    if (!filterQuery) return NextResponse.json({ error: 'filterQuery required' }, { status: 400 })

    // FRH-47: cast to any — new fields not yet in generated payload-types.ts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {
      name: name.trim(),
      owner: user.id,
      filterQuery,
      icon: (icon as 'folder' | 'tag' | 'sparkles' | 'camera' | 'map') ?? 'folder',
      description: description ?? '',
      isSystemGenerated: false,
      isHidden: false,
      sortOrder: 0,
      generatedFrom: 'manual',
    }
    const collection = await payload.create({ collection: 'smart-collections', data })

    return NextResponse.json(collection, { status: 201 })
  } catch (err) {
    console.error('[smart-collections POST]', err)
    return NextResponse.json({ error: 'Create failed' }, { status: 500 })
  }
}
