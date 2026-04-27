import { getPayload } from 'payload'
import config from '@/payload.config'
import { seedHubContent } from '@/seed'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

export const GET = async (req: Request) => {
  const payload = await getPayload({ config })

  // 1. Check for Session Auth
  const { user } = await payload.auth({ headers: await headers() })

  // 2. Check for Secret Auth (The "Master Key" for remote initialization)
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  const isValidSecret = secret && secret === process.env.SEED_SECRET

  if (!user && !isValidSecret) {
    payload.logger.warn('Unauthorized seeding attempt blocked.')
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    payload.logger.info('Starting Hub Seeding...')
    await seedHubContent(payload)

    // Force revalidate to ensure 404s become 200s immediately
    revalidatePath('/')

    return Response.json({ message: 'Hub content seeded successfully' })
  } catch (error) {
    payload.logger.error(error)
    return new Response('Error seeding hub content', { status: 500 })
  }
}
