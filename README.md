# HYCS

HYCS (Hyper-text Cascading Scripts) is an open-source experiment that turns natural-language prompts into standalone, no-framework websites.

## The Experiment

HYCS exists to answer one question: can AI become the primary maintainer of useful applications when the output is restricted to plain HTML, CSS and JavaScript?

Generated sites use only:

- HTML
- CSS
- JavaScript
- Standard browser and web APIs

No React, no Vue, no Angular, no bundler. The site you generate today still opens in a browser ten years from now.

## Core Principles

- No-framework output
- User ownership of every generated project
- Portability across any static host
- Simplicity over abstraction
- Independence from HYCS after export
- Accessibility as a baseline, not a feature
- Deployability without a build step

These principles are formal. The full version lives in [READ-THIS/Generation-Contract.md](READ-THIS/Generation-Contract.md).

## How HYCS Works

```
Prompt
  -> Planner agent turns it into a reviewable plan
  -> You approve or edit the plan
  -> Developer agent writes the HTML, CSS and JS
  -> Preview renders in a sandboxed iframe
  -> Export as zip or deploy to GitHub
```

Each prompt either adds a new page or edits the current one. Header, footer and theme persist across pages.

## Tech Stack

HYCS itself is built with:

- TanStack Start v1 (React 19, Vite 7)
- Tailwind CSS v4
- shadcn/ui primitives
- Lovable Cloud runtime on Cloudflare Workers
- LocalStorage persistence for projects, settings and BYOK
- Bring-Your-Own AI keys (Groq / OpenAI / Gemini / Claude) — no default gateway
- Bring-Your-Own Supabase project for optional sign-in and cross-device sync

The stack describes the HYCS platform. It says nothing about what HYCS generates - generated sites are framework-free by contract.

## File Structure

```text
src/
  routes/              page + server routes (file-based)
  components/          chat, plan card, BYOK panel, GitHub deploy modal
  lib/
    likeable.functions.ts          developer agent
    likeable-planner.functions.ts  planner agent
    likeable-helpers.functions.ts  vision + prompt refinement
    byok-store.ts                  BYOK state + provider registry
    byok-call.functions.ts         provider adapters (Groq, OpenAI, Gemini, Claude)
    github-deploy.functions.ts     GitHub deploy via Personal Access Token
    design-system.ts               rules appended to generator prompts
    likeable-store.ts              project + page state
    likeable-settings.ts           user settings
READ-THIS/             governance + spec documents
README.md              this file
```

Routes own pages, lib owns logic, components owns reusable UI. Generation systems live entirely in `src/lib/*.functions.ts`.

## HYCS Interface Breakdown

- **Prompt and chat interface** - main screen, drives every generation.
- **Planning interface (PlanCard)** - editable plan the user approves before any code is written.
- **Preview window** - sandboxed iframe with the live site.
- **Code viewer** - syntax-highlighted HTML of the current page.
- **Output route** - standalone fullscreen render.
- **Settings** - BYOK providers, design system toggle, integrations, GitHub token.
- **Documentation** - General and Technical tabs at `/documentation`.
- **Saved projects** - grid of past projects on the home screen.

## What HYCS Generates

HYCS generates multi-page static websites. Every page is a self-contained HTML document with its own inline CSS and vanilla JS. Pages share a header, footer and theme that get stitched in at preview time and at export time.

Generated sites are deployable as-is to GitHub Pages, Cloudflare Pages, Netlify, Vercel static or any traditional web server.

## BYOK (Bring Your Own Key)

HYCS supports your own provider keys for four providers out of the box:

- Groq (recommended for beginners)
- OpenAI
- Gemini
- Claude

You can add custom model IDs under any supported provider without changing the HYCS code, and assign different models to the Planner, Developer and Vision agents. Keys live in your browser only and are never embedded into generated sites or exports.

Full spec: [READ-THIS/BYOK-Specification.md](READ-THIS/BYOK-Specification.md).

## GitHub Deployment

HYCS can push your generated project directly into a GitHub repository you own:

1. Add a GitHub Personal Access Token (with `repo` scope) in Settings or in the deploy dialog.
2. Click `GitHub` in the toolbar.
3. Choose `Create new repo` or `Use existing repo`, set a commit message and deploy.

HYCS commits only the project files. No keys, no settings, no BYOK data. The repository belongs to you - delete HYCS access and the project keeps working.

Full spec: [READ-THIS/GitHub-Deployment-Specification.md](READ-THIS/GitHub-Deployment-Specification.md). OAuth is on the roadmap; v1 uses PAT.

## Contributing

Contributions are welcome from developers, researchers, designers, testers and documentation writers. Before opening a PR, read:

- [READ-THIS/HYCS-Governance.md](READ-THIS/HYCS-Governance.md)
- [READ-THIS/Generation-Contract.md](READ-THIS/Generation-Contract.md)
- [READ-THIS/Contribution-Workflow.md](READ-THIS/Contribution-Workflow.md)
- [READ-THIS/Contributor-Readiness-Checklist.md](READ-THIS/Contributor-Readiness-Checklist.md)

The HYCS platform UI is a protected area; major interface changes need maintainer approval. The Generation Contract is the hard line: nothing in this repo should cause HYCS to emit React, Vue, Angular, Svelte, Next.js, Nuxt, Remix or any framework-required output.

Before opening the repository broadly, finish the community basics: `LICENSE`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue templates, a pull request template and CI checks for linting, types and formatting.

## License

MIT. See [LICENSE](LICENSE).
