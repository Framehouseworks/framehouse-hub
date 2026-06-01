import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await getPayload({ config: configPromise })
    await payload.find({ collection: 'users', limit: 0, depth: 0 })
    return NextResponse.json({ db: 'ok' }, { status: 200 })
  } catch {
    return NextResponse.json({ db: 'error' }, { status: 503 })
  }
}
