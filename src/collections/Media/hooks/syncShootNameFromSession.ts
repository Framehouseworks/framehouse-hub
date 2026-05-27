import type { CollectionBeforeChangeHook } from 'payload'

export const syncShootNameFromSession: CollectionBeforeChangeHook = async ({
  data,
  req,
  originalDoc,
}) => {
  const sessionId = data?.session ?? originalDoc?.session
  if (!sessionId) return data

  try {
    const session = await req.payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: 'sessions' as any,
      id: typeof sessionId === 'object' ? sessionId.id : sessionId,
      depth: 0,
    })
    if (session?.name) {
      data.shootName = session.name
    }
  } catch {
    // session may not exist yet — leave shootName unchanged
  }

  return data
}
