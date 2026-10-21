import type { Metadata } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { TransferDownloadView, type TransferStatus } from '@/components/Transfers/TransferDownloadView'
import type { Transfer } from '@/payload-types'
import { getActiveTransferWallpapers } from '@/lib/transfer-wallpapers'

interface PageProps {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const payload = await getPayload({ config: configPromise })
    const { docs } = await payload.find({
      collection: 'transfers',
      where: {
        or: [
          { shareHash: { equals: slug } },
          { title: { equals: slug } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })
    const transfer = docs[0] as Transfer | undefined
    if (transfer && transfer.status === 'active') {
      const title = `${transfer.title || transfer.filename} | Framehouse Hub Transfer`
      const description = `Download ${transfer.filename} (${(transfer.filesize / (1024 * 1024)).toFixed(1)}MB) securely via Framehouse Hub.`
      return {
        title,
        description,
        robots: {
          index: false,
          follow: false,
          nocache: true,
        },
        openGraph: {
          title,
          description,
        },
      }
    }
  } catch {
    /* fallback to generic title */
  }

  return {
    title: 'Download File Transfer | Framehouse Hub',
    description: 'Direct, secure file transfer delivery via Framehouse Hub.',
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  }
}

export default async function TransferVanityShortLinkPage({ params }: PageProps) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })

  const [wallpapersResult, transfersResult] = await Promise.all([
    getActiveTransferWallpapers(payload),
    payload.find({
      collection: 'transfers',
      where: {
        or: [
          { shareHash: { equals: slug } },
          { title: { equals: slug } },
        ],
      },
      depth: 1,
      limit: 1,
      overrideAccess: true,
    }),
  ])

  const transfer = transfersResult.docs[0] as Transfer | undefined

  let status: TransferStatus = 'not_found'
  if (transfer) {
    if (transfer.status === 'revoked') {
      status = 'revoked'
    } else if (new Date(transfer.expiresAt).getTime() <= Date.now()) {
      status = 'expired'
    } else {
      status = 'active'
    }
  }

  return (
    <TransferDownloadView
      transfer={transfer || null}
      status={status}
      wallpapers={wallpapersResult}
    />
  )
}
