## Goal

Ship the three uploaded feature specs (BYOK, Design System, GitHub Deployment), then produce the documentation set described by `README_Structure.md` and `HYCS_Governance.md`.

## 1. Docs reshuffle (no logic)

- Create `READ-THIS/` at repo root.
- Move the four uploaded markdown specs into it verbatim, renaming with hyphens for safe paths:
  - `READ-THIS/HYCS-Governance.md`
  - `READ-THIS/Generation-Contract.md`
  - `READ-THIS/Contribution-Workflow.md`
  - `READ-THIS/README-Structure.md`
- Existing `general.md` / `technical.md` (used by `/documentation`) stay where they are; the `/documentation` route is not touched in this pass.

## 2. BYOK — Bring Your Own Key

Scope = the spec's "In Scope" list only. No team keys, no usage analytics, no new-provider creation.

### Data model (`src/lib/byok-store.ts`, localStorage key `hycs:byok:v1`)
```ts
type ProviderId = "groq" | "openai" | "gemini" | "claude";
type AgentRole = "planner" | "developer" | "vision";
type KeyStatus = "not_connected" | "connected" | "invalid" | "rate_limited" | "quota_exceeded" | "unavailable";
type ByokState = {
  keys: Record<ProviderId, { key: string; status: KeyStatus; lastChecked?: number }>;
  customModels: Record<ProviderId, { id: string; label: string; notes?: string }[]>;
  assignments: Record<AgentRole, { provider: ProviderId; model: string }>;
  mode: "simple" | "advanced";
  updatedAt: number;
};
```

### Provider adapters (`src/lib/byok/providers.ts` + per-provider files)
Common interface:
```ts
interface ProviderAdapter {
  id: ProviderId;
  displayName: string;
  defaultModels: { id: string; label: string }[];
  validateKey(key: string): Promise<KeyStatus>;
  generateText(opts: { key: string; model: string; system: string; prompt: string; json?: boolean }): Promise<string>;
}
```
Adapters: Groq (OpenAI-compatible at `api.groq.com/openai/v1`), OpenAI (`api.openai.com/v1`), Gemini (`generativelanguage.googleapis.com/v1beta`), Claude (`api.anthropic.com/v1/messages`). Each adapter has a `normalizeError(status, body) -> KeyStatus + user message` map (401 → invalid, 429 → rate_limited, 404 model → "model not found", etc.).
Validation hits the provider's lightweight models endpoint (or a 1-token completion when no models endpoint exists).

### Server function (`src/lib/byok-call.functions.ts`)
`callByokAgent({ role, system, prompt, json? })`:
1. Resolve assignment (planner/developer/vision).
2. Resolve API key (passed from the client at call time — never persisted server-side).
3. Dispatch through the adapter.
4. Return `{ text, model, provider }` or a normalized error envelope.

### Wiring existing agents
- `likeable.functions.ts` (developer), `likeable-planner.functions.ts` (planner), `likeable-helpers.functions.ts` (vision + refine) get a thin branch: if BYOK key for the resolved provider exists, route through the adapter; otherwise keep the current Lovable AI Gateway call as the platform default fallback.
- Settings already passes a model picker; replace the hand-rolled list with values derived from BYOK assignments.

### Settings UI (`src/routes/settings.tsx` + new `src/components/byok/*`)
New "AI Providers" section above existing "Models", containing:
- Mode toggle (Simple / Advanced) using the existing `ToggleSwitch`.
- Four provider cards (Groq first, flagged "Recommended"): name, status pill, masked key input (`sk-••••abcd`), Test / Save / Remove buttons.
- Advanced-only: per-provider model list (defaults read-only, user-added removable, "Add model" inline form with id/label/notes), per-agent assignment dropdowns (Planner / Developer / Vision).
- "Reset BYOK to defaults" button.
- Warning banner: "Keys are stored in this browser. Don't use shared devices."

### Security
- Keys never leave the client except as a request argument to the server function and are never logged.
- Strip BYOK state from project export and from anything written to chat history.
- Add a runtime assertion in the export path that the generated HTML/CSS/JS does not contain any stored key substring.

## 3. Design System rules

Pure prompt + helper-level change. No new UI.

