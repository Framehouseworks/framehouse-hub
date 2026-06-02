'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utilities/cn'
import { Button } from '@/components/ui/button'
import {
  createDraftPortfolioAction,
  savePortfolioDraftAction,
  publishPortfolioAction,
  fetchMediaByIdsAction,
  fetchPortfolioByIdAction,
} from '@/app/(dashboard)/actions/portfolios'
import type { WizardState, WizardGridItem } from '../types'
import {
  DEFAULT_WIZARD_STATE,
  plainTextToLexical,
  itemsToLayoutBlocks,
  sectionsToLayoutBlocks,
  hydrateServerSections,
  extractRichTextPlain,
} from '../types'
import type { Media, Portfolio } from '@/payload-types'
import { WizardStepMetadata } from './WizardStepMetadata'
import { WizardStepAssetTray } from './WizardStepAssetTray'
import { WizardStepSectionLayout } from './WizardStepSectionLayout'
import { WizardStepOverrides } from './WizardStepOverrides'
import { WizardStepTheme } from './WizardStepTheme'
import { WizardStepShare } from './WizardStepShare'

const STEPS = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Assets' },
  { id: 3, label: 'Layout' },
  { id: 4, label: 'Overrides' },
  { id: 5, label: 'Theme' },
  { id: 6, label: 'Publish' },
] as const

const AUTOSAVE_DELAY = 3000

interface Props {
  preloadedAssetIds?: number[]
  resumePortfolioId?: number
}

