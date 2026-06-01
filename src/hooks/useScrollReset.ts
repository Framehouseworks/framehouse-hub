'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Scrolls window to top whenever the pathname changes.
 * Uses 'instant' to avoid visual jank during page transitions.
 */
export function useScrollReset() {
  const pathname = usePathname()
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (prevPathname.current === pathname) return
    prevPathname.current = pathname
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
}
