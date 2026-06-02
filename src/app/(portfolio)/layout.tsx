import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { cn } from '@/utilities/cn'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { Inter, Rubik_Mono_One, Varela_Round } from 'next/font/google'
import { Toaster } from 'sonner'

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

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

/**
 * Standalone layout for the portfolio public viewer.
 * No site Header, Footer, AdminBar, or theme provider — the portfolio
 * page controls its own visual identity via CSS custom properties.
 */
export default function PortfolioViewerLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={cn(
        GeistSans.variable,
        GeistMono.variable,
        varela.variable,
        rubik.variable,
        inter.variable,
      )}
      lang="en"
      // globals.css sets html{opacity:0} and only restores when data-theme is set
      // by InitTheme (which is not present in this standalone layout). We fix with
      // a static dark value — the portfolio viewer controls its own visual identity.
      data-theme="dark"
      suppressHydrationWarning
    >
      <head>
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>
        {children}
        {/* Sonner toaster for download shield notifications */}
        <Toaster position="bottom-right" richColors={false} />
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'https://hub.framehouseworks.com'),
}
