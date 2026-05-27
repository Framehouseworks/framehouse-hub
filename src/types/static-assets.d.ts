/**
 * Ambient module declarations for static asset imports.
 *
 * Next.js handles these at build time, but `tsc --noEmit` runs before
 * `next build` in CI, so `.next/types/routes.d.ts` doesn't exist yet and
 * `next-env.d.ts` cannot fully resolve its image-type references.
 * SVG has no upstream declaration in Next.js at all.
 *
 * These declarations cover all static assets used with `next/image`.
 */

declare module '*.svg' {
  import type { StaticImageData } from 'next/image'
  const content: StaticImageData
  export default content
}

declare module '*.png' {
  import type { StaticImageData } from 'next/image'
  const content: StaticImageData
  export default content
}

declare module '*.jpg' {
  import type { StaticImageData } from 'next/image'
  const content: StaticImageData
  export default content
}

declare module '*.jpeg' {
  import type { StaticImageData } from 'next/image'
  const content: StaticImageData
  export default content
}

declare module '*.webp' {
  import type { StaticImageData } from 'next/image'
  const content: StaticImageData
  export default content
}
