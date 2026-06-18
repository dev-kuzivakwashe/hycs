# Likeable Super-Upgrade Plan

This is a large batch (10 features). Before I build, here's how I'll sequence it and a few decisions I need confirmed. The current stack is **TanStack Start + React + Supabase (Lovable Cloud) + Gemini via Lovable AI Gateway** — not vanilla JS. I'll keep that stack (your "vanilla JS" note applies to the generated output sites, which already are vanilla). The 10 features map cleanly onto the existing React app.

## Build order (one coherent update)

**Phase A — Backend / server fns**
1. `resolveImage` server fn → Pexels → Pixabay → Unsplash → SVG fallback. Keys read from `process.env` (secrets), in-memory per-request cache.
2. `analyzeImage` server fn → Gemini vision style-guide extractor.
3. `refinePrompt` server fn → Gemini prompt rewriter.
4. Extend `generateSite` to accept `standardPrompt`, `selectedModel`, `userImageDataUrl`, and to pre-resolve image keywords in returned HTML via `resolveImage`.

**Phase B — Chat UI (index.tsx)**
5. 3-dot ⋮ menu next to chat input → upward floating modal with **Upload Image** + **Refine Prompt**.
6. Image upload modal → "Use in site" vs "Analyze for style" (Gemini). User images persisted in project (max 5).
7. Full-screen preview toggle + floating minimize button + ESC handler.
8. Syntax-highlighted Code tab using `highlight.js` (already npm-installable) + Copy button.
9. Page-load animation: inject `@keyframes likeableFadeSlideUp` into shared theme CSS and wrap `<main>` content with `.likeable-page-wrapper` in `wrapPage()`.

**Phase C — Settings & Auth**
10. Supabase email/password auth (auto-confirm ON, per your spec) + Sign in/up modal in header + Logout in Settings.
11. Settings additions: **Standard Prompt** textarea + Active toggle, **AI Model** dropdown (Gemini/GPT-5/Claude + Custom with endpoint URL), **Connect GitHub** (mock token), **Deploy to GitHub** button (auth-gated, mock API call).

## Decisions I need from you

1. **API keys for Pexels & Pixabay** — I'll request them via the secrets tool (`PEXELS_API_KEY`, `PIXABAY_API_KEY`). OK?
2. **Model dropdown options** — Lovable AI Gateway only supports Google + OpenAI models (not Claude). I'll list **Gemini 2.5 Flash (default)**, **Gemini 2.5 Pro**, **GPT-5 Mini**, **GPT-5**, and **Custom**. Claude won't actually work through our gateway — keeping it in the UI would be a broken option. OK to drop Claude?
3. **GitHub deploy** — per your spec I'll stub the actual API call (`console.log`) and only wire the UI + mock token storage. Real OAuth + repo creation comes later. Confirm.
4. **Auto-confirm email** — you explicitly asked for it; I'll enable it (normally we don't by default). Confirming.
5. **Image resolution timing** — should I resolve `source.unsplash.com/...` URLs in AI output → Pexels/Pixabay **post-generation** (server fn rewrites `<img src>` before saving)? That's the only way to actually use the paid APIs without retraining the model. Confirm.

Reply with anything to change, or "go" and I'll ship the whole batch.
