'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { cn } from '@/utilities/cn'

export type RuleAttribute =
  | 'tag'
  | 'heuristicTag'
  | 'shootName'
  | 'mediaType'
  | 'cameraMake'
  | 'cameraModel'
  | 'lensModel'
  | 'captureDate'
  | 'fileSize'
  | 'aspectRatio'

export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'greater_than'
  | 'less_than'
  | 'between'

export interface RuleData {
  id: string
  attribute: RuleAttribute
  operator: RuleOperator
  value: string
  valueTo?: string
}

export const ATTRIBUTE_OPTIONS: { value: RuleAttribute; label: string; group: string }[] = [
  { value: 'tag', label: 'Tag', group: 'Tags' },
  { value: 'heuristicTag', label: 'Auto-extracted Tag', group: 'Tags' },
  { value: 'mediaType', label: 'Media Type', group: 'File' },
  { value: 'fileSize', label: 'File Size', group: 'File' },
  { value: 'captureDate', label: 'Capture Date', group: 'Date' },
  { value: 'shootName', label: 'Shoot Name', group: 'Metadata' },
  { value: 'cameraMake', label: 'Camera Make', group: 'Metadata' },
  { value: 'cameraModel', label: 'Camera Model', group: 'Metadata' },
  { value: 'lensModel', label: 'Lens Model', group: 'Metadata' },
  { value: 'aspectRatio', label: 'Aspect Ratio', group: 'Metadata' },
]

const OPERATORS_BY_ATTRIBUTE: Record<RuleAttribute, { value: RuleOperator; label: string }[]> = {
  tag: [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'is exactly' },
    { value: 'not_equals', label: 'is not' },
  ],
  heuristicTag: [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'is exactly' },
    { value: 'not_equals', label: 'is not' },
  ],
  shootName: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'contains', label: 'contains' },
  ],
  mediaType: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
  ],
  cameraMake: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
    { value: 'contains', label: 'contains' },
  ],
  cameraModel: [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'is exactly' },
  ],
  lensModel: [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'is exactly' },
  ],
  captureDate: [
    { value: 'less_than', label: 'before' },
    { value: 'greater_than', label: 'after' },
    { value: 'between', label: 'between' },
  ],
  fileSize: [
    { value: 'greater_than', label: 'greater than' },
    { value: 'less_than', label: 'less than' },
  ],
  aspectRatio: [{ value: 'equals', label: 'is' }],
}

const MEDIA_TYPE_OPTIONS = [
  { value: 'image', label: 'Image' },
  { value: 'raw', label: 'RAW' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'document', label: 'Document' },
]

const TAG_ATTRIBUTES = new Set<RuleAttribute>(['tag', 'heuristicTag'])
const AUTOCOMPLETE_ATTRIBUTES = new Set<RuleAttribute>(['tag', 'heuristicTag', 'shootName', 'cameraMake', 'cameraModel', 'lensModel'])

/** Styled select control */
function StyledSelect({
  value,
  onChange,
  children,
  'aria-label': ariaLabel,
  className,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  'aria-label'?: string
  className?: string
}) {
  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={cn(
          'appearance-none bg-white dark:bg-white/[0.06] border border-[#d5c4af]/30',
          'rounded-[12px] pl-3 pr-7 py-2 text-[13px] text-[#1a1c1c] dark:text-white',
          'outline-none focus:ring-2 focus:ring-[#d79922]/40 focus:border-[#d79922]/60',
          'cursor-pointer transition-colors hover:border-[#d5c4af]/60 w-full',
        )}
      >
        {children}
      </select>
      <ChevronDown
        size={12}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#1a1c1c]/40 pointer-events-none"
      />
    </div>
  )
}

