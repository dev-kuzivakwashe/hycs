/**
 * HYCS Design System Rules.
 *
 * Appended to the developer and planner system prompts so every generated
 * page meets a baseline of responsiveness, accessibility, hierarchy and
 * visual consistency. Rules, not framework.
 *
 * Sourced from READ-THIS/Design-System-Specification.md.
 */
export const DESIGN_SYSTEM_RULES = `
# HYCS DESIGN SYSTEM (apply to every generated page)

Quality bar over visual experimentation. Useful software first.

Responsiveness
- Mobile, tablet and desktop layouts must all work. Use a single CSS file with min-width breakpoints at 640px, 900px and 1200px.
- No horizontal scroll. Touch targets at least 44px square.
- Fluid type with clamp() for headings; never set width in px on top-level containers.

Typography hierarchy
- Always establish four levels: heading (h1), subheading (h2/h3), body, caption.
- Headings get tighter line-height (1.1 to 1.25); body line-height 1.5 to 1.7.
- Maximum two font families per page. Readable over decorative.
- Use rem/em. Never px for font-size.

Spacing scale
- Pick a single scale (4/8/16/24/32/48/64 or similar) defined as CSS custom properties (--space-xs ... --space-2xl) and reuse it. No arbitrary values like padding: 17px.
- Vertical rhythm: sections share a consistent block padding token.

Colour
- Define a small named palette via CSS custom properties: --bg, --surface, --text, --muted, --primary, --accent, plus one optional --danger/--success when needed.
- Body text and primary buttons must hit WCAG AA contrast (4.5:1 normal, 3:1 large).
- Accent colours must carry meaning: CTA, link, focus ring, status. Do not spray accents for decoration.

Component consistency
- Buttons, inputs, cards, dialogs and nav items that do similar work must look and behave similarly across the page (same radius, same focus ring, same hover transition).
- Pick one card border-radius for the page and reuse it on every card.

Navigation
- Discoverable, predictable, responsive. Desktop = horizontal nav; mobile = hamburger that opens a full-width panel.
- Mark the current page with an .active class.

Forms
- Every input has a visible label OR a placeholder used as the label plus an accessible aria-label.
- Show focus rings (2px solid var(--primary)). Never remove outline without a replacement.
- Submit buttons clearly distinct from secondary actions.

Accessibility (non-negotiable)
- Semantic landmarks: header, nav, main, footer, section with aria-labels.
- Images have meaningful alt text. Decorative images use alt="".
- Interactive elements reachable by keyboard; visible focus state.

Motion
- Subtle, under 600ms. Respect prefers-reduced-motion with @media query.
`.trim();
