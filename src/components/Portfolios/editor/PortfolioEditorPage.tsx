'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/utilities/cn'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  savePortfolioDraftAction,
  publishPortfolioAction,
  generatePreviewTokenAction,
} from '@/app/(dashboard)/actions/portfolios'
import type { Portfolio } from '@/payload-types'
import type { WizardState } from '../types'
import {
  plainTextToLexical,
  itemsToLayoutBlocks,
  sectionsToLayoutBlocks,
  hydrateServerSections,
  extractRichTextPlain,
} from '../types'
import { WizardStepMetadata } from '../wizard/WizardStepMetadata'
import { WizardStepSectionLayout } from '../wizard/WizardStepSectionLayout'
import { WizardStepOverrides } from '../wizard/WizardStepOverrides'
import { WizardStepTheme } from '../wizard/WizardStepTheme'
import { WizardStepShare } from '../wizard/WizardStepShare'

// 'assets' tab removed — all asset management in 'layout' tab (C-7)
type Tab = 'metadata' | 'layout' | 'overrides' | 'theme' | 'share'

const TABS: { id: Tab; label: string }[] = [
  { id: 'metadata', label: 'Details' },
  { id: 'layout', label: 'Layout' },
  { id: 'overrides', label: 'Overrides' },
  { id: 'theme', label: 'Theme' },
  { id: 'share', label: 'Share' },
]

const AUTOSAVE_DELAY = 3000

function portfolioToWizardState(portfolio: Portfolio): WizardState {
  const layoutBlocks = portfolio.layoutBlocks ?? []

  // Hydrate sections from all grid blocks (C-5: uses block.id as DnD key)
  const sections = hydrateServerSections(layoutBlocks)

  // Flatten items from sections for legacy compatibility (used by WizardStepOverrides)
  const items = sections.flatMap((s) => s.items)

  const hasSections = sections.length > 0

  return {
    portfolioId: portfolio.id,
    name: portfolio.name,
    title: extractRichTextPlain(portfolio.title),
    subtitle: extractRichTextPlain(portfolio.subheading),
    description: '',
    items,
    sections,
    sectionMode: hasSections,
    layoutSpacing: 'medium',
    theme: {
      fontPairing: portfolio.theme?.fontPairing ?? 'modern-sans',
      backgroundColor: portfolio.theme?.backgroundColor ?? '#000000',
      textColor: portfolio.theme?.textColor ?? '#ffffff',
      accentColor: portfolio.theme?.accentColor ?? '#ffffff',
    },
    visibility: (portfolio.visibility ?? 'private') as WizardState['visibility'],
    password: portfolio.password ?? undefined,
    loadedAt: portfolio.updatedAt,
  }
}

interface Props {
  portfolio: Portfolio
}

