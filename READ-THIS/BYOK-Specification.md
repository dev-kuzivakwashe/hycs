# BYOK Specification

> Implementation status: shipped in v0.3. Settings -> AI Providers (BYOK).

## Purpose

BYOK ("Bring Your Own Key") lets HYCS users connect their own AI provider API keys so they can generate sites using their own model access. HYCS stays usable without forcing the platform to carry every user's model bill.

BYOK is a provider and model management system, not just a key input.

## Core Principle

HYCS ships with supported providers and default models. Users can add new model IDs under any supported provider without waiting on a HYCS code update.

## Supported Providers (v1)

| Provider | Default models | Recommended |
| --- | --- | --- |
| Groq | `llama-3.3-70b-versatile`, `openai/gpt-oss-120b`, `llama-3.1-8b-instant` | Yes - simple keys, fast inference |
| OpenAI | `gpt-4o-mini`, `gpt-4o`, `gpt-4.1-mini` | |
| Gemini | `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro` | |
| Claude | `claude-3-5-sonnet-latest`, `claude-3-5-haiku-latest` | |

Each provider has its own request adapter, response normalizer and error map. Claude is invoked from the HYCS server function (Anthropic's API blocks browser-origin requests).

## Provider vs Model

- A provider controls the endpoint, auth and request/response format.
- A model controls behaviour, cost, speed and context window.

Users can add models under a supported provider. They cannot register a new provider in v1 because that requires writing a new adapter.

## Agent Assignments

HYCS uses three core agents. BYOK lets users assign a `{ provider, model }` to each one:

- Planner - turns prompts into reviewable plans.
- Developer - writes the page HTML, CSS and JS.
- Vision - analyses uploaded screenshots.

Defaults:

```
Planner   -> Groq / openai/gpt-oss-120b
Developer -> Groq / llama-3.3-70b-versatile
Vision    -> Gemini / gemini-2.5-flash
```

## Modes

- **Simple** - paste a key, test, save, start generating. HYCS picks the recommended model per agent.
- **Advanced** - per-provider custom model list, per-agent provider + model selection, reset to defaults.

## Custom Models

Add a model by `{ id, label, optional notes }` under any supported provider. Custom models appear in agent selectors immediately. Stored locally.

## Validation

Two levels:

1. **API key** - HYCS calls a cheap endpoint (provider models list, or 1-token completion for Claude) and maps the response to one of: `connected`, `invalid`, `rate_limited`, `quota_exceeded`, `unavailable`.
2. **Model** - bad model IDs surface as `unavailable` with the message "Model not found for this provider account. Check the model id."

All errors are translated into plain-language messages in the UI.

## Storage

- LocalStorage key: `hycs:byok:v1`
- Contents: keys, statuses, custom models, agent assignments, simple/advanced mode, last-updated timestamp.

The UI warns when BYOK is enabled: "Keys are stored in this browser only. Don't use shared devices."

Future enhancement: server-side encrypted key storage.

## Security

- Keys never leave the client except as a request argument to the HYCS server function for the call they belong to.
- Keys are never embedded into generated HTML, CSS or JS.
- Keys are never included in the GitHub deploy file list or the zip export.
- Keys are not written into chat history.
- The UI shows keys masked: `sk-proj-••••••••abcd`.

## Server Function Behaviour

The developer and planner server functions accept an optional `byok: { provider, model, apiKey }`. When present, the call routes through the matching adapter instead of the Lovable AI Gateway. The handler:

1. Resolves the provider adapter.
2. Calls it with the system prompt, the agent context and the user turn.
3. Returns the normalized response to the client.

The client never sees provider-specific request/response shapes.

## Error Examples

| Raw provider error | HYCS message |
| --- | --- |
| 401 Unauthorized | This API key appears to be invalid. Please check the key and try again. |
| 429 Rate limit | Your provider account is being rate limited. Wait a moment or choose another model. |
| Model not found | This model ID could not be found for this provider. Check the model name or choose another model. |

## Settings UI

Located in Settings under "AI Providers (BYOK)". Each provider card shows: name, recommended badge (Groq), connection status, masked key input, Save / Test / Remove, plus a link to where the key can be obtained. Advanced mode adds the custom-model list and per-agent assignment grid. A `Reset BYOK to defaults` button clears everything.

## Acceptance Criteria

All met in v1:

- Add a Groq key, test it, generate using it.
- Add a custom Groq model id and assign it to the Developer agent.
- Invalid keys / model IDs produce clear messages.
- Keys never appear in generated output, exports or chat.
- Settings persist after refresh.
- Reset returns to documented defaults.

## Future

Usage tracking, cost estimation, workspace/team keys, encrypted cloud storage, provider marketplace, capability tags, BYOK import/export.

## Decision Rule

> Does this improve user control over models and keys without making HYCS harder to use?

If yes, ship. If not, simplify.
