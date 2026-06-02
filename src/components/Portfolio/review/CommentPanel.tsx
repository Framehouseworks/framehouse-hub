'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquare, Send, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utilities/cn'
import { useReviewMode } from './ReviewModeProvider'

interface Comment {
  id: number
  clientName: string
  body: string
  createdAt: string
}

interface CommentPanelProps {
  mediaId: number | null
  isMobile: boolean
  isOpen: boolean
  onClose?: () => void
}

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(dateStr).toLocaleDateString()
}

export function CommentPanel({ mediaId, isMobile, isOpen, onClose }: CommentPanelProps) {
  const review = useReviewMode()
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [savedIndicator, setSavedIndicator] = useState(false)
  const listEndRef = useRef<HTMLDivElement>(null)
  const MAX_BODY = 2000

  const fetchComments = useCallback(async () => {
    if (!review || !mediaId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/portfolio-review/${review.config.portfolioSlug}/comments/${mediaId}`,
      )
      const data = await res.json()
      if (res.ok) setComments(data.comments ?? [])
    } catch {}
    finally { setLoading(false) }
  }, [mediaId, review])

  useEffect(() => {
    if (mediaId && review?.config.allowComments) {
      setComments([])
      fetchComments()
    }
  }, [mediaId, fetchComments, review])

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  async function handlePost() {
    if (!review || !mediaId) return
    const trimmed = body.trim()
    if (!trimmed) return

    if (review.config.requireClientIdentification && !review.isIdentified) {
      review.requestIdentification('comment')
      return
    }

    setPosting(true)
    const optimisticComment: Comment = {
      id: Date.now(),
      clientName: review.clientName || 'You',
      body: trimmed,
      createdAt: new Date().toISOString(),
    }
    setComments((prev) => [...prev, optimisticComment])
    setBody('')

    try {
      const res = await fetch(
        `/api/portfolio-review/${review.config.portfolioSlug}/comments/${mediaId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: trimmed }),
        },
      )
      const data = await res.json()

      if (!res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id))
        if (data.error === 'IDENTIFICATION_REQUIRED') {
          review.requestIdentification('comment')
        } else if (data.error === 'RATE_LIMIT_EXCEEDED') {
          toast.error('You\'ve reached the comment limit for today.')
        } else if (data.error === 'COMMENT_EMPTY') {
          toast.error('Comment cannot be empty.')
        } else {
          toast.error('Could not post comment. Please try again.')
        }
        setBody(trimmed)
        return
      }

      // Replace optimistic comment with server response
      setComments((prev) =>
        prev.map((c) =>
          c.id === optimisticComment.id
            ? { ...data.comment, clientName: data.comment.clientName || review.clientName || 'You' }
            : c,
        ),
      )
      setSavedIndicator(true)
      setTimeout(() => setSavedIndicator(false), 2500)
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id))
      toast.error('Network error. Please check your connection.')
      setBody(trimmed)
    } finally {
      setPosting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost()
  }

  if (!review?.config.allowComments) return null

  const panelContent = (
    <div
      role="complementary"
      aria-label="Asset comments"
      className="flex flex-col h-full"
      style={{ background: '#111111' }}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-white/6">
        <div className="flex items-center gap-2">
          <MessageSquare size={13} className="text-white/40" />
          <span className="text-white/60 text-xs font-medium uppercase tracking-wider" style={{ fontFamily: "'Rubik Mono One', monospace" }}>
            Notes
          </span>
          {comments.length > 0 && (
            <span className="text-[10px] text-white/30">({comments.length})</span>
          )}
        </div>
        {isMobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            aria-label="Close comments"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0" role="list" aria-label="Comments list">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-white/20" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-white/25 text-xs text-center py-8 leading-relaxed">
            No notes yet.<br />Be the first to leave a note.
          </p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} role="listitem" className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/70 text-[11px] font-medium truncate max-w-[120px]">
                    {c.clientName}
                  </span>
                  <time
                    dateTime={c.createdAt}
                    className="text-white/25 text-[10px] flex-shrink-0"
                    style={{ fontFamily: "'Rubik Mono One', monospace" }}
                  >
                    {formatTime(c.createdAt)}
                  </time>
                </div>
                <p className="text-white/60 text-xs leading-relaxed whitespace-pre-wrap break-words">
                  {c.body}
                </p>
              </li>
            ))}
          </ul>
        )}
        <div ref={listEndRef} />
      </div>

      {/* Composer */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/6">
        <div className="relative">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
            onKeyDown={handleKeyDown}
            placeholder="Add a note… (⌘↵ to submit)"
            rows={2}
            aria-label="Write a note"
            className="w-full bg-white/6 rounded-2xl px-3 py-2.5 pr-10 text-xs text-white placeholder:text-white/25 border border-transparent focus:border-[#d79922]/40 focus:outline-none resize-none"
          />
          <button
            type="button"
            onClick={handlePost}
            disabled={posting || !body.trim()}
            aria-label="Post comment"
            className={cn(
              'absolute right-2 bottom-2 w-7 h-7 rounded-full flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d79922]',
              body.trim()
                ? 'bg-[#d79922] text-[#1a1c1c] hover:bg-[#c4871e]'
                : 'bg-white/8 text-white/20 cursor-not-allowed',
            )}
          >
            {posting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <AnimatePresence>
            {savedIndicator && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[10px] text-emerald-400"
                role="status"
              >
                Comment saved ✓
              </motion.span>
            )}
          </AnimatePresence>
          <span className="text-[9px] text-white/20 ml-auto">{body.length}/{MAX_BODY}</span>
        </div>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="absolute bottom-0 left-0 right-0 z-30 rounded-t-[24px] overflow-hidden"
            style={{ height: '60%' }}
          >
            {panelContent}
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <div className="w-[280px] flex-shrink-0 border-l border-white/6 overflow-hidden">
      {panelContent}
    </div>
  )
}
