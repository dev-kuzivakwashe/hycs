import { useEffect, useState } from "react";

export type Settings = {
  standardPrompt: string;
  standardPromptActive: boolean;
  model: string;
  customModelName: string;
  customEndpoint: string;
  githubToken: string;
  plannerModel: string;
  plannerEnabled: boolean;
  pexelsEnabled: boolean;
  pixabayEnabled: boolean;
  applyDesignSystem: boolean;
};

const KEY = "hycs:settings:v1";
const EVENT = "hycs:settings-change";

const DEFAULTS: Settings = {
  standardPrompt: "",
  standardPromptActive: false,
  model: "google/gemini-2.5-flash",
  customModelName: "",
  customEndpoint: "",
  githubToken: "",
  plannerModel: "google/gemini-2.5-flash-lite",
  plannerEnabled: true,
  pexelsEnabled: true,
  pixabayEnabled: true,
  applyDesignSystem: true,
};


export const PLANNER_MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (fast, cheap, default)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
];

export const MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (default)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5", label: "GPT-5" },
  { value: "custom", label: "Custom endpoint" },
];

function read(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem("likeable:settings:v1");
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function write(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => read());
  useEffect(() => {
    const sync = () => setSettings(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return {
    settings,
    update: (patch: Partial<Settings>) => write({ ...read(), ...patch }),
  };
}

export function readSettings(): Settings {
  return read();
}
