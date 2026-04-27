import type { Media } from '@/payload-types'
import type { PaginatedDocs, Payload } from 'payload'
import { aboutPageData, hubPageData } from './content/hubPages'

export const seedHubContent = async (payload: Payload): Promise<void> => {
  payload.logger.info('Seeding Company and Hub pages...')

  // Fail-fast if secrets are missing
  if (!process.env.PAYLOAD_SECRET) {
    throw new Error('PAYLOAD_SECRET is missing. Cannot proceed with seeding.')
  }

  try {
    // 0. Ensure we have at least one media item for fallbacks
    let mediaDocs = await payload.find({
      collection: 'media',
      limit: 3,
    })

    if (mediaDocs.docs.length === 0) {
      payload.logger.info('No media found, creating fallback placeholder...')

      // Get or create a system user for owning the media (DAM requirement)
      const users = await payload.find({
        collection: 'users',
        limit: 1,
      })

      let ownerId = users.docs[0]?.id

      if (!ownerId) {
        payload.logger.info('No users found, creating default admin for media ownership...')
        const newUser = await payload.create({
          collection: 'users',
          data: {
            email: 'sys.admin@framehouseworks.com',
            password: 'password123',
            name: 'System Admin',
            roles: ['admin'],
          },
          context: { disableRevalidate: true },
        })
        ownerId = newUser.id
      }

      const newMedia = await payload.create({
        collection: 'media',
        data: {
          alt: 'Placeholder',
          mediaType: 'image',
          owner: ownerId,
          status: 'ready',
        },
        file: {
          data: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
            'base64',
          ),
          name: 'placeholder.png',
          mimetype: 'image/png',
          size: 100,
        },
        context: { disableRevalidate: true },
      })
      mediaDocs = { docs: [newMedia] } as unknown as PaginatedDocs<Media>
    }

    const fallbackMediaIds = mediaDocs.docs.map((doc) => doc.id)

    const pagesToSeed = [aboutPageData, hubPageData]

    // 2. Sync Pages
    for (const pageData of pagesToSeed) {
      try {
        const { slug } = pageData

        // Enrich Hero with media
        if (
          pageData.hero &&
          (pageData.hero.type === 'highImpact' || pageData.hero.type === 'mediumImpact')
        ) {
          pageData.hero.media = fallbackMediaIds[0]
        }

        // 1. Enrich layout blocks with media if available
        if (pageData.layout && fallbackMediaIds.length > 0) {
          // @ts-expect-error - Dynamic block enrichment type mismatch
          pageData.layout = pageData.layout.map((block: Record<string, unknown>) => {
            const typedBlock = block
            if (
              typedBlock.blockType === 'threeItemGrid' &&
              typedBlock.style === 'pillars' &&
              typedBlock.items
            ) {
              return {
                ...typedBlock,
                items: (typedBlock.items as unknown[]).map((item: unknown, i: number) => ({
                  ...(item as Record<string, unknown>),
                  media:
                    (item as Record<string, unknown>)['media'] ||
                    fallbackMediaIds[i % fallbackMediaIds.length],
                })),
              }
            }
            if (
              typedBlock.blockType === 'content' &&
              (typedBlock.layoutStyle === 'asymmetric' ||
                typedBlock.layoutStyle === 'side_by_side') &&
              typedBlock.columns
            ) {
              return {
                ...typedBlock,
                columns: (typedBlock.columns as unknown[]).map((col: unknown, i: number) => {
                  // In these layouts, ensure at least one column has media if it's meant to be there
                  const typedCol = col as Record<string, unknown>
                  if (typedCol['media'] === null && i === 0 && typedCol['size'] !== 'full') {
                    return { ...typedCol, media: fallbackMediaIds[1 % fallbackMediaIds.length] }
                  }
                  // For side_by_side, we often want the other column to have media too if it's reversed
                  if (
                    typedBlock.layoutStyle === 'side_by_side' &&
                    typedCol['media'] === null &&
                    i === 1
                  ) {
                    return { ...typedCol, media: fallbackMediaIds[2 % fallbackMediaIds.length] }
                  }
                  return typedCol
                }),
              }
            }
            if (typedBlock.blockType === 'about3') {
              return {
                ...typedBlock,
                mainImage: typedBlock.mainImage || fallbackMediaIds[0],
                secondaryImage:
                  typedBlock.secondaryImage || fallbackMediaIds[1 % fallbackMediaIds.length],
                breakout: {
                  ...(typedBlock.breakout as Record<string, unknown>),
                  logo:
                    (typedBlock.breakout as Record<string, unknown>)?.logo ||
                    fallbackMediaIds[2 % fallbackMediaIds.length],
                },
                companies: (typedBlock.companies as unknown[])?.map((item: unknown, i: number) => ({
                  ...(item as Record<string, unknown>),
                  logo:
                    (item as Record<string, unknown>).logo ||
                    fallbackMediaIds[i % fallbackMediaIds.length],
                })),
                contentSections: (typedBlock.contentSections as unknown[])?.map(
                  (section: unknown, i: number) => ({
                    ...(section as Record<string, unknown>),
                    media:
                      (section as Record<string, unknown>).media ||
                      fallbackMediaIds[(i + 1) % fallbackMediaIds.length],
                  }),
                ),
              }
            }
            if (
              typedBlock.blockType === 'carousel' &&
              typedBlock.populateBy === 'selection' &&
              typedBlock.selectedDocs
            ) {
              return {
                ...typedBlock,
                selectedDocs: (typedBlock.selectedDocs as unknown[]).map(
                  (item: unknown, i: number) => ({
                    ...(item as Record<string, unknown>),
                    value:
                      ((item as Record<string, unknown>).value as string | number) ||
                      fallbackMediaIds[i % fallbackMediaIds.length],
                  }),
                ),
              }
            }
            return typedBlock
          })
        }

        const existingPages = await payload.find({
          collection: 'pages',
          where: { slug: { equals: slug } },
        })

        if (existingPages.docs.length > 0) {
          payload.logger.info(`Page [${slug}] exists. Refreshing records...`)
          await payload.update({
            collection: 'pages',
            id: existingPages.docs[0].id,
            // @ts-expect-error - Dynamic page data type mismatch
            data: pageData,
            context: { disableRevalidate: true },
          })
        } else {
          payload.logger.info(`Creating page [${slug}]...`)
          await payload.create({
            collection: 'pages',
            // @ts-expect-error - Dynamic page data type mismatch
            data: pageData,
            context: { disableRevalidate: true },
          })
        }
      } catch (err) {
        payload.logger.error(
          `Error processing page [${pageData.slug}]: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    // 3. Sync Pricing Global
    try {
      payload.logger.info('Updating Pricing global...')
      await payload.updateGlobal({
        slug: 'pricing',
        data: {
          plans: [
            {
              name: 'Free',
              priceMonthly: '£0',
              priceAnnual: '£0',
              description: 'Perfect for individual creators starting their portfolio journey.',
              ctaText: 'Get Started',
              summaryFeatures: [
                { feature: 'Up to 500MB storage' },
                { feature: 'Public Portfolio' },
                { feature: 'Basic Asset Management' },
              ],
            },
            {
              name: 'Creator',
              priceMonthly: '£49',
              priceAnnual: '£41',
              description: 'For growing brands requiring advanced asset organization.',
              ctaText: 'Go Creator',
              isRecommended: true,
              summaryFeatures: [
                { feature: 'Up to 10GB storage' },
                { feature: 'Custom Domain Support' },
                { feature: 'Advanced AI Tagging' },
              ],
            },
            {
              name: 'Production',
              priceMonthly: '£99',
              priceAnnual: '£83',
              description: 'Enterprise-grade speed and collaboration at scale.',
              ctaText: 'Join Production',
              summaryFeatures: [
                { feature: 'Unlimited storage' },
                { feature: 'Global Edge Delivery' },
                { feature: 'Multi-user Collaboration' },
              ],
            },
          ],
          featureCategories: [
            {
              name: 'ASSET MANAGEMENT',
              features: [
                {
                  name: 'Storage capacity',
                  description: 'Total cloud storage for your assets.',
                  plan1Value: '500 MB',
                  plan2Value: '10 GB',
                  plan3Value: 'Unlimited',
                },
                {
                  name: 'AI Optimization',
                  description: 'Automatic image and video transcoding.',
                  plan1Value: 'Basic',
                  plan2Value: 'Advanced',
                  plan3Value: 'Priority',
                },
              ],
            },
            {
              name: 'DELIVERY',
              features: [
                {
                  name: 'Bandwidth',
                  description: 'Monthly data transfer limit.',
                  plan1Value: '2 GB',
                  plan2Value: '50 GB',
                  plan3Value: 'Unlimited',
                },
                {
                  name: 'Custom Domain',
                  description: 'Host your portfolio on your own domain.',
                  plan1Value: '×',
                  plan2Value: '✓',
                  plan3Value: '✓',
                },
              ],
            },
          ],
          partnerLogos: fallbackMediaIds.slice(0, 3).map((id) => ({ logo: id })),
          enterpriseHeading: 'Architect your custom solution.',
          enterpriseDescription:
            'For high-volume production houses requiring custom integrations and global scale.',
          enterpriseCtaLabel: 'Talk to an Architect',
        },
        context: { disableRevalidate: true },
      })
    } catch (err) {
      payload.logger.error(
        `Error syncing Pricing global: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    // 4. Sync Header Global
    try {
      const header = await payload.findGlobal({
        slug: 'header',
      })

      if (header) {
        payload.logger.info('Updating Header global with Company dropdown links...')
        const updatedNavItems = (header.navItems as Record<string, unknown>[])?.map(
          (item: Record<string, unknown>) => {
            // If it's the "Company" item from Phase 1, ensure sub-items point to our new pages
            const menuTitle = item.menuTitle as string | undefined
            const link = item.link as { label?: string } | undefined
            if (
              menuTitle?.toLowerCase().includes('company') ||
              link?.label?.toLowerCase().includes('company')
            ) {
              return {
                ...item,
                group: true,
                menuTitle: menuTitle || 'Company',
                link: null, // Clear singular link to satisfy group condition
                subItems: [
                  { link: { label: 'About Us', url: '/about', type: 'custom' } },
                  { link: { label: 'Hub', url: '/hub', type: 'custom' } },
                ],
              }
            }
            return item
          },
        )

        await payload.updateGlobal({
          slug: 'header',
          data: {
            navItems: updatedNavItems,
          },
          context: { disableRevalidate: true },
        })
      }
    } catch (err) {
      payload.logger.error(
        `Error syncing Header global: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    // 5. Sync Footer Global
    try {
      payload.logger.info('Updating Footer global...')
      await payload.updateGlobal({
        slug: 'footer',
        data: {
          navItems: [
            { link: { label: 'About', url: '/about', type: 'custom' } },
            { link: { label: 'Platform', url: '/hub', type: 'custom' } },
            { link: { label: 'Pricing', url: '/pricing', type: 'custom' } },
            { link: { label: 'Login', url: '/login', type: 'custom' } },
          ],
        },
        context: { disableRevalidate: true },
      })
    } catch (err) {
      payload.logger.error(
        `Error syncing Footer global: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    payload.logger.info('Seeding complete.')
  } catch (error: unknown) {
    payload.logger.error('Critical Error during Company/Hub seeding:')
    payload.logger.error(error instanceof Error ? error.message : String(error))
    throw error
  }
}