/** Tag autocomplete input — fetches suggestions from /api/smart-collections/tag-suggestions */
function TagAutocompleteInput({
  value,
  onChange,
  tagType,
  field,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  tagType: 'manual' | 'heuristic' | 'all'
  /** When set, queries the scalar `field=` endpoint instead of tag arrays */
  field?: string
  placeholder?: string
}) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Sync external value
  useEffect(() => setInputValue(value), [value])

  const fetchSuggestions = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        abortRef.current?.abort()
        abortRef.current = new AbortController()
        try {
          const params = new URLSearchParams({ q })
          if (field) {
            params.set('field', field)
          } else {
            params.set('type', tagType)
          }
          const res = await fetch(
            `/api/smart-collections/tag-suggestions?${params.toString()}`,
            { signal: abortRef.current.signal },
          )
          if (!res.ok) return
          const data = await res.json()
          setSuggestions(data.suggestions || [])
          setOpen((data.suggestions || []).length > 0)
        } catch {
          // ignore abort
        }
      }, 200)
    },
    [tagType, field],
  )

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setInputValue(v)
    onChange(v)
    fetchSuggestions(v)
  }

  const handleFocus = () => {
    fetchSuggestions(inputValue)
  }

  const handleSelect = (tag: string) => {
    setInputValue(tag)
    onChange(tag)
    setSuggestions([])
    setOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-0">
      <input
        type="text"
        value={inputValue}
        onChange={handleInput}
        onFocus={handleFocus}
        placeholder={placeholder || 'Type to search tags…'}
        className={cn(
          'w-full bg-white dark:bg-white/[0.06] border border-[#d5c4af]/30 rounded-[12px]',
          'px-3 py-2 text-[13px] text-[#1a1c1c] dark:text-white',
          'outline-none focus:ring-2 focus:ring-[#d79922]/40 focus:border-[#d79922]/60',
          'placeholder:text-[#1a1c1c]/30 transition-colors',
        )}
        autoComplete="off"
        spellCheck={false}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-[#1a1c1c] border border-[#d5c4af]/20 rounded-[16px] shadow-[0px_16px_32px_rgba(26,28,28,0.12)] overflow-hidden">
          <ul role="listbox" className="max-h-44 overflow-y-auto py-1">
            {suggestions.map((tag) => (
              <li
                key={tag}
                role="option"
                aria-selected={tag === inputValue}
                onMouseDown={(e) => {
                  e.preventDefault() // prevent blur before click
                  handleSelect(tag)
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-[13px] cursor-pointer transition-colors',
                  tag === inputValue
                    ? 'bg-gallery-gold/10 text-gallery-gold'
                    : 'text-[#1a1c1c] hover:bg-[#f3f3f4] dark:text-white dark:hover:bg-white/[0.06]',
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gallery-gold/40 flex-shrink-0" />
                {tag}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** General text input with consistent styling */
function StyledInput({
  value,
  onChange,
  type = 'text',
  placeholder,
  'aria-label': ariaLabel,
  className,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  'aria-label'?: string
  className?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={cn(
        'flex-1 min-w-0 bg-white dark:bg-white/[0.06] border border-[#d5c4af]/30 rounded-[12px]',
        'px-3 py-2 text-[13px] text-[#1a1c1c] dark:text-white',
        'outline-none focus:ring-2 focus:ring-[#d79922]/40 focus:border-[#d79922]/60',
        'placeholder:text-[#1a1c1c]/30 transition-colors',
        className,
      )}
    />
  )
}

interface RuleRowProps {
  rule: RuleData
  index: number
  onChange: (id: string, updates: Partial<RuleData>) => void
  onRemove: (id: string) => void
}

export function RuleRow({ rule, index, onChange, onRemove }: RuleRowProps) {
  const operators = OPERATORS_BY_ATTRIBUTE[rule.attribute] || []
  const isTagAttribute = TAG_ATTRIBUTES.has(rule.attribute)
  const hasAutocomplete = AUTOCOMPLETE_ATTRIBUTES.has(rule.attribute)
  const tagType = rule.attribute === 'tag' ? 'manual' : rule.attribute === 'heuristicTag' ? 'heuristic' : 'all'

  return (
    <div
      className="bg-[#f9f9f9] dark:bg-white/[0.03] border border-[#d5c4af]/15 rounded-[16px] p-3 flex flex-col gap-2.5"
      aria-label={`Rule ${index + 1}: ${rule.attribute} ${rule.operator} ${rule.value}`}
    >
      {/* Row header: attribute + operator + remove */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {/* Attribute */}
        <StyledSelect
          value={rule.attribute}
          onChange={(v) =>
            onChange(rule.id, {
              attribute: v as RuleAttribute,
              operator: OPERATORS_BY_ATTRIBUTE[v as RuleAttribute][0].value,
              value: '',
            })
          }
          aria-label="Rule attribute"
          className="flex-1 min-w-[120px]"
        >
          {ATTRIBUTE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </StyledSelect>

        {/* Operator */}
        <StyledSelect
          value={rule.operator}
          onChange={(v) => onChange(rule.id, { operator: v as RuleOperator })}
          aria-label="Rule operator"
          className="flex-shrink-0 min-w-[100px]"
        >
          {operators.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </StyledSelect>

        {/* Remove button */}
        <button
          onClick={() => onRemove(rule.id)}
          className="ml-auto flex-shrink-0 p-1.5 rounded-full hover:bg-[#eeeeee] dark:hover:bg-white/10 text-[#1a1c1c]/30 hover:text-[#1a1c1c] dark:text-white/30 dark:hover:text-white transition-colors"
          aria-label={`Remove rule ${index + 1}`}
        >
          <X size={13} />
        </button>
      </div>

      {/* Value input — full-width row */}
      <div className="flex items-center gap-2">
        {rule.attribute === 'mediaType' ? (
          <StyledSelect
            value={rule.value}
            onChange={(v) => onChange(rule.id, { value: v })}
            aria-label="Media type"
            className="flex-1"
          >
            <option value="">Select type…</option>
            {MEDIA_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </StyledSelect>
        ) : rule.attribute === 'captureDate' ? (
          <div className="flex items-center gap-2 flex-1">
            <StyledInput
              type="date"
              value={rule.value}
              onChange={(v) => onChange(rule.id, { value: v })}
              aria-label="Date value"
            />
            {rule.operator === 'between' && (
              <>
                <span className="text-xs text-[#1a1c1c]/40 flex-shrink-0">and</span>
                <StyledInput
                  type="date"
                  value={rule.valueTo || ''}
                  onChange={(v) => onChange(rule.id, { valueTo: v })}
                  aria-label="Date to value"
                />
              </>
            )}
          </div>
        ) : rule.attribute === 'fileSize' ? (
          <div className="flex items-center gap-2 flex-1">
            <StyledInput
              type="number"
              value={rule.value}
              onChange={(v) => onChange(rule.id, { value: v })}
              placeholder="e.g. 10"
              aria-label="File size value"
            />
            <span className="text-xs text-[#1a1c1c]/40 flex-shrink-0">MB</span>
          </div>
        ) : isTagAttribute || hasAutocomplete ? (
          <TagAutocompleteInput
            value={rule.value}
            onChange={(v) => onChange(rule.id, { value: v })}
            tagType={isTagAttribute ? (tagType as 'manual' | 'heuristic' | 'all') : 'all'}
            field={!isTagAttribute ? rule.attribute : undefined}
            placeholder={
              isTagAttribute
                ? 'Type to search tags…'
                : rule.attribute === 'shootName'
                  ? 'e.g. Iceland 2026'
                  : rule.attribute === 'cameraMake'
                    ? 'e.g. Sony'
                    : rule.attribute === 'cameraModel'
                      ? 'e.g. A7 IV'
                      : rule.attribute === 'lensModel'
                        ? 'e.g. 24-70mm f/2.8'
                        : 'Search…'
            }
          />
        ) : (
          <StyledInput
            value={rule.value}
            onChange={(v) => onChange(rule.id, { value: v })}
            placeholder="Value…"
            aria-label="Rule value"
          />
        )}
      </div>
    </div>
  )
}

// ─── filterQuery serialiser ──────────────────────────────────────────────────

export function rulesToFilterQuery(
  rules: RuleData[],
  logic: 'and' | 'or',
): Record<string, unknown> | null {
  const conditions = rules
    .filter((r) => r.value.trim() !== '')
    .map((r) => ruleToCondition(r))
    .filter(Boolean)

  if (conditions.length === 0) return null
  if (conditions.length === 1) return conditions[0] as Record<string, unknown>
  return { [logic]: conditions }
}

function ruleToCondition(rule: RuleData): Record<string, unknown> | null {
  const { attribute, operator, value, valueTo } = rule
  if (!value.trim()) return null

  const fieldMap: Record<RuleAttribute, string> = {
    tag: 'manualTags.tag',
    heuristicTag: 'heuristicTags.tag',
    shootName: 'shootName',
    mediaType: 'mediaType',
    cameraMake: 'technical.cameraMake',
    cameraModel: 'technical.cameraModel',
    lensModel: 'technical.lensModel',
    captureDate: 'captureDate',
    fileSize: 'filesize',
    aspectRatio: 'width',
  }

  const field = fieldMap[attribute]
  if (!field) return null

  switch (operator) {
    case 'equals':
      return { [field]: { equals: value } }
    case 'not_equals':
      return { [field]: { not_equals: value } }
    case 'contains':
      return { [field]: { like: value } }
    case 'starts_with':
      return { [field]: { like: `${value}%` } }
    case 'greater_than':
      return { [field]: { greater_than: attribute === 'captureDate' ? value : Number(value) } }
    case 'less_than':
      return { [field]: { less_than: attribute === 'captureDate' ? value : Number(value) } }
    case 'between':
      return {
        and: [
          { [field]: { greater_than_equal: value } },
          { [field]: { less_than_equal: valueTo || value } },
        ],
      }
    default:
      return null
  }
}
