import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { checkRole } from '@/access/utilities'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: req.headers })

  if (!user || !checkRole(['admin'], user)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!userId || typeof userId !== 'string') {
    return Response.json({ error: 'Invalid userId' }, { status: 400 })
  }

  const [mediaResult, portfolioResult, sessionResult, activityResult] = await Promise.all([
    payload.find({
      collection: 'media',
      where: { owner: { equals: userId } },
      limit: 0,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'portfolios',
      where: { owner: { equals: userId } },
      limit: 0,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'sessions',
      where: { owner: { equals: userId } },
      limit: 0,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'admin-activity-logs',
      where: { targetUser: { equals: userId } },
      sort: '-createdAt',
      limit: 5,
      depth: 1,
      overrideAccess: true,
    }),
  ])

  // Aggregate storage: sum filesize across all media owned by this user
  // Payload doesn't expose SUM via find(), so we fetch the filesize field only
  const mediaDocs = await payload.find({
    collection: 'media',
    where: { owner: { equals: userId } },
    limit: 0,
    depth: 0,
    select: { filesize: true },
    overrideAccess: true,
  })

  // totalSize is computed from the paginated result — safe for reasonable counts
  // For very large libraries, consider a raw SQL SUM (v1 optimisation)
  const totalBytes = mediaDocs.docs.reduce((acc: number, doc: { filesize?: number | null }) => {
    return acc + (doc.filesize ?? 0)
  }, 0)

  return Response.json({
    mediaCount: mediaResult.totalDocs,
    portfolioCount: portfolioResult.totalDocs,
    sessionCount: sessionResult.totalDocs,
    totalBytes,
    recentActivity: activityResult.docs,
  })
}
