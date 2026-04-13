'use client'
import { CMSLink } from '@/components/Link'
import { cn } from '@/utilities/cn'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Header } from 'src/payload-types'

interface Props {
  menu: Header['navItems']
}

export function MobileMenu({ menu }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on resize if desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) { // Matches lg breakpoint
        setIsOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const menuContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-white dark:bg-[#1a1c1c] flex flex-col overflow-y-auto"
        >
          {/* Main Overlay Container */}
          <div className="relative min-h-screen flex flex-col items-center justify-center p-8">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-8 right-8 p-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-[16px]"
              aria-label="Close Menu"
            >
              <X className="w-8 h-8" />
            </button>
 
            {/* Navigation Links */}
            <nav className="flex flex-col items-center gap-6 sm:gap-8 my-auto w-full px-6">
              {menu?.map((item, i) => (
                <MobileNavItem 
                  key={item.id} 
                  item={item as any} 
                  index={i} 
                  onClose={() => setIsOpen(false)} 
                />
              ))}
 
              {/* Mobile RHS Actions */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (menu?.length || 0) * 0.1 }}
                className="flex flex-col items-center gap-6 mt-12"
              >
                <Link
                  href="/login"
                  className="text-xl font-medium hover:text-primary transition-colors rounded-[16px] border border-black/10 dark:border-white/10 hover:border-primary/30 py-4 px-10"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/demo"
                  className="text-lg font-medium bg-primary text-primary-foreground px-8 py-4 rounded-[16px]"
                  onClick={() => setIsOpen(false)}
                >
                  Request a Demo
                </Link>
              </motion.div>
            </nav>
 
            {/* Museum Footer Information */}
            <div className="mt-auto pt-16 flex flex-col items-center gap-4">
              <div className="h-px w-16 bg-neutral-200 dark:bg-neutral-800" />
              <span className="font-rubik text-[12px] tracking-[0.6em] uppercase opacity-30">
                Framehouse Hub
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
 
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg pointer-events-auto"
        aria-label="Open Menu"
      >
        <Menu className="w-6 h-6" />
      </button>
 
      {(mounted && typeof document !== 'undefined') ? createPortal(menuContent, document.body) : null}
    </>
  )
}

function MobileNavItem({ item, index, onClose }: { item: any; index: number; onClose: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (item.group) {
    return (
      <div className="w-full flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.1 + index * 0.1,
            ease: [0.23, 1, 0.32, 1]
          }}
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-4 cursor-pointer group"
        >
          <span className={cn(
            "text-4xl sm:text-6xl md:text-7xl font-rubik tracking-tighter uppercase transition-all duration-300",
            "group-hover:text-primary",
            isExpanded ? "text-primary" : "text-neutral-900 dark:text-white"
          )}>
            {item.menuTitle}
          </span>
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="text-primary"
          >
            <ChevronDown size={32} strokeWidth={2.5} />
          </motion.span>
        </motion.div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden flex flex-col items-center gap-4 mt-6"
            >
              {item.subItems?.map((subItem: any, si: number) => (
                <motion.div
                  key={subItem.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: si * 0.05 }}
                  onClick={onClose}
                >
                  <CMSLink
                    {...subItem.link}
                    size={'clear'}
                    className={cn(
                      "text-2xl sm:text-4xl font-rubik tracking-tighter uppercase transition-all duration-300",
                      "text-neutral-400 dark:text-neutral-500 hover:text-primary"
                    )}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.1 + index * 0.1,
        ease: [0.23, 1, 0.32, 1]
      }}
      onClick={onClose}
    >
      <CMSLink
        {...item.link}
        size={'clear'}
        className={cn(
          "text-4xl sm:text-6xl md:text-7xl font-rubik tracking-tighter uppercase transition-all duration-300",
          "hover:text-primary hover:tracking-normal",
          "text-neutral-900 dark:text-white"
        )}
      />
    </motion.div>
  )
}
