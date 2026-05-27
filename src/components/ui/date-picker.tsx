'use client'

import * as React from 'react'
import { format, parse, isValid } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/utilities/cn'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Calendar } from './calendar'

const DISPLAY_FORMAT = 'd MMM yyyy' // e.g. "21 May 2024"
const PARSE_FORMATS = ['d MMM yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy']

interface DatePickerProps {
  value: string | null | undefined
  onChange: (iso: string | null) => void
  className?: string
  inputClassName?: string
  placeholder?: string
}

function parseFlexibleDate(str: string): Date | null {
  for (const fmt of PARSE_FORMATS) {
    const parsed = parse(str, fmt, new Date())
    if (isValid(parsed)) return parsed
  }
  return null
}

function isoToDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return isValid(d) ? d : null
}

export function DatePicker({
  value,
  onChange,
  className,
  inputClassName,
  placeholder = 'dd MMM yyyy',
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState<string>(() => {
    const d = isoToDate(value)
    return d ? format(d, DISPLAY_FORMAT) : ''
  })

  // Sync input display when value prop changes externally
  React.useEffect(() => {
    const d = isoToDate(value)
    setInputValue(d ? format(d, DISPLAY_FORMAT) : '')
  }, [value])

  const commitInput = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) {
      onChange(null)
      return
    }
    const parsed = parseFlexibleDate(trimmed)
    if (parsed) {
      setInputValue(format(parsed, DISPLAY_FORMAT))
      onChange(parsed.toISOString())
    } else {
      // Revert to last valid value
      const d = isoToDate(value)
      setInputValue(d ? format(d, DISPLAY_FORMAT) : '')
    }
  }

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return
    setInputValue(format(date, DISPLAY_FORMAT))
    onChange(date.toISOString())
    setOpen(false)
  }

  const selectedDate = isoToDate(value) ?? undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn('relative flex items-center', className)}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={commitInput}
          placeholder={placeholder}
          className={cn(
            'w-full bg-black/[0.04] dark:bg-white/[0.04] rounded-xl pl-3 pr-8 py-1.5',
            'text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 text-primary',
            'placeholder:text-on-surface/30',
            inputClassName,
          )}
        />
        {/* onMouseDown prevents input blur from firing before the click registers */}
        <PopoverTrigger
          onMouseDown={(e) => e.preventDefault()}
          className="absolute right-2 text-on-surface/30 hover:text-gallery-gold transition-colors focus:outline-none"
          aria-label="Open calendar"
        >
          <CalendarIcon size={12} />
        </PopoverTrigger>
      </div>
      <PopoverContent align="end" sideOffset={6}>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleCalendarSelect}
          defaultMonth={selectedDate}
        />
      </PopoverContent>
    </Popover>
  )
}
