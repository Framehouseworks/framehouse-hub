import type { CollectionBeforeChangeHook } from 'payload'

export const generateSlug: CollectionBeforeChangeHook = async ({ data, req, operation, originalDoc }) => {
    if (operation === 'create' || operation === 'update') {
        const title = data.title || originalDoc?.title
        const owner = data.owner || originalDoc?.owner

        if (title && owner) {
            // Extract plain text from rich text title
            let plainTitle = ''
            if (typeof title === 'string') {
                plainTitle = title
            } else if (typeof title === 'object' && title !== null && 'root' in title) {
                const extractText = (node: any): string => {
                    if (node.text) return node.text
                    if (node.children) {
                        return node.children.map(extractText).join('')
                    }
                    return ''
                }
                plainTitle = extractText(title.root)
            } else if (Array.isArray(title)) {
                // Slate fallback
                plainTitle = title.map((n: any) => n.children?.map((c: any) => c.text).join('')).join('')
            }

            // Get user identifier
            const rawUserId = typeof owner === 'object' && owner !== null ? (owner.id || (owner as any)._id) : owner
            const userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : rawUserId

            if (!userId || isNaN(userId as number)) return data

            try {
                const user = await req.payload.findByID({
                    collection: 'users',
                    id: userId,
                })

                if (user && (user.name || user.email)) {
                    const identifier = (user.name || user.email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '-')
                    const slugTitle = plainTitle.toLowerCase()
                        .trim()
                        .replace(/[^\w\s-]/g, '')
                        .replace(/[\s_-]+/g, '-')
                        .replace(/^-+|-+$/g, '')

                    const baseSlug = slugTitle ? `${identifier}-${slugTitle}` : identifier
                    let newSlug = baseSlug

                    // Determine current document ID and cast to number (Postgres)
                    const rawDocId = originalDoc?.id || data?.id
                    const currentId = typeof rawDocId === 'string' ? parseInt(rawDocId, 10) : rawDocId

                    let isUnique = false
                    let count = 0
                    while (!isUnique && count < 10) {
                        const whereClause: any = {
                            slug: {
                                equals: newSlug,
                            },
                        }

                        if (currentId && !isNaN(currentId as number)) {
                            whereClause.id = {
                                not_equals: currentId,
                            }
                        }

                        const existingPortfolios = await req.payload.find({
                            collection: 'portfolios',
                            where: whereClause,
                            limit: 1,
                            pagination: false,
                        })

                        if (existingPortfolios.docs.length === 0) {
                            isUnique = true
                        } else {
                            count++
                            newSlug = `${baseSlug}-${count}`
                        }
                    }

                    data.slug = newSlug
                }
            } catch (err) {
                console.error('Error fetching user for slug generation:', err)
            }
        }
    }

    return data
}
