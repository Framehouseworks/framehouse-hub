'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion'
import { CMSLink } from '@/components/Link'
import { MobileMenu } from './MobileMenu'
import { cn } from '@/utilities/cn'
import { usePathname } from 'next/navigation'
import type { Header } from 'src/payload-types'

import FramehouseLogo from '@/assets/framehouse_logo_expanded_color.svg'
import HubLogo from '@/assets/hub/framehouse_hub_logo_color.svg'

type Props = {
  header: Header
}

export function HeaderClient({ header }: Props) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)
  const { scrollY } = useScroll()
  const [lastScrollY, setLastScrollY] = useState(0)

  // Explicitly follow USER requirement: "visible on scroll down, but when scrolling up it will hide"
  useMotionValueEvent(scrollY, "change", (latest) => {
    const delta = latest - lastScrollY
    setIsScrolled(latest > 50)
    
    // Always visible at the very top
    if (latest < 50) {
      setIsVisible(true)
    } else {
      if (delta > 0) {
        // Scrolling Down -> Visible
        setIsVisible(true)
      } else if (delta < -10) {
        // Scrolling Up -> Hide
        setIsVisible(false)
      }
    }
    setLastScrollY(latest)
  })

  // Fallback menu items if CMS is empty
  const defaultMenu = [
    { id: '1', link: { url: '/product', label: 'Product' } },
    { id: '2', link: { url: '/pricing', label: 'Pricing' } },
    { id: '3', link: { url: '/learn', label: 'Learn' } },
    { id: '4', link: { url: '/company', label: 'Company' } },
  ]
  const menu = (header.navItems && header.navItems.length > 0) ? header.navItems : defaultMenu

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pt-4 px-4 pointer-events-none">
      <motion.header 
        initial={{ y: 0 }}
        animate={{ 
          y: isVisible ? 0 : "-120%",
          width: isScrolled ? "95%" : "100%",
        }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className={cn(
          "mx-auto pointer-events-auto transition-all duration-300",
          "bg-white/80 dark:bg-[#1a1c1cb3] backdrop-blur-[20px]",
          "rounded-[20px] shadow-[0px_20px_40px_rgba(0,0,0,0.06)]",
          "h-16 sm:h-20 flex items-center px-6 sm:px-8",
          !isScrolled && "rounded-t-none"
        )}
      >
        <div className="flex-1 flex items-center justify-between gap-6">
          {/* 1. Branding Lockup (Left) */}
          <Link href="/" className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Image 
              src={FramehouseLogo} 
              alt="Framehouse Logo" 
              className="h-6 sm:h-7 w-auto"
              priority
            />
            <Image 
              src={HubLogo} 
              alt="Framehouse Hub Logo" 
              className="h-4 sm:h-5 w-auto opacity-80"
              priority
            />
          </Link>

          {/* 2. Desktop Navigation (Center) */}
          <nav className="hidden lg:flex items-center justify-center gap-8 flex-1">
            {menu.map((item: any) => (
              <CMSLink
                key={item.id}
                {...item.link}
                size={'clear'}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary whitespace-nowrap',
                  {
                    'text-primary': item.link.url && item.link.url !== '/' ? pathname.includes(item.link.url) : false,
                  }
                )}
              />
            ))}
          </nav>

          {/* 3. RHS Actions (Right) */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-4 md:gap-6">
              <Link 
                href="/login" 
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Login
              </Link>
              <Link 
                href="/demo" 
                className="hidden md:block text-sm font-medium bg-primary text-primary-foreground px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
              >
                Request a Demo
              </Link>
            </div>

            {/* Mobile Navigation Trigger */}
            <div className="lg:hidden">
              <MobileMenu menu={menu as any} />
            </div>
          </div>
        </div>
      </motion.header>
    </div>
  )
}
