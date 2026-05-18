import { useEffect, useState } from 'react'

/**
 * Custom hook to debounce a value.
 * Used to optimize performance in high-frequency state updates like search inputs.
 * Fulfills the 'Performance Engineering' requirement for museum-grade archival discovery.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
