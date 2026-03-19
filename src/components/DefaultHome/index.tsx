'use client'
import React, { useEffect } from 'react'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const DefaultHome = () => {
  const { setHeaderTheme } = useHeaderTheme()

  useEffect(() => {
    setHeaderTheme('dark')
  }, [setHeaderTheme])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section 
        className="relative -mt-[10.4rem] h-screen flex items-center justify-center bg-black text-white px-8"
        data-theme="dark"
      >
        <div className="max-w-5xl text-center z-10 pt-32">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
            We merge sound and vision—delivering media that moves, inspires, and dominates every frame and beat.
          </h1>
        </div>
      </section>

      {/* Descriptive Sections */}
      <section className="py-24 md:py-40 container bg-background text-foreground">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-24">
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-xs font-bold uppercase tracking-[0.4em] text-neutral-400 dark:text-neutral-500">01. Sound</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pt-6">
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-lg font-normal">
                Precision audio engineering that captures every nuance. From crisp location recording to immersive sound design and mastering, we ensure your message is heard with clinical clarity and emotional depth.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-xs font-bold uppercase tracking-[0.4em] text-neutral-400 dark:text-neutral-500">02. Vision</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pt-6">
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-lg font-normal">
                Cinematic visual storytelling that commands attention. High-resolution imagery, expert lighting, and dynamic editing converge to create visuals that don&apos;t just show—they tell.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-xs font-bold uppercase tracking-[0.4em] text-neutral-400 dark:text-neutral-500">03. Domination</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pt-6">
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-lg font-normal">
                The synthesis of audio and visual excellence. Creating media that doesn&apos;t just exist—it dominates the frame and the frequency. We deliver the impact your brand requires to stand out in a saturated landscape.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
