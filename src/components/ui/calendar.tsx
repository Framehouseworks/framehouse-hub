'use client'

import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utilities/cn'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-2',
        month: 'flex flex-col gap-4',
        month_caption: 'flex justify-center pt-1 relative items-center w-full',
        caption_label: 'text-sm font-bold font-rubik text-primary',
        nav: 'flex items-center gap-1',
        button_previous: cn(
          'absolute left-1 h-7 w-7 rounded-xl flex items-center justify-center',
          'text-on-surface/40 hover:text-gallery-gold hover:bg-gallery-gold/[0.06] transition-colors',
        ),
        button_next: cn(
          'absolute right-1 h-7 w-7 rounded-xl flex items-center justify-center',
          'text-on-surface/40 hover:text-gallery-gold hover:bg-gallery-gold/[0.06] transition-colors',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'text-on-surface/30 rounded-md w-8 font-bold text-[0.65rem] uppercase tracking-wide',
        weeks: 'flex flex-col',
        week: 'flex w-full mt-1',
        day: cn(
          'relative p-0 text-center text-sm',
          '[&:has([aria-selected])]:bg-gallery-gold/[0.06] [&:has([aria-selected])]:rounded-xl',
        ),
        day_button: cn(
          'h-8 w-8 p-0 font-normal text-xs rounded-xl transition-colors',
          'hover:bg-gallery-gold/10 hover:text-gallery-gold',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gallery-gold/50',
          'aria-selected:opacity-100',
        ),
        selected:
          'bg-gallery-gold text-white hover:bg-gallery-gold/90 hover:text-white focus:bg-gallery-gold focus:text-white rounded-xl',
        today: 'font-bold text-gallery-gold',
        outside: 'text-on-surface/20 aria-selected:text-white/70',
        disabled: 'text-on-surface/20 opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  )
}

Calendar.displayName = 'Calendar'

export { Calendar }
