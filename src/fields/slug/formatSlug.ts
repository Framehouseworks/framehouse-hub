import type { FieldHook } from 'payload'

export const formatSlug =
    (fallback: string): FieldHook =>
        ({ data, operation, value }) => {
            if (typeof value === 'string') {
                return value
                    .replace(/ /g, '-')
                    .replace(/[^\w-]+/g, '')
                    .toLowerCase()
            }

            if (operation === 'create' || !value) {
                const fallbackData = data?.[fallback] || data?.[fallback]

                if (fallbackData && typeof fallbackData === 'string') {
                    return fallbackData
                        .replace(/ /g, '-')
                        .replace(/[^\w-]+/g, '')
                        .toLowerCase()
                }
            }

            return value
        }
