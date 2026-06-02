'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react'
import { toast } from 'sonner'
import { SelectionBar } from './SelectionBar'
import { ClientIdentificationModal } from './ClientIdentificationModal'

export interface ReviewConfig {
  allowSelection: boolean
  allowComments: boolean
  allowDownload: boolean
  requireClientIdentification: boolean
  selectionLimit: number
  downloadQuality: 'proxy' | 'original'
  reviewMessage: string | null
  portfolioSlug: string
  portfolioName: string
  ownerName?: string
}

export interface SelectionEntry {
  mediaId: number
  instanceId: string
}

interface ReviewState {
  config: ReviewConfig
  selections: Map<number, SelectionEntry>
  isSelectionMode: boolean
  isIdentified: boolean
  clientName: string | null
  clientEmail: string | null
  submittedIds: Set<number>
  identModalPending: 'submit' | 'comment' | null
  submissionSuccessMessage: string | null
}

type ReviewAction =
  | { type: 'TOGGLE'; mediaId: number; instanceId: string }
  | { type: 'CLEAR_SELECTIONS' }
  | { type: 'SET_SELECTION_MODE'; on: boolean }
  | { type: 'SET_IDENTIFIED'; name: string; email?: string }
  | { type: 'HYDRATE_SELECTIONS'; entries: SelectionEntry[] }
  | { type: 'MARK_SUBMITTED'; ids: number[]; message: string }
  | { type: 'CLEAR_SUBMISSION_MESSAGE' }
  | { type: 'REQUEST_IDENTIFICATION'; action: 'submit' | 'comment' }
  | { type: 'DISMISS_IDENT_MODAL' }

function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case 'TOGGLE': {
      const next = new Map(state.selections)
      if (next.has(action.mediaId)) {
        next.delete(action.mediaId)
      } else {
        const limit = state.config.selectionLimit
        if (limit > 0 && next.size >= limit) {
          toast.error(`Selection limit reached (${limit}/${limit}). Deselect an item first.`, {
            duration: 3000,
          })
          return state
        }
        next.set(action.mediaId, { mediaId: action.mediaId, instanceId: action.instanceId })
      }
      return { ...state, selections: next }
    }
    case 'CLEAR_SELECTIONS':
      return { ...state, selections: new Map() }
    case 'SET_SELECTION_MODE':
      return { ...state, isSelectionMode: action.on }
    case 'SET_IDENTIFIED':
      return {
        ...state,
        isIdentified: true,
        clientName: action.name,
        clientEmail: action.email ?? null,
        identModalPending: null,
      }
    case 'HYDRATE_SELECTIONS': {
      const next = new Map<number, SelectionEntry>()
      action.entries.forEach((e) => next.set(e.mediaId, e))
      return { ...state, selections: next }
    }
    case 'MARK_SUBMITTED': {
      const next = new Set(state.submittedIds)
      action.ids.forEach((id) => next.add(id))
      return { ...state, submittedIds: next, selections: new Map(), submissionSuccessMessage: action.message }
    }
    case 'CLEAR_SUBMISSION_MESSAGE':
      return { ...state, submissionSuccessMessage: null }
    case 'REQUEST_IDENTIFICATION':
      return { ...state, identModalPending: action.action }
    case 'DISMISS_IDENT_MODAL':
      return { ...state, identModalPending: null }
    default:
      return state
  }
}

interface ReviewContextValue extends ReviewState {
  toggleSelection: (mediaId: number, instanceId: string) => void
  clearSelections: () => void
  setSelectionMode: (on: boolean) => void
  setIdentified: (name: string, email?: string) => void
  markSubmitted: (ids: number[], message: string) => void
  requestIdentification: (action: 'submit' | 'comment') => void
  dismissIdentModal: () => void
}

const ReviewModeContext = createContext<ReviewContextValue | null>(null)

export function useReviewMode(): ReviewContextValue | null {
  return useContext(ReviewModeContext)
}

interface ReviewModeProviderProps {
  config: ReviewConfig
  children: React.ReactNode
}

const PERSIST_DEBOUNCE = 500
const CROSS_TAB_POLL = 30000

