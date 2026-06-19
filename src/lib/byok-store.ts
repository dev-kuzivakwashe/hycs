import { useEffect, useState } from "react";

export type ProviderId = "groq" | "openai" | "gemini" | "claude";
export type AgentRole = "planner" | "developer" | "vision";
export type KeyStatus =
  | "not_connected"
  | "connected"
  | "invalid"
  | "rate_limited"
  | "quota_exceeded"
  | "unavailable";

export type CustomModel = { id: string; label: string; notes?: string };

export type ProviderDef = {
  id: ProviderId;
  displayName: string;
  recommended?: boolean;
  /** Where the user gets a key. */
  keyUrl: string;
  defaultModels: { id: string; label: string }[];
  /** Models capable of accepting an image input. */
  visionModels?: string[];
};

export const PROVIDERS: Record<ProviderId, ProviderDef> = {
  groq: {
    id: "groq",
    displayName: "Groq",
    recommended: true,
    keyUrl: "https://console.groq.com/keys",
    defaultModels: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
      { id: "openai/gpt-oss-120b", label: "GPT OSS 120B" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
    ],
  },
  openai: {
    id: "openai",
    displayName: "OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
    defaultModels: [
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
    ],
    visionModels: ["gpt-4o", "gpt-4o-mini", "gpt-4.1-mini"],
  },
  gemini: {
    id: "gemini",
    displayName: "Gemini",
    keyUrl: "https://aistudio.google.com/app/apikey",
    defaultModels: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ],
    visionModels: ["gemini-2.5-flash", "gemini-2.5-pro"],
  },
  claude: {
    id: "claude",
    displayName: "Claude",
    keyUrl: "https://console.anthropic.com/settings/keys",
    defaultModels: [
      { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
    ],
    visionModels: ["claude-3-5-sonnet-latest"],
  },
};

export type ByokState = {
  enabled: boolean;
  mode: "simple" | "advanced";
  keys: Record<ProviderId, { key: string; status: KeyStatus; lastChecked?: number }>;
  customModels: Record<ProviderId, CustomModel[]>;
  assignments: Record<AgentRole, { provider: ProviderId; model: string }>;
  updatedAt: number;
};

const KEY = "hycs:byok:v1";
const EVENT = "hycs:byok-change";

function emptyKeys(): ByokState["keys"] {
  return {
    groq: { key: "", status: "not_connected" },
    openai: { key: "", status: "not_connected" },
    gemini: { key: "", status: "not_connected" },
    claude: { key: "", status: "not_connected" },
  };
}

const DEFAULTS: ByokState = {
  enabled: false,
  mode: "simple",
  keys: emptyKeys(),
  customModels: { groq: [], openai: [], gemini: [], claude: [] },
  assignments: {
    planner: { provider: "groq", model: "openai/gpt-oss-120b" },
    developer: { provider: "groq", model: "llama-3.3-70b-versatile" },
    vision: { provider: "gemini", model: "gemini-2.5-flash" },
  },
  updatedAt: 0,
};

function read(): ByokState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<ByokState>;
    return {
      ...DEFAULTS,
      ...parsed,
      keys: { ...emptyKeys(), ...(parsed.keys || {}) },
      customModels: { ...DEFAULTS.customModels, ...(parsed.customModels || {}) },
      assignments: { ...DEFAULTS.assignments, ...(parsed.assignments || {}) },
    };
  } catch {
    return DEFAULTS;
  }
}

function write(s: ByokState) {
  localStorage.setItem(KEY, JSON.stringify({ ...s, updatedAt: Date.now() }));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function readByok(): ByokState {
  return read();
}

export function useByok() {
  const [state, setState] = useState<ByokState>(() => read());
  useEffect(() => {
    const sync = () => setState(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return {
    state,
    update(patch: Partial<ByokState> | ((s: ByokState) => ByokState)) {
      const cur = read();
      const next = typeof patch === "function" ? patch(cur) : { ...cur, ...patch };
      write(next);
    },
    reset() {
      write(DEFAULTS);
    },
  };
}

/** Mask a key for safe display, e.g. sk-proj-•••••abcd. */
export function maskKey(key: string): string {
  if (!key) return "";
  const tail = key.slice(-4);
  const head = key.slice(0, Math.min(7, Math.max(0, key.length - 4)));
  return `${head}${"•".repeat(8)}${tail}`;
}

/** Return the full model list for a provider (defaults + user custom). */
export function modelsForProvider(state: ByokState, p: ProviderId): { id: string; label: string; custom: boolean }[] {
  const def = PROVIDERS[p].defaultModels.map((m) => ({ ...m, custom: false }));
  const custom = (state.customModels[p] || []).map((m) => ({ id: m.id, label: m.label, custom: true }));
  return [...def, ...custom];
}

/** Resolve agent assignment to { provider, model, apiKey } if a key exists. Otherwise null. */
export function resolveAgent(state: ByokState, role: AgentRole): { provider: ProviderId; model: string; apiKey: string } | null {
  if (!state.enabled) return null;
  const a = state.assignments[role];
  const k = state.keys[a.provider]?.key || "";
  if (!k) return null;
  return { provider: a.provider, model: a.model, apiKey: k };
}
