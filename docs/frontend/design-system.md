# Design System: The Curated Gallery

Framehouse Hub uses a design language called **The Curated Gallery** — premium, high-contrast, gallery-first aesthetics. All UI must conform to these rules.

---

## Design Philosophy

- Every surface reads like a framed exhibit: dark backgrounds, precise tonal layering, no decorative borders
- Whitespace and contrast do the work that borders would otherwise do
- Interactive elements use accent color, not outlines
- Motion is purposeful — entrance animations, not decoration

---

## Color Tokens

Defined in `src/cssVariables.js` and mapped to CSS variables in the `_css` directory.

| Token | Value | Usage |
|---|---|---|
| `base0` | `rgb(255, 255, 255)` | Light mode base, text on dark |
| `base100` | `rgb(235, 235, 235)` | Subtle light surfaces |
| `base500` | `rgb(128, 128, 128)` | Muted text, placeholders |
| `base850` | `rgb(34, 34, 34)` | Dark mode card surfaces |
| `base1000` | `rgb(0, 0, 0)` | Dark mode base background |
| `error500` | `rgb(255, 111, 118)` | Error states, destructive actions |

In Tailwind/CSS, reference via the CSS variable names set in the `_css` directory. Keep token usage consistent — do not hardcode `rgb()` values inline.

---

## Typography

Font family: **Geist** (both sans and mono variants), loaded via Next.js font optimization.

- Body: Geist Sans
- Code/monospace: Geist Mono
- No additional font faces — Geist only
- Font weights: 400 (body), 500 (emphasis), 600 (headings), 700 (display)
- Letter spacing: tight on headings (`tracking-tight`), normal elsewhere

---

## Spacing and Layout

### ROUND_SIXTEEN Rule

Minimum border-radius for any card, container, modal, or interactive surface is **16px** (`rounded-2xl` in Tailwind). Smaller radii only for inline elements like badges or chips (`rounded-full` or `rounded-lg`).

```
rounded-2xl   → 16px  (cards, panels, containers — minimum)
rounded-3xl   → 24px  (modals, overlays, featured surfaces)
rounded-full  → pill  (badges, tags, avatar chips)
```

Never use `rounded`, `rounded-sm`, or `rounded-md` on containers.

### Tonal Layering

Depth is expressed through background tones, not borders. Stack surfaces using progressively lighter (light mode) or darker (dark mode) backgrounds:

```
Page base → Card surface → Elevated panel → Modal/overlay
  bg-0         bg-50          bg-100           bg-200
```

In dark mode the stack inverts: `bg-950 → bg-900 → bg-850 → bg-800`.

Use `shadow-sm` or `shadow-md` sparingly on elevated panels only — not on every card.

---

## Component Styling Rules

### No 1px Borders

Never use `border`, `border-gray-*`, or `divide-*` to separate content areas. Instead:

- Use background color contrast between adjacent surfaces
- Use `ring-*` utilities only for focus states (accessibility)
- Use `gap-*` and padding to create visual separation in lists/grids

**Do:**
```tsx
<div className="bg-background rounded-2xl p-6">
  <div className="bg-muted rounded-xl p-4">
    {/* nested content */}
  </div>
</div>
```

**Don't:**
```tsx
<div className="border border-gray-200 rounded-lg p-6">
  {/* content */}
</div>
```

### When to Use Background Contrast

- Card vs page: always a distinct background step
- Active/selected state: background shift, not border addition
- Hover state: `hover:bg-muted/60` or similar opacity shift — not border color change
- Disabled state: reduced opacity (`opacity-50`) plus `cursor-not-allowed`

### Focus States

