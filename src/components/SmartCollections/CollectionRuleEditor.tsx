'use client'

import { useState, useCallback, useId } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Plus, Sparkles, Info } from 'lucide-react'
import { cn } from '@/utilities/cn'
import { RuleRow, type RuleData, rulesToFilterQuery } from './RuleRow'
import { PreviewStrip } from './PreviewStrip'
import { toast } from 'sonner'

interface CollectionRuleEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionId?: number
  collectionName?: string
  initialRules?: RuleData[]
  initialLogic?: 'and' | 'or'
  manualExcludes?: (number | string)[]
  onSave: (filterQuery: Record<string, unknown>, name?: string) => Promise<void>
}

function makeRule(): RuleData {
  return {
    id: Math.random().toString(36).slice(2),
    attribute: 'tag',
    operator: 'contains',
    value: '',
  }
}

export function CollectionRuleEditor({
  open,
  onOpenChange,
  collectionId,
  collectionName,
  initialRules,
  initialLogic = 'and',
  manualExcludes,
  onSave,
}: CollectionRuleEditorProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [rules, setRules] = useState<RuleData[]>(initialRules ?? [makeRule()])
  const [logic, setLogic] = useState<'and' | 'or'>(initialLogic)
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState(collectionName || '')
  const nameId = useId()

  const filterQuery = rulesToFilterQuery(rules, logic)
  const isCreateMode = !collectionId

  const handleAddRule = useCallback(() => setRules((prev) => [...prev, makeRule()]), [])

  const handleChangeRule = useCallback((id: string, updates: Partial<RuleData>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
  }, [])

  const handleRemoveRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const handleSave = async () => {
    if (!filterQuery) {
      toast.error('Add at least one rule with a value')
      return
    }
    if (isCreateMode && !name.trim()) {
      toast.error('Give your collection a name')
      return
    }
    setIsSaving(true)
    try {
      await onSave(filterQuery, isCreateMode ? name.trim() : undefined)
      onOpenChange(false)
    } catch {
      toast.error('Failed to save rules')
    } finally {
      setIsSaving(false)
    }
  }

  const title = isCreateMode ? 'New Collection' : `Edit Rules`

  const content = (
    <div className="flex flex-col gap-6">
      {/* Collection name — create mode */}
      {isCreateMode && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={nameId} className="text-xs font-medium text-[#1a1c1c]/50 uppercase tracking-wider">
            Collection Name
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bird Photography, Iceland 2026…"
            autoFocus
            className={cn(
              'w-full bg-white dark:bg-white/[0.06] border border-[#d5c4af]/30 rounded-[16px]',
              'px-4 py-3 text-sm text-[#1a1c1c] dark:text-white',
              'outline-none focus:ring-2 focus:ring-[#d79922]/40 focus:border-[#d79922]/60',
              'placeholder:text-[#1a1c1c]/30 transition-colors',
            )}
          />
        </div>
      )}

      {/* Logic + rules section */}
      <div className="flex flex-col gap-3">
        {/* Section header with logic toggle */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs font-medium text-[#1a1c1c]/50 uppercase tracking-wider">
            Include assets matching
          </span>
          <div className="flex items-center gap-0.5 p-0.5 bg-[#f3f3f4] dark:bg-white/[0.06] rounded-full">
            {(['and', 'or'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLogic(l)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-all',
                  logic === l
                    ? 'bg-white dark:bg-white/20 shadow-sm text-gallery-gold'
                    : 'text-[#1a1c1c]/40 hover:text-[#1a1c1c] dark:text-white/40 dark:hover:text-white',
                )}
              >
                {l === 'and' ? 'ALL rules' : 'ANY rule'}
              </button>
            ))}
          </div>
        </div>

        {/* Rules list */}
        <div className="flex flex-col gap-2">
          {rules.map((rule, i) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              index={i}
              onChange={handleChangeRule}
              onRemove={handleRemoveRule}
            />
          ))}
        </div>

        {/* Add rule */}
        <button
          onClick={handleAddRule}
          className={cn(
            'flex items-center gap-2 text-gallery-gold text-sm font-semibold',
            'hover:opacity-70 transition-opacity w-fit mt-1',
          )}
        >
          <Plus size={14} />
          Add another rule
        </button>
      </div>

      {/* Tag hint — only when a tag attribute is selected */}
      {rules.some((r) => r.attribute === 'tag' || r.attribute === 'heuristicTag') && (
        <div className="flex items-start gap-2 bg-gallery-gold/[0.06] rounded-[12px] px-3 py-2.5">
          <Info size={13} className="text-gallery-gold mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#1a1c1c]/60 dark:text-white/50 leading-relaxed">
            <strong className="text-gallery-gold">Auto-extracted tags</strong> are generated by
            heuristic analysis of your media. Use <em>Tag</em> for manual labels,{' '}
            <em>Auto-extracted Tag</em> for system-detected ones.
          </p>
        </div>
      )}

      {/* Live preview */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[#1a1c1c]/50 uppercase tracking-wider">
          Live Preview
        </span>
        <PreviewStrip filterQuery={filterQuery} manualExcludes={manualExcludes} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="rounded-[16px] text-[#1a1c1c]/40 hover:text-[#1a1c1c]"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !filterQuery || (isCreateMode && !name.trim())}
          className={cn(
            'bg-gradient-to-r from-[#7f5700] to-[#d79922] text-white rounded-[24px] px-7 gap-2',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          <Sparkles size={14} />
          {isSaving ? 'Saving…' : isCreateMode ? 'Create Collection' : 'Save Rules'}
        </Button>
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            'bg-white/80 dark:bg-[#1a1c1c]/90 backdrop-blur-[24px]',
            'rounded-[24px] max-w-[600px] border border-[#d5c4af]/15',
            'shadow-[0px_32px_64px_rgba(26,28,28,0.14)]',
          )}
        >
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-[#1a1c1c] dark:text-white">
              {title}
              {collectionName && (
                <span className="text-[#1a1c1c]/40 font-normal ml-1">— {collectionName}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          'rounded-t-[28px] bg-white dark:bg-[#1a1c1c]',
          'border-0 shadow-[0px_-16px_48px_rgba(26,28,28,0.12)]',
          'max-h-[92vh] flex flex-col',
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-[#d5c4af]/50 rounded-full" />
        </div>

        {/* Header */}
        <SheetHeader className="px-5 pt-3 pb-0 flex-shrink-0">
          <SheetTitle className="text-base font-semibold text-[#1a1c1c] dark:text-white text-left">
            {title}
            {collectionName && (
              <span className="text-[#1a1c1c]/40 dark:text-white/40 font-normal ml-1.5">
                — {collectionName}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Scrollable content with safe-area bottom padding */}
        <div
          className="flex-1 overflow-y-auto px-5 pt-5"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        >
          {content}
        </div>
      </SheetContent>
    </Sheet>
  )
}
