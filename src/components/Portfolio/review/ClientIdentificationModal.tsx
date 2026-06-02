'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useReviewMode } from './ReviewModeProvider'

export function ClientIdentificationModal() {
  const review = useReviewMode()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const isOpen = !!(review?.identModalPending)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => nameInputRef.current?.focus(), 80)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') review?.dismissIdentModal() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [isOpen, review])

  if (!review || !mounted) return null

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  function handleEmailBlur() {
    if (email && !emailRegex.test(email)) {
      setEmailError('Please enter a valid email address.')
    } else {
      setEmailError('')
    }
  }

  async function handleContinue() {
    if (!review) return
    const trimmedName = name.trim()
    if (!trimmedName) {
      nameInputRef.current?.focus()
      return
    }
    if (email && !emailRegex.test(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(
        `/api/portfolio-review/${review.config.portfolioSlug}/session/identify`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientName: trimmedName, clientEmail: email || undefined }),
        },
      )
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error === 'INVALID_EMAIL' ? 'Please enter a valid email.' : 'Could not save. Please try again.')
        return
      }

      review.setIdentified(trimmedName, email || undefined)
      setName('')
      setEmail('')
    } catch {
      toast.error('Network error. Please check your connection.')
    } finally {
      setSaving(false)
    }
  }

  function handleSkip() {
    review?.dismissIdentModal()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) handleContinue()
  }

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — above lightbox (z-200), admin overlay (z-150) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] bg-black/70 backdrop-blur-sm"
            onClick={handleSkip}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="id-modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[220] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-[440px] rounded-[24px] p-6 flex flex-col gap-5 pointer-events-auto"
              style={{ background: '#111111', boxShadow: '0px 20px 40px rgba(26,28,28,0.6)' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="id-modal-title"
                    className="text-white text-base font-semibold"
                  >
                    Tell us who you are
                  </h2>
                  <p className="text-white/40 text-xs mt-1 leading-relaxed">
                    {review.config.ownerName
                      ? `We need your name before sending your selection to ${review.config.ownerName}.`
                      : 'We need your name before submitting your selection.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Fields */}
              <div className="flex flex-col gap-3">
                <div>
                  <label htmlFor="id-modal-name" className="block text-white/40 text-[10px] uppercase tracking-[0.2em] mb-1.5" style={{ fontFamily: "'Rubik Mono One', monospace" }}>
                    Your name *
                  </label>
                  <input
                    id="id-modal-name"
                    ref={nameInputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. Jane Smith"
                    autoComplete="name"
                    required
                    className="w-full bg-white/6 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 border border-transparent focus:border-[#d79922]/40 focus:outline-none"
                    aria-required="true"
                  />
                </div>

                <div>
                  <label htmlFor="id-modal-email" className="block text-white/40 text-[10px] uppercase tracking-[0.2em] mb-1.5" style={{ fontFamily: "'Rubik Mono One', monospace" }}>
                    Email <span className="text-white/20 normal-case tracking-normal">(optional)</span>
                  </label>
                  <input
                    id="id-modal-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
                    onBlur={handleEmailBlur}
                    onKeyDown={handleKeyDown}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className="w-full bg-white/6 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 border border-transparent focus:border-[#d79922]/40 focus:outline-none"
                  />
                  {emailError && (
                    <p className="text-[#bb1800] text-xs mt-1" role="alert">{emailError}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={saving || !name.trim()}
                  className="w-full h-12 rounded-[24px] flex items-center justify-center gap-2 text-sm text-[#1a1c1c] font-medium transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d79922]"
                  style={{ background: 'linear-gradient(135deg, #d79922, #7f5700)' }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Continue →'}
                </button>

                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-xs text-white/30 hover:text-white/50 transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded-lg"
                >
                  Skip for now — view only
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(modal, document.body)
}
