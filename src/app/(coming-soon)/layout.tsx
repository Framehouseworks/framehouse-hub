import type { ReactNode } from 'react'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { Rubik_Mono_One, Varela_Round } from 'next/font/google'
import '@/app/(app)/globals.css'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import type { Metadata } from 'next'

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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'https://hub.framehouseworks.com'),
  openGraph: mergeOpenGraph(),
}

export default function ComingSoonLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={[GeistSans.variable, GeistMono.variable, varela.variable, rubik.variable]
        .filter(Boolean)
        .join(' ')}
      lang="en"
      data-theme="light"
    >
      <head>
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body className="bg-white text-[#1a1c1c] antialiased">{children}</body>
    </html>
  )
}
