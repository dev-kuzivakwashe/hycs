# HYCS — Technical Documentation

## Purpose

HYCS (Hyper-text Cascading Scripts) is a free, browser-based vibe coding platform that converts natural-language prompts into standalone, no-framework websites. Every generated page is a self-contained HTML document with its own inline structure, styles and scripts. There is no React, no bundler, no build step in the output — just files you can host anywhere.

## Architecture

HYCS itself is built with **TanStack Start** (React 19 + Vite 7), running on Cloudflare Workers via the Lovable Cloud runtime. The platform is split into three layers:

1. **Client UI** — the chat, preview, code view and settings, written in React + Tailwind v4.
2. **Server functions** — typed RPC endpoints (`createServerFn`) that talk to AI models and free image APIs.
3. **Local storage layer** — projects, messages, drafts and settings live in `localStorage`. HYCS is free; nothing is persisted in a database.

### Agents

| Agent | Model (default) | Role |
| --- | --- | --- |
| **Planner** | `google/gemini-2.5-flash-lite` | Turns a raw prompt into a structured, reviewable plan |
| **Developer** | `google/gemini-2.5-flash` | Writes the actual HTML / CSS / JS page |
| **Vision** | `google/gemini-2.5-flash` | Analyses uploaded UI screenshots into a spec |

The planner output is rendered as a `PlanCard` that the user can edit, approve or reject before any code is written.

## Code Map

```
src/
  routes/
    index.tsx           Home + build screen (chat / preview / code)
    settings.tsx        All configuration
    documentation.tsx   This documentation, with tabs
    output.tsx          Standalone iframe render of the current page
    __root.tsx          App shell, meta, PWA links
  components/
    logo.tsx            HYCS logo
    plan-card.tsx       Plan approval card
    auth-modal.tsx      Optional sign-in
    markdown.tsx        Shared Markdown renderer for chat & docs
    animated-title.tsx  Flip-up/down headline rotator
    custom-select.tsx   Themed select replacement
  lib/
    likeable.functions.ts          Developer agent (BYOK-aware)
    likeable-planner.functions.ts  Planner agent (BYOK-aware)
    likeable-helpers.functions.ts  Vision + prompt refinement
    fetch-image.functions.ts       Pexels / Pixabay image lookup
    byok-store.ts                  BYOK state + provider registry
    byok-call.functions.ts         Provider adapters: Groq, OpenAI, Gemini, Claude
    github-deploy.functions.ts     GitHub deploy via Personal Access Token
    design-system.ts               Generation rules appended to agent prompts
    likeable-store.ts              Project + page state
    likeable-settings.ts           User settings (models, toggles, keys)
    install-prompt.ts              PWA beforeinstallprompt hook
    use-auth.ts                    Auth state hook

```

## Page Generation Contract

The developer agent returns one JSON object containing:

- `summary` — a one-line chat reply,
- `slug` + `title` — page identity,
- `pageHtml` — the body of the page (no `<html>`, `<head>`, `<body>` tags),
- optional `brand`, `themeCss`, `headerHtml`, `footerHtml` for the first page or layout edits.

The platform then wraps `pageHtml` with the shared header / footer / theme into a complete standalone HTML document and injects a tiny vanilla-JS router that swaps between sibling pages without a full reload.

HYCS does **not** ship Bootstrap, Tailwind or any other framework into the generated output. The model produces semantic HTML and writes its own CSS per page.

## Image Pipeline

Every `https://source.unsplash.com/featured/...` URL the model emits is resolved server-side at generation time:

1. Try **Pexels** (if enabled in Settings → Integrations and `PEXELS_API_KEY` is configured).
2. Fall back to **Pixabay** (if enabled and `PIXABAY_API_KEY` is configured).
3. Otherwise leave the Unsplash URL as a final fallback.

The same lookup powers project cards on the home screen, so saved projects show a coherent cover image based on their description.

## Persistence Model

HYCS stores everything in the browser:

- `hycs:project:v2` — the active project.
- `hycs:project:snapshot:<id>` — archived projects.
- `hycs:projects:v1` — the saved-projects index.
- `hycs:settings:v1` — user settings (models, API toggles, etc.).

There is no server-side database for user projects. Sign-in (Supabase Auth) is optional and currently only used to gate features like GitHub deploy.

## PWA

HYCS ships a web app manifest and PWA icons. The settings page exposes the custom install prompt via the `beforeinstallprompt` event. After install it runs full-screen.

## Repository

Source: <https://github.com/dev-kuzivakwashe/hycs> · MIT License.