export function ReviewModeProvider({ config, children }: ReviewModeProviderProps) {
  const [state, dispatch] = useReducer(reviewReducer, {
    config,
    selections: new Map(),
    isSelectionMode: false,
    isIdentified: false,
    clientName: null,
    clientEmail: null,
    submittedIds: new Set<number>(),
    identModalPending: null,
    submissionSuccessMessage: null,
  })

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPersistRef = useRef<string>('')
  const localStorageKey = `fh_review_sel_${config.portfolioSlug}`

  // ── Hydrate from server on mount ─────────────────────────────────────
  useEffect(() => {
    async function hydrate() {
      try {
        // Ensure session exists
        const sessRes = await fetch(`/api/portfolio-review/${config.portfolioSlug}/session`, {
          method: 'POST',
        })
        if (!sessRes.ok) return

        const sessData = await sessRes.json()
        if (sessData.isIdentified) {
          dispatch({ type: 'SET_IDENTIFIED', name: sessData.clientName, email: sessData.clientEmail ?? undefined })
        }

        // Load selections from server
        const selRes = await fetch(`/api/portfolio-review/${config.portfolioSlug}/session/selections`)
        const selData = await selRes.json()
        const entries: SelectionEntry[] = Array.isArray(selData.selections)
          ? selData.selections.map((s: { mediaId: number; instanceId?: string }) => ({
              mediaId: s.mediaId,
              instanceId: s.instanceId ?? '',
            }))
          : []

        if (entries.length > 0) {
          dispatch({ type: 'HYDRATE_SELECTIONS', entries })
          // Mirror to localStorage
          localStorage.setItem(localStorageKey, JSON.stringify(entries))
        } else {
          // Fall back to localStorage if server has nothing
          const cached = localStorage.getItem(localStorageKey)
          if (cached) {
            try {
              const localEntries: SelectionEntry[] = JSON.parse(cached)
              if (localEntries.length > 0) {
                dispatch({ type: 'HYDRATE_SELECTIONS', entries: localEntries })
              }
            } catch {}
          }
        }
      } catch {}
    }
    hydrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.portfolioSlug])

  // ── Persist selections to server (debounced) ────────────────────────
  useEffect(() => {
    const entries = Array.from(state.selections.values())
    const key = JSON.stringify(entries)
    if (key === lastPersistRef.current) return
    lastPersistRef.current = key

    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(async () => {
      // Mirror to localStorage immediately for offline recovery
      localStorage.setItem(localStorageKey, JSON.stringify(entries))

      try {
        await fetch(`/api/portfolio-review/${config.portfolioSlug}/session/selections`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selections: entries }),
        })
      } catch {}
    }, PERSIST_DEBOUNCE)

    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current)
    }
  }, [state.selections, config.portfolioSlug, localStorageKey])

  // ── Cross-tab sync (poll on tab focus) ──────────────────────────────
  useEffect(() => {
    let lastPoll = 0

    async function pollSelections() {
      const now = Date.now()
      if (now - lastPoll < CROSS_TAB_POLL) return
      lastPoll = now

      try {
        const res = await fetch(`/api/portfolio-review/${config.portfolioSlug}/session/selections`)
        if (!res.ok) return
        const data = await res.json()
        const entries: SelectionEntry[] = Array.isArray(data.selections)
          ? data.selections.map((s: { mediaId: number; instanceId?: string }) => ({
              mediaId: s.mediaId,
              instanceId: s.instanceId ?? '',
            }))
          : []
        // Union merge (server + local)
        const localMap = new Map(state.selections)
        let changed = false
        entries.forEach((e) => {
          if (!localMap.has(e.mediaId)) {
            localMap.set(e.mediaId, e)
            changed = true
          }
        })
        if (changed) {
          dispatch({ type: 'HYDRATE_SELECTIONS', entries: Array.from(localMap.values()) })
          toast.info('Selections updated from another session.', { duration: 3000 })
        }
      } catch {}
    }

    const handleFocus = () => pollSelections()
    document.addEventListener('visibilitychange', handleFocus)
    return () => document.removeEventListener('visibilitychange', handleFocus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.portfolioSlug])

  // ── Add padding when selection bar is visible ───────────────────────
  useEffect(() => {
    const root = document.documentElement
    if (state.selections.size > 0) {
      root.style.setProperty('--review-bar-height', '80px')
    } else {
      root.style.setProperty('--review-bar-height', '0px')
    }
    return () => { root.style.removeProperty('--review-bar-height') }
  }, [state.selections.size])

  const toggleSelection = useCallback((mediaId: number, instanceId: string) => {
    dispatch({ type: 'TOGGLE', mediaId, instanceId })
  }, [])

  const clearSelections = useCallback(() => dispatch({ type: 'CLEAR_SELECTIONS' }), [])
  const setSelectionMode = useCallback((on: boolean) => dispatch({ type: 'SET_SELECTION_MODE', on }), [])
  const setIdentified = useCallback((name: string, email?: string) => dispatch({ type: 'SET_IDENTIFIED', name, email }), [])
  const markSubmitted = useCallback((ids: number[], message: string) => {
    dispatch({ type: 'MARK_SUBMITTED', ids, message })
    setTimeout(() => dispatch({ type: 'CLEAR_SUBMISSION_MESSAGE' }), 4000)
  }, [])
  const requestIdentification = useCallback((action: 'submit' | 'comment') => dispatch({ type: 'REQUEST_IDENTIFICATION', action }), [])
  const dismissIdentModal = useCallback(() => dispatch({ type: 'DISMISS_IDENT_MODAL' }), [])

  const contextValue: ReviewContextValue = {
    ...state,
    toggleSelection,
    clearSelections,
    setSelectionMode,
    setIdentified,
    markSubmitted,
    requestIdentification,
    dismissIdentModal,
  }

  return (
    <ReviewModeContext.Provider value={contextValue}>
      {children}
      {config.allowSelection && <SelectionBar />}
      <ClientIdentificationModal />
    </ReviewModeContext.Provider>
  )
}
