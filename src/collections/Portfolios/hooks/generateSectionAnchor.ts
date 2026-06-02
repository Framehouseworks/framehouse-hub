import type { FieldHook } from 'payload'

/** Converts a raw section name to a URL-safe kebab-case anchor slug. */
function sanitiseAnchor(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/**
 * Field hook (beforeChange) for the sectionAnchor field on a grid block.
 *
 * If sectionAnchorOverride is set in siblingData, use it verbatim (admin escape hatch).
 * Otherwise, sanitise sectionName into a kebab-case anchor.
 * Deduplication across sibling blocks is handled by the collection-level
 * deduplicateSectionAnchors hook, which runs after all field hooks.
 */
export const generateSectionAnchor: FieldHook = ({ siblingData, value }) => {
  // Admin override takes precedence — used to fix corrupt anchors (C-1)
  const override = (siblingData as Record<string, unknown>)?.sectionAnchorOverride
  if (typeof override === 'string' && override.trim().length > 0) {
    return sanitiseAnchor(override.trim())
  }

  const name = (siblingData as Record<string, unknown>)?.sectionName
  if (typeof name === 'string' && name.trim().length > 0) {
    return sanitiseAnchor(name.trim())
  }

  // No name — preserve existing value or fall back to empty
  return typeof value === 'string' ? value : ''
}
