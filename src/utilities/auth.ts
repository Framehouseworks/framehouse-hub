import type { User } from '@/payload-types'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

/**
 * Server-side auth utility for Next.js App Router
 * Returns the currently logged in user or null.
 */
export const auth = async (): Promise<User | null> => {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })

    return user || null
}