function slugifyPreview(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function PortfolioWizardPage({ preloadedAssetIds = [], resumePortfolioId }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [state, setState] = useState<WizardState>(DEFAULT_WIZARD_STATE)
  const [slug, setSlug] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [previewUsed, setPreviewUsed] = useState(false)
  const [initDone, setInitDone] = useState(false)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const publishedRef = useRef(false) // once true, autosave is permanently blocked
  const lastSavedHashRef = useRef<string>('')

  // Persist step in localStorage (UI state only)
  useEffect(() => {
    if (state.portfolioId) {
      localStorage.setItem(`wizard_step_${state.portfolioId}`, String(step))
    }
  }, [step, state.portfolioId])

  // Preload assets from URL params
  useEffect(() => {
    if (preloadedAssetIds.length === 0 || initDone) return

    async function preload() {
      const result = await fetchMediaByIdsAction(preloadedAssetIds)
      if (!result.success || !result.data) return

      const items: WizardGridItem[] = result.data.map((media: Media) => ({
        instanceId: crypto.randomUUID(),
        media,
        size: 'medium' as const,
      }))

      if (items.length > 0) {
        setState((s) => ({ ...s, items }))
      }
    }

    preload()
    setInitDone(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadedAssetIds])

  // Resume a draft portfolio from editor redirect
  useEffect(() => {
    if (!resumePortfolioId || initDone) return
    async function resume() {
      const result = await fetchPortfolioByIdAction(resumePortfolioId!)
      if (!result.success || !result.data) return
      const portfolio = result.data as Portfolio & { _status?: string }
      const blocks = portfolio.layoutBlocks ?? []
      const hasSections = blocks.some((b) => b.blockType === 'grid')
      const sections = hasSections ? hydrateServerSections(blocks) : []
      const savedStep = localStorage.getItem(`wizard_step_${resumePortfolioId}`)
      const stepToRestore = savedStep ? Math.min(Number(savedStep), STEPS.length) : 1
      setState({
        portfolioId: portfolio.id,
        name: portfolio.name || '',
        title: extractRichTextPlain(portfolio.title) || portfolio.name || '',
        subtitle: extractRichTextPlain(portfolio.subheading) || '',
        description: '',
        items: [],
        sections,
        sectionMode: hasSections,
        layoutSpacing: 'medium',
        theme: {
          fontPairing: portfolio.theme?.fontPairing || 'modern-sans',
          backgroundColor: portfolio.theme?.backgroundColor || '#000000',
          textColor: portfolio.theme?.textColor || '#ffffff',
          accentColor: portfolio.theme?.accentColor || '#ffffff',
        },
        visibility: portfolio.visibility || 'private',
        password: portfolio.password || undefined,
        clientReviewSettings: {
          allowSelection: portfolio.clientReviewSettings?.allowSelection ?? false,
          allowComments: portfolio.clientReviewSettings?.allowComments ?? false,
          allowDownload: portfolio.clientReviewSettings?.allowDownload ?? false,
          requireClientIdentification: portfolio.clientReviewSettings?.requireClientIdentification ?? false,
          selectionLimit: portfolio.clientReviewSettings?.selectionLimit ?? 0,
          downloadQuality: (portfolio.clientReviewSettings?.downloadQuality as 'proxy' | 'original') ?? 'proxy',
          reviewMessage: portfolio.clientReviewSettings?.reviewMessage ?? '',
        },
      })
      if (portfolio.slug) setSlug(portfolio.slug)
      setStep(stepToRestore)
    }
    resume()
    setInitDone(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumePortfolioId])

  function updateState(patch: Partial<WizardState>) {
    setState((s) => {
      const next = { ...s, ...patch }
      scheduleAutosave(next)
      return next
    })
  }

  function scheduleAutosave(nextState: WizardState) {
    if (!nextState.portfolioId) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => performAutosave(nextState), AUTOSAVE_DELAY)
  }

  const performAutosave = useCallback(async (s: WizardState) => {
    if (!s.portfolioId || savingRef.current || publishedRef.current) return
    // Enterprise: skip save if payload is identical to last saved state (Issue 8)
    const payload = buildPayloadData(s)
    const hash = JSON.stringify(payload)
    if (hash === lastSavedHashRef.current) return
    savingRef.current = true
    setSaving(true)
    const result = await savePortfolioDraftAction(s.portfolioId, payload)
    lastSavedHashRef.current = hash
    // Always sync slug from server (slug regenerates on title change)
    if (result.success && result.data?.slug) {
      setSlug(result.data.slug)
    }
    savingRef.current = false
    setSaving(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function buildPayloadData(s: WizardState): Partial<Portfolio> {
    const layoutBlocks =
      s.sectionMode && s.sections.length > 0
        ? sectionsToLayoutBlocks(s.sections, s.layoutSpacing)
        : itemsToLayoutBlocks(s.items, s.layoutSpacing)

    return {
      name: s.name || s.title || 'Untitled Portfolio',
      title: s.title ? plainTextToLexical(s.title) : undefined,
      subheading: s.subtitle ? plainTextToLexical(s.subtitle) : undefined,
      visibility: s.visibility,
      password: s.visibility === 'shared' ? s.password : undefined,
      theme: s.theme,
      layoutBlocks,
      clientReviewSettings: {
        allowSelection: s.clientReviewSettings.allowSelection,
        allowComments: s.clientReviewSettings.allowComments,
        allowDownload: s.clientReviewSettings.allowDownload,
        requireClientIdentification: s.clientReviewSettings.requireClientIdentification,
        selectionLimit: s.clientReviewSettings.selectionLimit,
        downloadQuality: s.clientReviewSettings.downloadQuality,
        reviewMessage: s.clientReviewSettings.reviewMessage || null,
      },
    } as Partial<Portfolio>
  }

  async function ensurePortfolioCreated(s: WizardState): Promise<number | null> {
    if (s.portfolioId) return s.portfolioId
    const name = s.title || s.name || 'Untitled Portfolio'
    const result = await createDraftPortfolioAction(name)
    if (!result.success || !result.data) {
      toast.error('Could not create draft: ' + result.message)
      return null
    }
    const id = result.data.id
    const serverSlug = result.data.slug
    setState((prev) => ({ ...prev, portfolioId: id }))
    if (serverSlug) setSlug(serverSlug)
    return id
  }

  async function goNext() {
    if (step === 1) {
      if (!state.title.trim()) {
        toast.error('Please enter a portfolio title.')
        return
      }
      if (!state.portfolioId) {
        const id = await ensurePortfolioCreated(state)
        if (!id) return
        await savePortfolioDraftAction(id, buildPayloadData({ ...state, portfolioId: id }))
      }
    }

    if (step === 2 && state.items.length === 0) {
      toast.error('Add at least one asset before continuing.')
      return
    }

    if (step === 3) {
      // Validate sections
      const hasAssets = state.sections.some((s) => s.items.length > 0)
      if (!hasAssets) {
        toast.error('Add assets to at least one section before continuing.')
        return
      }
      const emptySections = state.sections.filter((s) => s.items.length === 0)
      if (emptySections.length > 0) {
        toast.info(`${emptySections.length} empty section${emptySections.length > 1 ? 's' : ''} will be hidden from clients.`)
      }
    }

    if (step < STEPS.length) setStep((s) => s + 1)
  }

  function goBack() {
    if (step > 1) setStep((s) => s - 1)
  }

  async function handlePublish() {
    // 1. Cancel any queued autosave timer
    if (autosaveTimer.current) { clearTimeout(autosaveTimer.current); autosaveTimer.current = null }

    // 2. Wait for any in-flight autosave to finish — prevents the race where
    //    performAutosave completes AFTER publishPortfolioAction and creates a
    //    draft version that shadows the published state in draft:true queries.
    const raceDeadline = Date.now() + 3000
    while (savingRef.current && Date.now() < raceDeadline) {
      await new Promise((r) => setTimeout(r, 50))
    }
    if (savingRef.current) {
      toast.error('Still saving — please try again in a moment.')
      return
    }
    publishedRef.current = true // block all subsequent autosaves permanently

    const id = await ensurePortfolioCreated(state)
    if (!id) return

    setPublishing(true)
    const result = await publishPortfolioAction(id, { ...buildPayloadData(state) })
    setPublishing(false)

    if (result.success && result.data) {
      const pub = result.data as Portfolio
      setSlug(pub.slug ?? slug)
      toast.success(`Portfolio live at /p/${pub.slug}`)
      // Navigate to list so fresh fetch shows updated published status
      router.push('/dashboard/portfolios')
    } else {
      toast.error(result.message)
    }
  }

  async function handleSaveDraft() {
    const id = await ensurePortfolioCreated(state)
    if (!id) return

    setSavingDraft(true)
    const result = await savePortfolioDraftAction(id, buildPayloadData(state))
    setSavingDraft(false)

    if (result.success) {
      toast.success('Draft saved')
    } else {
      toast.error(result.message)
    }
  }

  // Update slug preview whenever title changes
  useEffect(() => {
    setSlug(slugifyPreview(state.title || state.name))
  }, [state.title, state.name])

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [])

  const isFirstStep = step === 1
  const isLastStep = step === STEPS.length

  return (
    <div className="flex flex-col min-h-[calc(100vh-180px)] gap-0">
      {/* Step indicator */}
      <nav aria-label="Portfolio creation steps" className="mb-8">
        <ol className="flex items-center gap-0 min-w-0 overflow-hidden" role="list">
          {STEPS.map((s, i) => {
            const done = step > s.id
            const active = step === s.id
            return (
              <React.Fragment key={s.id}>
                <li className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium transition-all duration-300',
                      active
                        ? 'bg-gallery-gold text-white shadow-[0_0_0_3px_rgba(215,153,34,0.15)]'
                        : done
                          ? 'bg-gallery-gold/20 text-gallery-gold'
                          : 'bg-on-surface/8 text-on-surface/30',
                    )}
                  >
                    {done ? (
                      <svg viewBox="0 0 10 8" className="w-2.5 fill-gallery-gold" aria-hidden="true">
                        <path
                          d="M1 4l3 3L9 1"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          fill="none"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      s.id
                    )}
                  </div>
                  <span
                    className={cn(
                      'font-rubik text-[9px] tracking-[0.15em] uppercase hidden sm:block',
                      active ? 'text-primary' : done ? 'text-on-surface/40' : 'text-on-surface/25',
                    )}
                    aria-hidden="true"
                  >
                    {s.label}
                  </span>
                </li>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-px mx-3 transition-colors duration-300',
                      done ? 'bg-gallery-gold/30' : 'bg-on-surface/8',
                    )}
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            )
          })}
        </ol>

        {/* Autosave status */}
        {state.portfolioId && (
          <p
            className="text-[10px] text-on-surface/25 mt-2 text-right"
            aria-live="polite"
            aria-atomic="true"
          >
            {saving ? 'Saving…' : 'Autosaved'}
          </p>
        )}
      </nav>

      {/* Step content */}
      <div className="flex-1">
        {step === 1 && (
          <WizardStepMetadata state={state} onChange={updateState} slugPreview={slug} />
        )}
        {step === 2 && <WizardStepAssetTray state={state} onChange={updateState} />}
        {step === 3 && <WizardStepSectionLayout state={state} onChange={updateState} isSaving={saving} />}
        {step === 4 && <WizardStepOverrides state={state} onChange={updateState} />}
        {step === 5 && <WizardStepTheme state={state} onChange={updateState} />}
        {step === 6 && (
          <WizardStepShare
            state={state}
            onChange={updateState}
            portfolioId={state.portfolioId}
            slug={slug}
            onPublish={handlePublish}
            onSaveDraft={handleSaveDraft}
            publishing={publishing}
            savingDraft={savingDraft}
            previewUsed={previewUsed}
            onPreviewUsed={() => setPreviewUsed(true)}
          />
        )}
      </div>

      {/* Navigation footer — Back always visible; Continue only on non-final steps */}
      <div className="flex items-center justify-between pt-8 mt-8 border-t border-on-surface/8">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={isFirstStep}
          className="gap-2 rounded-xl text-on-surface/50 hover:text-primary"
          aria-label="Go to previous step"
        >
          <ChevronLeft size={16} />
          Back
        </Button>

        {!isLastStep && (
          <Button
            onClick={goNext}
            className="gap-2 rounded-[20px] bg-primary hover:bg-gallery-gold px-6"
            aria-label="Go to next step"
          >
            {step === 5 ? 'Review & Publish' : 'Continue'}
            <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  )
}
