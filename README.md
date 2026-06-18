# Likeable

> An open-source, AI-powered website builder. A mini-clone of [Lovable](https://lovable.dev) made *with* Lovable.

Likeable lets you chat your way to a multi-page Bootstrap 5 website. Each prompt either generates a brand‑new page or edits the current one. Pages share a header, footer, and theme so the whole site stays cohesive without re‑describing the brand on every turn.

> **Status:** v0.2 — working multi-page generation, live preview, code view, image upload, style analysis, prompt refinement, project export, mock GitHub & Netlify deploys, PWA install.

---

## Features

### Build flow
- **Chat-driven generation** — one prompt → one page (`home`, `about`, `services`, `contact`, …).
- **Edit / New Page modes** — toggle whether the next prompt edits the current page or adds a new one.
- **Shared design system** — first page generates `theme.css` (CSS variables), `header.html` (Bootstrap navbar with all page links), and `footer.html`. Subsequent pages reuse them and the header auto-regenerates when a page is added.
- **In-iframe SPA router** — clicking nav links inside the preview swaps pages without a reload.
- **Image fallback** — broken `<img>` tags are replaced with a theme-coloured SVG placeholder at runtime, so missing photos never break the layout.
- **External link guard** — links to outside domains inside the preview show a designed confirmation instead of accidentally navigating away.

### Inputs & assistance
- **Upload image** — attach a custom photo to use as the hero, or have Gemini analyse it and produce a style guide that gets folded back into your prompt.
- **Refine prompt** — single-click AI rewrite of your draft into a richer spec.
- **Standard Prompt** — a persistent style guide in Settings that's appended to every generation.
- **Model picker** — Gemini 2.5 Flash / Pro, GPT-5 Mini / GPT-5, or a Custom endpoint.

### Output
- **Preview tab** — sandboxed iframe with Bootstrap loaded.
- **Code tab** — syntax-highlighted HTML, CSS, and JS via [highlight.js](https://highlightjs.org), with a one-click copy.
- **Fullscreen preview** — expand the iframe to the whole viewport.
- **Export** — download the whole project as a `.zip` containing every page, `shared/`, `sitemap.xml`, and `robots.txt`.
- **Mock deploys** — Netlify and GitHub buttons (GitHub requires sign-in + a personal access token in Settings; the call is stubbed pending real OAuth).

### Platform
- **PWA** — installable from Settings with a custom install flow, manifest, and icon set.
- **Authentication** — email/password via Lovable Cloud (auto-confirm enabled for the demo).
- **Persistent project** — the active project lives in `localStorage` under `likeable:project:v2`.

---

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) v1 (React 19 + Vite 7) |
| Routing | TanStack Router, file-based under `src/routes/` |
| Styling | Tailwind CSS v4 (CSS-first config in `src/styles.css`) |
| UI primitives | shadcn/ui + Radix |
| State | Plain `localStorage` + a tiny event-bus hook (`src/lib/likeable-store.ts`) |
| Server logic | `createServerFn` (no edge functions) in `src/lib/*.functions.ts` |
| AI | Lovable AI Gateway (Google + OpenAI models) |
| Auth & DB | Lovable Cloud (Supabase under the hood) |
| Images | Pexels → Pixabay → Unsplash fallback chain (server-side keyword resolution) |
| Code highlighting | highlight.js (xml, css, javascript) |
| PWA | Custom `beforeinstallprompt` capture in `src/lib/install-prompt.ts` |

---

## Project Layout

```text
src/
├── routes/
│   ├── __root.tsx         App shell, head metadata, providers
│   ├── index.tsx          Builder UI (chat + preview + code)
│   ├── output.tsx         Standalone fullscreen preview
│   ├── settings.tsx       PWA install, prompt config, model, integrations
│   └── documentation.tsx  Renders this README
├── lib/
│   ├── likeable.functions.ts        Main generateSite() server fn
│   ├── likeable-helpers.functions.ts resolveImage / analyzeImage / refinePrompt
│   ├── likeable-store.ts            Project state + wrapPage() HTML wrapper
│   ├── likeable-settings.ts         Persistent settings store
│   ├── install-prompt.ts            PWA install handler
│   └── use-auth.ts                  Supabase auth hook
├── components/
│   ├── logo.tsx
│   └── auth-modal.tsx
└── integrations/supabase/   Generated client + types (do not edit)
public/
├── manifest.webmanifest
└── icons/                   PWA icon set
```

---

## The Build Pipeline

1. **Plan** — user describes a site.
2. **Theme** — first turn generates `theme.css`, header, footer, and the home page.
3. **Pages** — every subsequent prompt either *edits* the current page or *adds* a new one. The header is regenerated so its nav always includes every existing page.
4. **Stitch** — `wrapPage(project, slug)` injects shared partials, loads Bootstrap, and embeds a tiny SPA router so nav links work inside the preview.
5. **Export / Deploy** — bundle to `.zip` or push to GitHub / Netlify (mock).

---

## Roadmap

- [ ] Real GitHub OAuth + `/api/deploy/github` server route
- [ ] Real Netlify deploy via their API
- [ ] Per-page versioning and rollback
- [ ] Component library (reusable cards, CTAs) shared across pages
- [ ] Form submissions wired to Lovable Cloud
- [ ] Theme designer UI (edit `:root` variables visually)
- [ ] Lovable AI image generation for hero shots

---

## Contributing

Likeable is open source. Open issues and PRs welcome — especially around prompt quality, the system prompt's structural rules, and additional deploy targets.

**Likeable made with Lovable. Go.** 💗
