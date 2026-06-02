import type { CollectionBeforeChangeHook } from 'payload'

type AnyBlock = Record<string, unknown>

/**
 * Collection beforeChange hook — runs after all field hooks.
 * Iterates layoutBlocks, finds grid blocks, and ensures sectionAnchor values
 * are unique within the portfolio by appending -2, -3, etc. to duplicates. (C-2)
 *
 * Enterprise: early-exits when layoutBlocks is absent or unchanged from originalDoc
 * to avoid O(N) traversal on saves that only touch non-block fields (Issue 3).
 */
export const deduplicateSectionAnchors: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const blocks = data?.layoutBlocks
  // Early exit: no blocks in this save payload
  if (!Array.isArray(blocks)) return data

  // Early exit: blocks pointer hasn't changed (same reference — Payload passes through
  // the originalDoc array when the caller didn't modify layoutBlocks)
  if (originalDoc?.layoutBlocks === blocks) return data

  // Early exit: no grid blocks with anchors present — nothing to deduplicate
  const hasAnchoredGridBlock = blocks.some(
    (b: AnyBlock) => b.blockType === 'grid' && typeof b.sectionAnchor === 'string' && b.sectionAnchor !== '',
  )
  if (!hasAnchoredGridBlock) return data

  const seen = new Map<string, number>()

  const deduped = blocks.map((block: AnyBlock) => {
    if (block.blockType !== 'grid') return block

    const anchor = typeof block.sectionAnchor === 'string' ? block.sectionAnchor.trim() : ''
    // Skip blocks without a meaningful anchor — no deduplication needed
    if (!anchor) return block

    if (!seen.has(anchor)) {
      seen.set(anchor, 1)
      return block
    }

    // Duplicate — append incrementing suffix
    const count = (seen.get(anchor) ?? 1) + 1
    seen.set(anchor, count)
    return { ...block, sectionAnchor: `${anchor}-${count}` }
  })

  return { ...data, layoutBlocks: deduped }
}
