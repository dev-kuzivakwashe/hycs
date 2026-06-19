# Design System Specification

> Implementation status: shipped in v0.3 as prompt rules. Toggle in Settings -> Generated Output -> "Apply HYCS design system". Source: `src/lib/design-system.ts`.

## Purpose

The HYCS Design System exists to improve quality and consistency across generated applications. It does not force every site to look the same. It ensures every generated site feels intentional rather than randomly assembled.

## Core Principle

Design systems are rules. Frameworks are architecture. HYCS may establish rules without violating its no-framework principle.

The rules ship as a single block of instructions appended to the Planner and Developer system prompts at generation time. No CSS framework is loaded.

## Design Objectives

Generated applications should be:

- Responsive
- Accessible
- Consistent
- Readable
- Professional
- Mobile-friendly
- Easy to navigate

Quality bar over visual experimentation.

## Standards

### Responsiveness

- Mobile, tablet and desktop layouts must all work.
- Single CSS file per page with min-width breakpoints at 640px, 900px, 1200px.
- No horizontal scroll. Touch targets at least 44px square.
- Fluid type with `clamp()` on headings. No fixed pixel widths on top-level containers.

### Typography

- Four levels minimum: heading (h1), subheading (h2/h3), body, caption.
- Heading line-height 1.1 to 1.25. Body line-height 1.5 to 1.7.
- Maximum two font families per page. Readability over decoration.
- Font sizes in `rem` or `em`. Never `px`.

### Spacing

- One scale, defined as CSS custom properties (`--space-xs` ... `--space-2xl`).
- No arbitrary values like `padding: 17px`.
- Sections share a consistent block-padding token for vertical rhythm.

### Colour

- Named palette: `--bg`, `--surface`, `--text`, `--muted`, `--primary`, `--accent`, plus optional `--danger` / `--success`.
- Body text and primary buttons meet WCAG AA contrast (4.5:1 normal, 3:1 large).
- Accent colours must carry meaning. No decorative accent spam.

### Component Consistency

- Buttons, inputs, cards, dialogs and nav items doing similar work look and behave similarly: same radius, same focus ring, same hover transition.
- One card border-radius per page, reused on every card.

### Navigation

- Discoverable, predictable, responsive.
- Desktop horizontal nav. Mobile hamburger that opens a full-width panel.
- Mark the current page with `.active`.

### Forms

- Every input has a visible label or a placeholder-as-label plus accessible `aria-label`.
- Visible focus ring: `2px solid var(--primary)`. Never remove `outline` without a replacement.
- Submit clearly distinct from secondary actions.

### Accessibility (non-negotiable)

- Semantic landmarks: `header`, `nav`, `main`, `footer`, `section` with `aria-label`.
- Meaningful `alt` text on content images. Decorative images use `alt=""`.
- All interactive elements keyboard-reachable with a visible focus state.

### Motion

- Subtle, under 600ms.
- Respect `prefers-reduced-motion` via media query.

## Toggle

Settings -> Generated Output -> "Apply HYCS design system". Default on. Power users can disable it to test raw model output.

## Acceptance

A freshly generated site should exhibit: responsive layout across the three breakpoints, semantic landmarks, a clear typography hierarchy, a single visible spacing scale and accessible focus states. If a generated page misses any of these, treat it as a prompt-rule bug, not a model bug.

## Future

Per-vertical design profiles, palette generation from uploaded brand colours, automated AA contrast checking on generated CSS, layout templates that contributors can suggest.
