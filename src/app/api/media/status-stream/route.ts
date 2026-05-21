import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { processingEvents, type ProcessingEvent } from '@/lib/processing-events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const url = new URL(req.url)
  const mediaIdsParam = url.searchParams.get('mediaIds')
  const mediaIds = mediaIdsParam ? mediaIdsParam.split(',').filter(Boolean) : []

  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | null = null
  let pingInterval: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch {
          // Stream closed
        }
      }

      const listener = (event: ProcessingEvent) => {
        send(JSON.stringify(event))
      }

      if (mediaIds.length > 0) {
        unsubscribe = processingEvents.subscribe(mediaIds, listener)
      } else {
        processingEvents.on('status:*', listener)
        unsubscribe = () => processingEvents.removeListener('status:*', listener)
      }

      pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          // Stream closed
        }
      }, 30_000)

      send(JSON.stringify({ type: 'connected', mediaIds }))
    },
    cancel() {
      unsubscribe?.()
      if (pingInterval) clearInterval(pingInterval)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
