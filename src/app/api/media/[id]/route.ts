import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'

// Used by MediaGrid's inject effect and UploadProvider's polling backstop to
// fetch a single media doc by ID. Returns the full Payload document so the
// client can inject/update the card without waiting for a full router.refresh().
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const requestHeaders = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const doc = await payload.findByID({
      collection: 'media',
      id,
    })

    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Enforce ownership — only the owning user may fetch via this route.
    const ownerId = typeof doc.owner === 'object' ? doc.owner?.id : doc.owner
    if (String(ownerId) !== String(user.id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(doc)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
