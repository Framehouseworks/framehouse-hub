'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Globe, Moon, Sun, Github, Twitter, Linkedin } from 'lucide-react'
import { CMSLink } from '@/components/Link'
import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
import { cn } from '@/utilities/cn'
import type { Footer as FooterType } from '@/payload-types'

interface Props {
  footer: FooterType
}

import { GutterContainer } from '@/components/layout/GutterContainer'

export function FooterClient({ footer }: Props) {
  const currentYear = new Date().getFullYear()
  const menu = footer.navItems || []

  // Group links by a simple heuristic (actual categories would come from Payload if defined)
  // For now, we'll split the existing items into two columns
  const column1 = menu.slice(0, Math.ceil(menu.length / 2))
  const column2 = menu.slice(Math.ceil(menu.length / 2))

  return (
    <footer aria-label="Site Footer" className="relative z-10">
      {/* GALLERY_REF: Tonal Shift Separation */}
      <div className="bg-muted/30 dark:bg-card/20 py-20">
        <GutterContainer>
          {/* Main Discovery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            
            {/* Column 1: Brand & Discovery */}
            <div className="flex flex-col gap-6">
              <Link href="/" className="font-varela text-xl tracking-tight hover:opacity-80 transition-opacity">
                Framehouse<span className="text-primary font-bold">Hub</span>
              </Link>
              <p className="text-sm text-neutral-500 max-w-xs leading-relaxed">
                The high-end editorial stage for your digital assets. Built for creatives who demand museum-grade precision.
              </p>
              <div className="flex items-center gap-4 mt-2">
                <SocialLink href="#" icon={<Twitter className="w-4 h-4" />} />
                <SocialLink href="#" icon={<Github className="w-4 h-4" />} />
                <SocialLink href="#" icon={<Linkedin className="w-4 h-4" />} />
              </div>
            </div>

            {/* Column 2: Product (Mobile Accordion) */}
            <FooterNavColumn title="Capabilities" items={column1} />

            {/* Column 3: Resources (Mobile Accordion) */}
            <FooterNavColumn title="Resources" items={column2} />

            {/* Column 4: Final CTA / Newsletter */}
            <div className="flex flex-col gap-6">
              <span className="font-rubik text-[10px] tracking-[0.2em] uppercase text-neutral-400">
                Discovery Signal
              </span>
              <div className="flex flex-col gap-4">
                <h4 className="text-lg font-medium">Join the Curated List</h4>
                <p className="text-sm text-neutral-500">Weekly insights into asset management & design excellence.</p>
                <div className="relative group mt-2">
                  <input 
                    type="email" 
                    placeholder="Email address"
                    className={cn(
                      "w-full px-4 py-3 text-sm focus:outline-none transition-all outline-none",
                      "bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md", // GALLERY_REF: Glassmorphic Input
                      "rounded-[16px] border border-neutral-200/50 dark:border-neutral-800/50", // GALLERY_REF: ROUND_SIXTEEN
                      "focus:ring-2 focus:ring-primary/20 focus:border-primary/30",
                      "shadow-[0px_2px_4px_rgba(0,0,0,0.02)] group-hover:shadow-[0px_4px_12px_rgba(0,0,0,0.04)]" // GALLERY_REF: Ambient Shadow
                    )}
                  />
                  <button className="absolute right-2 top-1.5 px-4 py-1.5 text-[10px] font-rubik uppercase bg-primary text-white rounded-[12px] hover:opacity-90 transition-opacity">
                    Join
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Utility Box: Theme & Language */}
          <div className="mt-20 pt-12 flex flex-col sm:flex-row items-center justify-between gap-8 bg-muted/20 dark:bg-card/30 rounded-[24px] p-8 sm:p-12 transition-colors"> {/* GALLERY_REF: ROUND_TWENTY_FOUR */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-[10px] font-rubik tracking-widest uppercase opacity-40 hover:opacity-100 transition-opacity cursor-default">
                <Globe className="w-3 h-3" />
                <span>Global / EN</span>
              </div>
              <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
              <ThemeSelector />
            </div>

            <div className="flex items-center gap-6 text-[10px] font-rubik tracking-widest uppercase opacity-40">
              <div className="hidden md:flex items-center gap-2 group cursor-default">
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full group-hover:bg-primary transition-colors" />
                <span className="group-hover:text-foreground transition-colors">Designed in Michigan</span>
              </div>
              <span>© {currentYear} Framehouse Hub</span>
              <div className="flex items-center gap-4">
                <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
                <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
              </div>
            </div>
          </div>
        </GutterContainer>
      </div>
    </footer>
  )
}

function FooterNavColumn({ title, items }: { title: string, items: any[] }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4 md:gap-6 group/col">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full md:cursor-default"
      >
        <h4 className="font-rubik text-[10px] tracking-[0.2em] uppercase text-neutral-400 group-hover/col:text-primary transition-colors">
          {title}
        </h4>
        <div className={cn(
          "md:hidden p-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 transition-colors",
          isOpen && "bg-primary/10 text-primary"
        )}>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-300", isOpen && "rotate-180")} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {(isOpen || typeof window !== 'undefined' && window.innerWidth >= 768) && (
          <motion.ul 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }} // GALLERY_REF: Editorial Ease
            className="flex flex-col gap-3.5 overflow-hidden"
          >
            {items.map((item) => (
              <li key={item.id}>
                <CMSLink 
                  {...item.link} 
                  appearance="link" 
                  className="text-sm text-neutral-500 hover:text-primary transition-colors whitespace-nowrap"
                />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
      
      {/* Desktop fallback list (since AnimatePresence/window check can be tricky on SSR) */}
      <ul className="hidden md:flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <CMSLink 
              {...item.link} 
              appearance="link" 
              className="text-sm text-neutral-500 hover:text-primary transition-colors whitespace-nowrap"
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function SocialLink({ href, icon }: { href: string; icon: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className="p-2 bg-white dark:bg-neutral-900 rounded-full text-neutral-400 hover:text-primary hover:shadow-md transition-all border border-transparent hover:border-primary/10"
    >
      {icon}
    </Link>
  )
}
