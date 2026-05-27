import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { generateSmartCollections } from '@/lib/autoGenerateCollections'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_req: Request) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await generateSmartCollections(payload, user.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[smart-collections/generate]', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
