import { getPayload } from 'payload'
import config from '@/payload.config'
import { seedHubContent } from '@/seed'
import { headers } from 'next/headers'

export const GET = async () => {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    payload.logger.info('Starting Hub Seeding...')
    await seedHubContent(payload)
    return Response.json({ message: 'Hub content seeded successfully' })
  } catch (error) {
    payload.logger.error(error)
    return new Response('Error seeding hub content', { status: 500 })
  }
}
