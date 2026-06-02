import type { Metadata } from 'next'

import { AccountSettingsShell } from '@/components/account/AccountSettingsShell'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

export default async function AccountPage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect(
      `/login?warning=${encodeURIComponent('Please login to access your account settings.')}`,
    )
  }

  // Resolve the studioLogo relation so the shell gets the full Media object
  const fullUser = await payload.findByID({
    collection: 'users',
    id: user.id,
    depth: 1,
  })

  return <AccountSettingsShell user={fullUser} />
}

export const metadata: Metadata = {
  description: 'Manage your Framehouse Hub account settings, studio identity, and security.',
  openGraph: mergeOpenGraph({
    title: 'Account Settings',
    url: '/account',
  }),
  title: 'Account Settings',
}
