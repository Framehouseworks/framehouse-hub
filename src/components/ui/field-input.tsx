/**
 * Container-focused form field primitives.
 * The wrapper div receives the focus ring; the inner input/textarea is transparent.
 * This matches the Combobox and GlobalSearch focus pattern.
 */

import { cn } from '@/utilities/cn'

const containerBase = cn(
  'w-full rounded-[14px]',
  'bg-black/[0.04] dark:bg-white/[0.05]',
  'transition-shadow duration-150',
  'focus-within:shadow-[0_0_0_2px_rgba(68,90,165,0.35)]',
)

const inputBase = cn(
  'w-full bg-transparent',
  'text-sm text-primary placeholder:text-on-surface/30',
  'outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
)

interface FieldInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string
  error?: boolean
}

export function FieldInput({ containerClassName, error, className, ...props }: FieldInputProps) {
  return (
    <div
      className={cn(
        containerBase,
        error && 'focus-within:shadow-[0_0_0_2px_rgba(187,24,0,0.4)]',
        containerClassName,
      )}
    >
      <input
        {...props}
        className={cn(inputBase, 'px-3.5 h-11', className)}
      />
    </div>
  )
}

interface FieldTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string
}

export function FieldTextarea({ containerClassName, className, ...props }: FieldTextareaProps) {
  return (
    <div className={cn(containerBase, containerClassName)}>
      <textarea
        {...props}
        className={cn(inputBase, 'px-3.5 py-2.5 resize-none block', className)}
      />
    </div>
  )
}
