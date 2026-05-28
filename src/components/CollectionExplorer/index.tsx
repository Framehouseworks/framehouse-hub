import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { auth } from '@/utilities/auth'
import { cn } from '@/utilities/cn'
import { lexicalToText } from '@/utilities/lexicalToText'
import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'
import { Tag, Sparkles, FolderKanban, Layers } from 'lucide-react'

export const CollectionExplorer = async ({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) => {
  const user = await auth()
  if (!user) return null

  const activeViewId = searchParams?.view as string | undefined
  const activeSearch = searchParams?.search as string | undefined

  const payload = await getPayload({ config: configPromise })

  // 1. Fetch Portfolios (Explicit Collections)
  const { docs: portfolios } = await payload.find({
    collection: 'portfolios',
    where: { owner: { equals: user.id } },
    sort: '-updatedAt',
  })

  // 2. Fetch Saved Smart Collections (Explicit Views)
  const { docs: savedCollections } = await payload.find({
    collection: 'smart-collections',
    where: { owner: { equals: user.id } },
    sort: '-updatedAt',
  })

  // 3. Extract Heuristic Suggestions (Implicit Tag-based Views)
  const { docs: mediaWithTags } = await payload.find({
    collection: 'media',
    where: { owner: { equals: user.id } },
    limit: 100,
    select: { manualTags: true, shootName: true },
  })

  const smartTags = Array.from(
    new Set(mediaWithTags.flatMap((m) => m.manualTags?.map((t) => t.tag).filter(Boolean) || [])),
  ).slice(0, 4) as string[]

  const shootNames = Array.from(
    new Set(mediaWithTags.map((m) => m.shootName).filter(Boolean)),
  ).slice(0, 4) as string[]

  return (
    <section className="mt-16 space-y-16">
      {/* 1. Saved Views: Curatorial Governance */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.05] pb-4">
          <div className="flex items-center gap-3">
            <Sparkles className="text-gallery-gold" size={20} />
            <h2 className="text-xl font-semibold text-primary">Saved Views</h2>
          </div>
          <span className="text-[10px] font-bold tracking-widest text-on-surface/30 uppercase font-rubik">
            Governance
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {savedCollections.map((collection) => {
            const isActive = activeViewId === String(collection.id)
            const href = isActive ? '/dashboard' : `/dashboard?view=${collection.id}`
            return (
              <Link key={collection.id} href={href} className="group">
                <div
                  className={cn(
                    'h-full rounded-[24px] p-6 hover:border-gallery-gold/30 hover:bg-gallery-gold/[0.03] hover:shadow-xl hover:shadow-gallery-gold/5 transition-all duration-500 flex flex-col items-start gap-4 border',
                    isActive
                      ? 'border-gallery-gold/60 ring-2 ring-gallery-gold/10 bg-gallery-gold/[0.02] dark:bg-gallery-gold/[0.01]'
                      : 'bg-gallery-surface/50 dark:bg-white/[0.02] border-black/[0.03] dark:border-white/[0.03]',
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-gallery-gold/10 flex items-center justify-center text-gallery-gold group-hover:scale-110 transition-transform">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-primary truncate group-hover:text-gallery-gold transition-colors">
                      {collection.name}
                    </h3>
                    <p className="text-[10px] text-on-surface/40 uppercase tracking-wider font-varela mt-1">
                      Intelligent View
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
          {savedCollections.length === 0 && (
            <div className="col-span-full py-8 text-center border-2 border-dashed border-black/[0.03] dark:border-white/[0.03] rounded-[32px]">
              <p className="text-xs text-on-surface/30 italic">
                No saved views yet. Use &apos;Save View&apos; in the archive to establish
                collections.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Intelligent Discovery: Heuristic Suggestions */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.05] pb-4">
          <div className="flex items-center gap-3">
            <Tag className="text-on-surface/30" size={20} />
            <h2 className="text-xl font-semibold text-primary">Discovery Suggestions</h2>
          </div>
          <span className="text-[10px] font-bold tracking-widest text-on-surface/20 uppercase font-rubik">
            Heuristics
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {shootNames.map((shoot) => {
            const isActive = activeSearch === shoot
            const href = isActive ? '/dashboard/library' : `/dashboard/library?search=${encodeURIComponent(shoot)}`
            return (
              <Link key={shoot} href={href} className="group">
                <div
                  className={cn(
                    'rounded-2xl p-5 hover:border-gallery-gold/20 hover:bg-gallery-gold/5 transition-all border',
                    isActive
                      ? 'border-gallery-gold/50 ring-2 ring-gallery-gold/10 bg-gallery-gold/5'
                      : 'bg-gallery-surface/50 dark:bg-white/[0.02] border-black/[0.03] dark:border-white/[0.03]',
                  )}
                >
                  <FolderKanban
                    className="text-gallery-gold/40 group-hover:text-gallery-gold mb-3 transition-colors"
                    size={16}
                  />
                  <h3 className="text-xs font-semibold text-primary truncate">{shoot}</h3>
                  <p className="text-[9px] text-on-surface/40 uppercase tracking-widest font-varela mt-1">
                    Batch
                  </p>
                </div>
              </Link>
            )
          })}
          {smartTags.map((tag) => {
            const isActive = activeSearch === tag
            const href = isActive ? '/dashboard/library' : `/dashboard/library?search=${encodeURIComponent(tag)}`
            return (
              <Link key={tag} href={href} className="group">
                <div
                  className={cn(
                    'rounded-2xl p-5 hover:border-gallery-gold/20 hover:bg-gallery-gold/5 transition-all border',
                    isActive
                      ? 'border-gallery-gold/50 ring-2 ring-gallery-gold/10 bg-gallery-gold/5'
                      : 'bg-gallery-surface/50 dark:bg-white/[0.02] border-black/[0.03] dark:border-white/[0.03]',
                  )}
                >
                  <Tag
                    className="text-on-surface/20 group-hover:text-gallery-gold mb-3 transition-colors"
                    size={16}
                  />
                  <h3 className="text-xs font-semibold text-primary truncate">{tag}</h3>
                  <p className="text-[9px] text-on-surface/40 uppercase tracking-widest font-varela mt-1">
                    Tag View
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Portfolios: Curated Artifacts */}
      {portfolios.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.05] pb-4">
            <div className="flex items-center gap-3">
              <Layers className="text-on-surface/40" size={20} />
              <h2 className="text-xl font-semibold text-primary">Creative Portfolios</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {portfolios.map((portfolio) => (
              <Link key={portfolio.id} href={`/p/${portfolio.slug}`} target="_blank">
                <Card className="bg-gallery-surface/40 dark:bg-white/[0.02] border-black/[0.05] dark:border-white/[0.05] hover:border-gallery-gold/20 hover:bg-gallery-gold/[0.02] transition-all duration-500 group rounded-[24px]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-medium group-hover:text-gallery-gold transition-colors font-rubik">
                      {lexicalToText(portfolio.title)}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="opacity-70 capitalize rounded-full px-3 py-0.5 text-[9px] font-bold tracking-widest border-gallery-gold/20 text-gallery-gold"
                    >
                      {portfolio.visibility}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-on-surface/40 line-clamp-2 font-varela leading-relaxed">
                      {portfolio.subheading
                        ? lexicalToText(portfolio.subheading)
                        : 'No description provided.'}
                    </p>
                    <div className="mt-6 text-gallery-gold text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all">
                      View Public Portfolio <span className="text-lg leading-none">→</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
