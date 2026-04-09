'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useScroll, useMotionValueEvent } from 'framer-motion'

type HeaderContextType = {
  isVisible: boolean
  isScrolled: boolean
  headerHeight: number
  isOpaque: boolean
  setIsOpaque: (opaque: boolean) => void
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined)

export const HeaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(80) 
  const [isOpaque, setIsOpaque] = useState(false)
  const { scrollY } = useScroll()
  const [lastScrollY, setLastScrollY] = useState(0)

  /**
   * Kinetic Visibility Logic
   * Hides on scroll down, reveals on scroll up.
   */
  useMotionValueEvent(scrollY, "change", (latest) => {
    const clampedScrollY = Math.max(0, latest)
    const delta = clampedScrollY - lastScrollY
    
    setIsScrolled(clampedScrollY > 50)

    if (clampedScrollY < 50) {
      setIsVisible(true)
    } else {
      if (delta > 0 && clampedScrollY > 200) {
        // Scrolling Down -> Hide
        setIsVisible(false)
      } else if (delta < -10) {
        // Scrolling Up -> Show
        setIsVisible(true)
      }
    }
    setLastScrollY(clampedScrollY)
  })

  /**
   * CSS Variable Sync
   * Injects the dynamic header offset for use in global CSS or sticky components.
   * pt-4 (16px) + h-20 (80px) = 96px base offset.
   */
  useEffect(() => {
    const totalOffset = headerHeight + 16
    document.documentElement.style.setProperty('--header-total-height', `${totalOffset}px`)
  }, [headerHeight])

  return (
    <HeaderContext.Provider value={{ isVisible, isScrolled, headerHeight, isOpaque, setIsOpaque }}>
      {children}
    </HeaderContext.Provider>
  )
}

export const useHeader = () => {
  const context = useContext(HeaderContext)
  if (context === undefined) {
    throw new Error('useHeader must be used within a HeaderProvider')
  }
  return context
}
