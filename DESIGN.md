# Design System Specification: The Curated Gallery

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Curated Gallery."** 

In a world of cluttered Digital Asset Management tools, this system acts as a high-end, editorial stage for the assets it houses. It moves away from the "software as a utility" look and toward "software as a showcase." By leveraging a pure white canvas, intentional asymmetry, and bold, monospaced accents, we create an environment that feels like a modern art museum—minimalistic, professional, but with a sharp, creative edge.

The design breaks the "template" feel by utilizing massive corner radii (16px to 24px) and high-contrast typographic hits that demand attention, ensuring that the interface never competes with the creative work, but rather frames it with sophistication.

---

## 2. Colors
Our palette is a sophisticated blend of archival neutrals and high-energy creative accents.

### The Palette Logic
- **Primary (`#7f5700` / `primary_container: #d79922`):** Our signature Gold. Use this for high-level brand moments and primary actions. It represents the "Gilded" quality of premium assets.
- **Secondary (`#445aa5`):** A deep, scholarly blue used for stability and secondary navigation elements.
- **Tertiary (`#bb1800` / `tertiary_container: #ff7f67`):** A vibrant "Exhibition Red." Use this for critical alerts or "Artsy" accents that need to pop against the white background.
- **Surface (`#ffffff`):** The background must remain pure white (`surface_container_lowest`) to maintain an editorial, airy feel.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders for sectioning are strictly prohibited. 
Structure must be defined through:
1.  **Background Tonal Shifts:** Placing a `surface_container_low` (`#f3f3f4`) element against a `surface` (`#f9f9f9`) or `surface_container_lowest` (`#ffffff`) background.
2.  **Negative Space:** Using the Spacing Scale (specifically `12` to `24` units) to create "invisible" boundaries.

### Glass & Gradient Rule
To prevent a "flat" or generic feel, floating menus and overlays should utilize **Glassmorphism**. Apply `surface_variant` at 70% opacity with a `backdrop-blur` of 20px. For primary CTAs, a subtle linear gradient from `primary` to `primary_container` is encouraged to add "visual soul."

---

## 3. Typography
The typography strategy is a play between Swiss-style minimalism and brutalist accents.

- **Logo/Brand (Varela Round):** Soft and approachable. It sits as the "curator's mark" on the experience.
- **Headings & Body (Inter):** The workhorse. Inter provides the professional, neutral tone required for a DAM. 
    - *Display-Lg* should be tracked tightly (-0.02em) for an editorial headline feel.
- **Accents & Bold Content (Rubik Mono One):** This is our "Artsy" edge. Use this exclusively for metadata (file sizes, dates, categories), labels, or high-impact numbers. It should feel like the technical labels found next to a painting in a gallery.

---

## 4. Elevation & Depth
We achieve hierarchy through **Tonal Layering** rather than traditional structural lines.

- **The Layering Principle:** Treat the UI as stacked sheets of fine paper. 
    - Base: `surface_container_lowest` (#ffffff).
    - Floating Cards: `surface` (#f9f9f9).
    - Inner Metadata Containers: `surface_container` (#eeeeee).
- **Ambient Shadows:** When a "floating" effect is required, use extra-diffused shadows. 
    - *Shadow Token:* `0px 20px 40px rgba(26, 28, 28, 0.06)`. This mimics natural ambient light.
- **The "Ghost Border" Fallback:** If a container absolutely requires a boundary for accessibility, use a **Ghost Border**: `outline_variant` (#d5c4af) at 15% opacity.

---

## 5. Components

### Buttons
- **Primary:** Background `primary_container` (#d79922), Text `on_primary_container`. Radius: `ROUND_TWENTY_FOUR`. Use for the main "Upload" or "Publish" actions.
- **Tertiary/Artsy:** Background `tertiary`, Text `on_tertiary`. Used sparingly for high-contrast "Delete" or "Alert" states.
- **States:** On hover, use a 2px offset "Ghost Border" to create a tactile, layered feel.

### Cards & Asset Thumbnails
- **Rule:** Forbid all divider lines.
- **Styling:** Use `ROUND_SIXTEEN` for thumbnails. The card should have zero border. The asset's name should be `title-sm` (Inter), and the file type should be `label-md` using **Rubik Mono One** to provide that creative edge.

### Input Fields
- **Style:** Underline only or soft-filled `surface_container_low`. 
- **Radius:** `ROUND_SIXTEEN` for filled states.
- **Focus:** Transition the "Ghost Border" to a 2px `primary` line.

### High-Contrast Gallery Labels (Custom Component)
For DAM-specific metadata (e.g., "4K Resolution" or "Copyright Active"), use high-contrast Chips.
- **Colors:** `tertiary_container` (#ff7f67) background with `on_tertiary_container` text.
- **Typography:** `label-sm` in **Rubik Mono One**.

---

## 6. Do’s and Don’ts

### Do:
- **Use "Rubik Mono One" sparingly.** It is a spice, not the main course. Use it for data points, not sentences.
- **Lean into white space.** If a layout feels crowded, increase the spacing to the next tier in the scale (e.g., move from `8` to `12`).
- **Use Tonal Shifts.** Separate the sidebar from the main stage using a shift from `surface_container_lowest` to `surface_container_low`.

### Don't:
- **Don't use 100% black.** Use `on_surface` (#1a1c1c) for text to maintain a sophisticated, soft-ink feel.
- **Don't use sharp corners.** Everything must use at least `ROUND_SIXTEEN` to maintain the "Modern & Artistic" personality.
- **Don't use standard dividers.** If you need to separate content, use a 40px gap or a change in background color.