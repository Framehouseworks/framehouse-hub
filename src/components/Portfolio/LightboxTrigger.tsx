'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import React, { useEffect, useState } from 'react'

interface LightboxTriggerProps {
  src: string
  alt: string
  children: React.ReactNode
  className?: string
}

/**
 * Self-contained lightbox trigger for simple src/alt image contexts.
 * Does not depend on the Media-typed Lightbox component.
 * Used by LightboxTrigger.tsx — kept separate from the main Lightbox.tsx.
 */
function SimpleLightbox({ src, alt, open, onClose }: { src: string; alt: string; open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`Fullscreen view of ${alt}`}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-2"
            aria-label="Close fullscreen view"
          >
            <X size={32} strokeWidth={1.5} />
          </button>
          <motion.img
            src={src}
            alt={alt}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="max-w-[90vw] max-h-[90vh] object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Thin client wrapper that adds lightbox behaviour to any static child element.
 * Used by UniformGrid (or any server-renderable component) to avoid making the
 * whole parent a client component.
 */
export function LightboxTrigger({ src, alt, children, className }: LightboxTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        aria-label={`View ${alt} in fullscreen`}
      >
        {children}
      </button>
      <SimpleLightbox src={src} alt={alt} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
