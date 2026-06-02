import type { User } from '@/payload-types'

export type SessionsResponse = {
  sessions: NonNullable<User['sessions']>
  currentSessionId: string | null
}
