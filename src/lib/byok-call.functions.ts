import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * BYOK provider adapters. All four providers are normalized into a single
 * { text } response so HYCS agents can stay provider-agnostic.
 *
 * Adapters never log keys. They translate provider errors into one of a
 * small set of KeyStatus codes plus a plain-language message.
 */

const providerEnum = z.enum(["groq", "openai", "gemini", "claude"]);
type ProviderId = z.infer<typeof providerEnum>;

type AdapterArgs = {
  apiKey: string;
  model: string;
  system: string;
  user: string;
};

type AdapterResult = { text: string };

class ProviderError extends Error {
  constructor(public status: "invalid" | "rate_limited" | "quota_exceeded" | "unavailable" | "model_not_found", message: string) {
    super(message);
  }
}

function classifyHttp(status: number, body: string): ProviderError {
  if (status === 401 || status === 403) return new ProviderError("invalid", "API key is invalid or lacks permission for this provider.");
  if (status === 429) return new ProviderError("rate_limited", "Provider rate limit hit. Try again in a moment.");
  if (status === 402) return new ProviderError("quota_exceeded", "Provider quota exceeded. Top up your account or switch model.");
  if (status === 404 || /model.*(not\s*found|does\s*not\s*exist)/i.test(body)) {
    return new ProviderError("model_not_found", "Model not found for this provider account. Check the model id.");
  }
  return new ProviderError("unavailable", `Provider returned ${status}.`);
}

async function callOpenAICompatible(baseUrl: string, args: AdapterArgs): Promise<AdapterResult> {
  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${args.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: args.model,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw classifyHttp(r.status, t);
  }
  const j = await r.json();
  const text = j.choices?.[0]?.message?.content ?? "";
  return { text };
}

async function callGemini(args: AdapterArgs): Promise<AdapterResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent?key=${encodeURIComponent(args.apiKey)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: args.system }] },
      contents: [{ role: "user", parts: [{ text: args.user }] }],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw classifyHttp(r.status, t);
  }
  const j = await r.json();
  const text = j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ?? "";
  return { text };
}

async function callClaude(args: AdapterArgs): Promise<AdapterResult> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": args.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: 4096,
      system: args.system,
      messages: [{ role: "user", content: args.user }],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw classifyHttp(r.status, t);
  }
  const j = await r.json();
  const text = (j.content || []).map((c: { type: string; text?: string }) => (c.type === "text" ? c.text || "" : "")).join("");
  return { text };
}

export async function callProvider(provider: ProviderId, args: AdapterArgs): Promise<AdapterResult> {
  if (provider === "groq") return callOpenAICompatible("https://api.groq.com/openai/v1", args);
  if (provider === "openai") return callOpenAICompatible("https://api.openai.com/v1", args);
  if (provider === "gemini") return callGemini(args);
  if (provider === "claude") return callClaude(args);
  throw new ProviderError("unavailable", "Unknown provider.");
}

/** Validate an API key with a cheap models-list call. */
export const validateProviderKey = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      provider: providerEnum,
      apiKey: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const { provider, apiKey } = data;
    try {
      if (provider === "groq") {
        const r = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } });
        if (!r.ok) throw classifyHttp(r.status, await r.text().catch(() => ""));
      } else if (provider === "openai") {
        const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } });
        if (!r.ok) throw classifyHttp(r.status, await r.text().catch(() => ""));
      } else if (provider === "gemini") {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
        if (!r.ok) throw classifyHttp(r.status, await r.text().catch(() => ""));
      } else if (provider === "claude") {
        // Anthropic has no plain models endpoint; do a 1-token completion.
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model: "claude-3-5-haiku-latest", max_tokens: 1, messages: [{ role: "user", content: "ping" }] }),
        });
        if (!r.ok) throw classifyHttp(r.status, await r.text().catch(() => ""));
      }
      return { status: "connected" as const, message: "Connection successful." };
    } catch (e) {
      if (e instanceof ProviderError) {
        const status = e.status === "model_not_found" ? "unavailable" : e.status;
        return { status, message: e.message };
      }
      return { status: "unavailable" as const, message: e instanceof Error ? e.message : "Connection failed." };
    }
  });

/** Generic BYOK text call used by HYCS agents when a BYOK key is configured. */
export const callByokText = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      provider: providerEnum,
      model: z.string().min(1),
      apiKey: z.string().min(1),
      system: z.string(),
      user: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const r = await callProvider(data.provider, { apiKey: data.apiKey, model: data.model, system: data.system, user: data.user });
      return { ok: true as const, text: r.text };
    } catch (e) {
      if (e instanceof ProviderError) return { ok: false as const, status: e.status, message: e.message };
      return { ok: false as const, status: "unavailable" as const, message: e instanceof Error ? e.message : "Provider call failed." };
    }
  });