- New `src/lib/design-system.ts` exporting `DESIGN_SYSTEM_RULES` (the spec's standards condensed into ~25 imperative bullets covering responsiveness, typography hierarchy, spacing scale, colour & contrast, component consistency, navigation, forms, accessibility).
- Append `DESIGN_SYSTEM_RULES` to the developer-agent system prompt in `likeable.functions.ts` and the planner prompt in `likeable-planner.functions.ts`.
- Add a small Settings toggle "Apply HYCS design system" (default on, stored in existing settings store) so power users can disable it.

## 4. GitHub Deployment (v1 = PAT, OAuth deferred)

The spec calls for OAuth; the existing Roadmap marks real OAuth as future work and the current button is stubbed. v1 ships a real, working deploy via **GitHub Personal Access Token** (already collected in Settings → Integrations) so we hit the acceptance criteria today. OAuth becomes a follow-up.

### Server function (`src/lib/github-deploy.functions.ts`)
`deployToGithub({ token, repo, mode, files, commitMessage })`:
- `mode: "create" | "existing"`. Create → `POST /user/repos { name, private:false, auto_init:true }`. Existing → look up `GET /repos/{owner}/{repo}`.
- Push files via the Git Data API: get base tree, build blobs (`POST /repos/{r}/git/blobs` with base64), `POST /repos/{r}/git/trees`, `POST /repos/{r}/git/commits`, `PATCH /repos/{r}/git/refs/heads/{branch}`.
- Returns `{ repoUrl, commitSha, pagesUrl? }`.
- Maps GitHub errors to the spec's plain-language messages.

### File set
Reuse the existing ZIP export builder so deploy and download produce identical trees: `index.html`, per-page `.html`, `shared/`, generated `README.md` (title + description + generation date), `.gitattributes` for text. Explicit denylist excludes `hycs:byok:*`, `hycs:settings:*`, any `.env`.

### UI (`src/components/github-deploy-modal.tsx`)
- Triggered from the existing "Deploy → GitHub" button.
- Token check → "Connect GitHub" link to Settings if missing.
- Radio: Create new repo / Use existing repo. Repo name input. Commit message input (defaults to "Initial project generation" or "Updated <page title>").
- Progress states: Not Connected / Connected / Deploying / Success (with repo link + Pages hint) / Failed (with retry).
- After success, persist `{ repo, lastCommitSha, lastDeployedAt }` on the project so the home-screen project card can show repo + last deploy date.

### Out of scope this pass
Real OAuth flow, automatic GitHub Pages activation, GitLab/Bitbucket, branch picking. All explicitly listed as "future" in the spec.

## 5. Mirror specs + README

After the features land:

- Write polished markdown versions of the three text specs into READ-THIS, reflecting what we actually shipped (note PAT v1 for GitHub, link to Settings for BYOK):
  - `READ-THIS/BYOK-Specification.md`
  - `READ-THIS/Design-System-Specification.md`
  - `READ-THIS/GitHub-Deployment-Specification.md`
- Write `README.md` at the repo root following all 12 sections of `README_Structure.md`: name, the experiment, core principles, how HYCS works, tech stack, file structure, interface breakdown, what HYCS generates, BYOK, GitHub Deployment, Contributing (link to READ-THIS), License. No em dashes anywhere.
- Update `technical.md` so the Code Map mentions the new BYOK and GitHub deploy modules.

## Acceptance checks before finishing

- BYOK: add a Groq key in Settings → Test succeeds → generate a site using that key → key never appears in the generated HTML, ZIP, or chat log → custom Groq model id added in Advanced mode appears in agent dropdown → Reset returns to defaults.
- Design System: a freshly generated site exhibits a responsive layout, semantic landmarks, hierarchy classes, and a visible spacing scale.
- GitHub: with a valid PAT, "Create new repo" pushes the current project, repo loads on github.com, redeploy after an edit creates a second commit; invalid token shows the spec's plain-language error.
- Docs: `READ-THIS/` contains 7 files, `README.md` exists at root, no em dashes in any of the new docs.

## Risks / call-outs

- **OAuth deferred.** The spec's "Authentication" section assumes OAuth. v1 ships PAT to be functional today; OAuth needs a GitHub App + callback route and is a separate piece of work.
- **Client-held keys.** Spec allows local storage with a clear warning. We follow that, but anyone with the browser profile can read the keys. Server-side encrypted storage is listed as a future enhancement.
- **Claude from the browser.** Anthropic blocks browser-origin requests by default. The BYOK Claude adapter runs inside the server function (where all adapters run), so this is fine, but we should note it in BYOK docs.
- **Scope.** This is a multi-session change. If you want me to ship in stages, the natural split is: (A) docs reshuffle + Design System rules, (B) BYOK, (C) GitHub deploy, (D) README + spec mirrors. Tell me if you'd rather I do A → D sequentially with check-ins, or push the whole thing in one go.