Always preserve keyboard focus visibility. Use:
```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

This is the shadcn/ui standard and must not be removed for accessibility compliance.

---

## Animation with Framer Motion

All motion presets live in `src/utilities/motions.ts`. Import and use these — do not invent custom variants per-component.

### Available Presets

| Key | Purpose |
|---|---|
| `fadeEntrance` | Primary entrance for page sections and cards. Fades up from y+30. |
| `staggerContainer` | Wrapper for lists of stagger items. Accepts optional `staggerChildren` delay (default 0.1s). |
| `staggerItem` | Child of `staggerContainer`. Fades up from y+20. |
| `reveal` | Slow fade for hero images and featured media (1.2s, cubic ease). |
| `parallax` | Scale+fade for featured backgrounds. Starts at scale 1.05. |
| `shimmer` | Looping opacity pulse for skeleton/loading states. |

The `ZIPPY_TRANSITION` spring (`stiffness: 300, damping: 30, mass: 1`) is the standard spring for interactive elements (drawers, dialogs, toggles).

### Usage Pattern

```tsx
import { motion } from 'framer-motion'
import { motionTemplates } from '@/utilities/motions'

// Single element entrance
<motion.div {...motionTemplates.fadeEntrance}>
  <MediaCard />
</motion.div>

// Staggered grid
const container = motionTemplates.staggerContainer(0.08)
<motion.ul variants={container} initial="initial" animate="animate">
  {items.map(item => (
    <motion.li key={item.id} variants={motionTemplates.staggerItem as Variants}>
      <MediaCard />
    </motion.li>
  ))}
</motion.ul>

// Loading shimmer
<motion.div {...motionTemplates.shimmer} className="bg-muted rounded-2xl h-48" />
```

Do not use `animate={{ opacity: 1 }}` inline when a preset covers the use case. Consistent presets = consistent feel.

---

## Dark / Light Theme

Theme is managed via `next-themes` and persisted to a cookie. The provider wraps the app in `src/providers/index.tsx` → `ThemeProvider` → `HeaderThemeProvider`.

### How It Works

- `ThemeProvider` (at `src/providers/Theme/`) wraps `next-themes` `ThemeProvider` with `attribute="class"` and `storageKey="framehouse-theme"`
- The `dark` class is toggled on `<html>` by next-themes
- All Tailwind dark variants (`dark:bg-*`, `dark:text-*`) respond to this class
- Shadcn/ui semantic tokens (`bg-background`, `text-foreground`, etc.) are mapped in the CSS variables to automatically flip between light/dark values

### Toggling / Reading Theme in Components

```tsx
import { useTheme } from 'next-themes'

const { theme, setTheme, resolvedTheme } = useTheme()

// Toggle
setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

// Read (use resolvedTheme, not theme, to handle 'system')
const isDark = resolvedTheme === 'dark'
```

Use `ThemeSelector` component (in `src/components/`) for the standard toggle control — do not build custom theme toggles.

---

## Tailwind Conventions

This project uses **Tailwind CSS v4** with PostCSS. Config is extended for the design system tokens.

### Token Application

- Use semantic tokens (`bg-background`, `text-foreground`, `bg-muted`, `text-muted-foreground`) over literal color classes
- Breakpoints from `cssVariables.js`: `s: 768px`, `m: 1024px`, `l: 1440px`
- Grid: 12-column, responsive. Use `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` patterns

### Responsive Required at All Breakpoints

Every layout must function at mobile (< 768px), tablet (768–1024px), desktop (1024–1440px), and large desktop (> 1440px). Use mobile-first utility ordering.

### Class Ordering Convention

Follow Prettier Tailwind plugin order: layout → spacing → sizing → visual → interactive → responsive → dark variants.

---

## Do's and Don'ts

| Do | Don't |
|---|---|
| `rounded-2xl` or larger on containers | `rounded` or `rounded-md` on cards |
| Tonal background shifts for depth | `border border-gray-*` for separation |
| `motionTemplates.fadeEntrance` for entrances | Custom `initial/animate` per-component |
| `focus-visible:ring-2` for focus states | Removing focus outline entirely |
| `resolvedTheme` from `useTheme()` | Reading `document.documentElement.classList` directly |
| Geist font via Next.js optimization | Loading fonts via `<link>` in `<head>` |
| `opacity-50 cursor-not-allowed` for disabled | `border-dashed` or grayscale filter |
| shadcn/ui semantic color tokens | Hardcoded `rgb()` or hex values in className |