export function PortfolioEditorPage({ portfolio }: Props) {
  const [tab, setTab] = useState<Tab>('metadata')
  const [state, setState] = useState<WizardState>(() => portfolioToWizardState(portfolio))
  const [dirtyTabs, setDirtyTabs] = useState<Set<Tab>>(new Set())
  const [_saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [publishing, setPublishing] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [previewUsed, setPreviewUsed] = useState(false)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  // Set to the timestamp of the last successful publish so performAutosave can
  // skip creating a draft version that would immediately shadow the published state.
  const lastPublishedAtRef = useRef<number | null>(null)

  const slug = portfolio.slug ?? ''

  function updateState(patch: Partial<WizardState>) {
    setState((s) => {
      const next = { ...s, ...patch }
      setDirtyTabs((prev) => new Set([...prev, tab]))
      scheduleAutosave(next)
      return next
    })
  }

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
    } as Partial<Portfolio>
  }

  function scheduleAutosave(nextState: WizardState) {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => performAutosave(nextState), AUTOSAVE_DELAY)
  }

  const performAutosave = useCallback(
    async (s: WizardState) => {
      if (!s.portfolioId || savingRef.current) return
      // Skip the first autosave that fires in the same render-cycle as a publish —
      // without this guard the draft write races the published write and can shadow it.
      if (lastPublishedAtRef.current && Date.now() - lastPublishedAtRef.current < 5000) return
      savingRef.current = true
      setSaving(true)
      setSaveStatus('saving')
      const result = await savePortfolioDraftAction(s.portfolioId, buildPayloadData(s), s.loadedAt)
      savingRef.current = false
      setSaving(false)

      if (!result.success) {
        setSaveStatus('idle')
        if (result.message.includes('conflict') || result.message.includes('409')) {
          setConflict(true)
        }
      } else {
        setSaveStatus('saved')
        setDirtyTabs(new Set())
        // Update loadedAt so the next conflict check uses the fresh timestamp
        if (result.data) {
          setState((prev) => ({ ...prev, loadedAt: (result.data as Portfolio).updatedAt }))
        }
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // stable — saving state read via savingRef, not closure
  )

  // Cmd+S shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (autosaveTimer.current) {
          clearTimeout(autosaveTimer.current)
          autosaveTimer.current = null
        }
        performAutosave(state)
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault()
        openPreview()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [])

  async function openPreview() {
    if (!state.portfolioId) return
    const result = await generatePreviewTokenAction(state.portfolioId)
    if (result.success && result.data) {
      const url = `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/p/${slug}?preview_token=${result.data.token}`
      window.open(url, '_blank', 'noopener,noreferrer')
      setPreviewUsed(true)
    } else {
      toast.error('Could not generate preview.')
    }
  }

  async function handlePublish() {
    if (!state.portfolioId) return
    // Wait for any in-flight autosave before publishing — prevents race where
    // autosave completes after publish and shadows the published state
    if (autosaveTimer.current) { clearTimeout(autosaveTimer.current); autosaveTimer.current = null }
    const raceDeadline = Date.now() + 3000
    while (savingRef.current && Date.now() < raceDeadline) {
      await new Promise((r) => setTimeout(r, 50))
    }
    if (savingRef.current) { toast.error('Still saving — please try again in a moment.'); return }
    setPublishing(true)
    const result = await publishPortfolioAction(state.portfolioId, buildPayloadData(state))
    setPublishing(false)
    if (result.success) {
      lastPublishedAtRef.current = Date.now()
      toast.success('Portfolio published')
      setDirtyTabs(new Set())
    } else {
      toast.error(result.message)
    }
  }

  async function handleSaveDraft() {
    if (!state.portfolioId) return
    setSavingDraft(true)
    const result = await savePortfolioDraftAction(state.portfolioId, buildPayloadData(state))
    setSavingDraft(false)
    if (result.success) {
      toast.success('Draft saved')
      setDirtyTabs(new Set())
    } else {
      toast.error(result.message)
    }
  }

  function slugPreview() {
    return state.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
  }

  return (
    <div className="flex flex-col gap-6 min-h-[calc(100vh-180px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/portfolios" aria-label="Back to portfolios">
            <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 flex-shrink-0">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-primary truncate">{portfolio.name}</h1>
            {slug && (
              <p className="text-[10px] text-on-surface/30 font-mono truncate">/p/{slug}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Save status */}
          <span
            className="text-[10px] text-on-surface/25"
            aria-live="polite"
            aria-atomic="true"
          >
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" /> Saving…
              </span>
            )}
            {saveStatus === 'saved' && 'Saved'}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={openPreview}
            className="gap-1.5 rounded-xl text-on-surface/50 text-xs hover:text-primary"
            aria-label="Preview portfolio (Cmd+Shift+P)"
          >
            Preview
          </Button>

          <Button
            onClick={handlePublish}
            disabled={publishing}
            size="sm"
            className="gap-1.5 rounded-[20px] bg-primary hover:bg-gallery-gold text-xs px-4"
            aria-label="Publish portfolio"
          >
            {publishing ? <Loader2 size={13} className="animate-spin" /> : null}
            Publish
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Portfolio editor sections"
        className="flex gap-1 overflow-x-auto scrollbar-hide"
      >
        {TABS.map(({ id, label }) => {
          const isDirty = dirtyTabs.has(id)
          return (
            <button
              key={id}
              id={`editor-tab-${id}`}
              role="tab"
              aria-selected={tab === id}
              aria-controls={`editor-panel-${id}`}
              onClick={() => setTab(id)}
              className={cn(
                'relative flex-shrink-0 px-4 py-2 text-sm rounded-xl transition-all duration-200',
                tab === id
                  ? 'bg-white/80 dark:bg-white/10 text-primary font-semibold shadow-sm'
                  : 'text-on-surface/40 hover:text-primary hover:bg-white/40',
              )}
            >
              {label}
              {isDirty && (
                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#d79922]"
                  aria-label="Unsaved changes"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab panels */}
      <div className="flex-1">
        <div role="tabpanel" id="editor-panel-metadata" hidden={tab !== 'metadata'}>
          {tab === 'metadata' && (
            <WizardStepMetadata state={state} onChange={updateState} slugPreview={slugPreview()} />
          )}
        </div>
        {/* Layout tab — asset management integrated into sections (C-7) */}
        <div role="tabpanel" id="editor-panel-layout" hidden={tab !== 'layout'}>
          {tab === 'layout' && <WizardStepSectionLayout state={state} onChange={updateState} />}
        </div>
        <div role="tabpanel" id="editor-panel-overrides" hidden={tab !== 'overrides'}>
          {tab === 'overrides' && <WizardStepOverrides state={state} onChange={updateState} />}
        </div>
        <div role="tabpanel" id="editor-panel-theme" hidden={tab !== 'theme'}>
          {tab === 'theme' && <WizardStepTheme state={state} onChange={updateState} />}
        </div>
        <div role="tabpanel" id="editor-panel-share" hidden={tab !== 'share'}>
          {tab === 'share' && (
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
      </div>

      {/* Conflict modal */}
      <Dialog open={conflict} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false} className="max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-[#bb1800]/10 flex items-center justify-center">
                <AlertTriangle size={16} className="text-[#bb1800]" />
              </div>
              <DialogTitle>Editing conflict detected</DialogTitle>
            </div>
            <DialogDescription>
              This portfolio was updated in another session. Reload to see the latest version — your
              unsaved changes in this tab will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => window.location.reload()}
              className="w-full gap-2 rounded-xl"
            >
              <RefreshCw size={14} />
              Reload latest version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
