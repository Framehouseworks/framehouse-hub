import type { Metadata } from 'next'
import React from 'react'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { Varela_Round, Rubik_Mono_One } from 'next/font/google'
import { cn } from '@/utilities/cn'

import '@/app/(app)/globals.css'

const varela = Varela_Round({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-varela',
})

const rubik = Rubik_Mono_One({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-rubik',
})

import { headers as getHeaders } from 'next/headers'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { redirect } from 'next/navigation'

export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect(
      '/login?warning=' + encodeURIComponent('You must be logged in to access the dashboard.'),
    )
  }

  return (
    <html
      className={cn(GeistSans.variable, GeistMono.variable, varela.variable, rubik.variable)}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body className="bg-background text-foreground transition-colors duration-300">
        <Providers>
          <LivePreviewListener />
          {children}
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'),
  description: 'Framehouse Hub - Creative Dashboard.',
  robots: 'noindex, nofollow',
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    creator: '@framehouse',
  },
}
