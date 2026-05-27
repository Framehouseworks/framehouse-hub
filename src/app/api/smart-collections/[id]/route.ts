/**
 * FRH-47: Thin proxy for SmartCollection PATCH / DELETE.
 * Payload REST endpoints are available at /api/smart-collections/:id
 * but we add an owner guard here for defence-in-depth.
 */
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getAuthedOwner(id: number) {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })
  if (!user) return { payload, user: null, collection: null }

  const collection = await payload.findByID({
    collection: 'smart-collections',
    id,
    depth: 0,
  })

  const ownerId =
    typeof collection.owner === 'object'
      ? (collection.owner as { id: number }).id
      : collection.owner

  if (ownerId !== user.id) return { payload, user, collection: null }
  return { payload, user, collection }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    const { payload, collection } = await getAuthedOwner(id)
    if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const updated = await payload.update({
      collection: 'smart-collections',
      id,
      data: body,
      depth: 0,
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[smart-collections PATCH]', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    const { payload, collection } = await getAuthedOwner(id)
    if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await payload.delete({ collection: 'smart-collections', id })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[smart-collections DELETE]', err)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
