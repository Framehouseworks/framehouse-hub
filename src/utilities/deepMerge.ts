/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item: unknown): boolean {
  return !!(item && typeof item === 'object' && !Array.isArray(item))
}

/**
 * Deep merge two objects.
 * @param target
 * @param source
 */
export function deepMerge<T extends Record<string, unknown>, R extends Record<string, unknown>>(target: T, source: R): T {
  const output = { ...target } as T
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      const sourceKeyed = source as Record<string, unknown>
      const outputKeyed = output as Record<string, unknown>
      const targetKeyed = target as Record<string, unknown>

      if (isObject(sourceKeyed[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: sourceKeyed[key] })
        } else {
          outputKeyed[key] = deepMerge(targetKeyed[key] as Record<string, unknown>, sourceKeyed[key] as Record<string, unknown>)        }
      } else {
        Object.assign(output, { [key]: sourceKeyed[key] })
      }
    })
  }

  return output
}
