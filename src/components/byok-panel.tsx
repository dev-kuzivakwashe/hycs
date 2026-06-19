import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, ExternalLink, Eye, EyeOff, Loader2, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  type AgentRole,
  type ProviderId,
  PROVIDERS,
  maskKey,
  modelsForProvider,
  useByok,
} from "@/lib/byok-store";
import { validateProviderKey } from "@/lib/byok-call.functions";
import { CustomSelect } from "@/components/custom-select";
import { ToggleSwitch } from "@/components/toggle-switch";

const PROVIDER_ORDER: ProviderId[] = ["groq", "openai", "gemini", "claude"];
const AGENTS: { role: AgentRole; label: string; desc: string }[] = [
  { role: "planner", label: "Planner", desc: "Turns prompts into reviewable plans." },
  { role: "developer", label: "Developer", desc: "Writes the actual HTML, CSS, JS." },
  { role: "vision", label: "Vision", desc: "Analyses uploaded screenshots." },
];

export function ByokPanel() {
  const { state, update, reset } = useByok();
  const validate = useServerFn(validateProviderKey);
  const [testing, setTesting] = useState<ProviderId | null>(null);

  async function handleTest(p: ProviderId) {
    const key = state.keys[p].key;
    if (!key) return toast.error("Paste an API key first.");
    setTesting(p);
    try {
      const r = await validate({ data: { provider: p, apiKey: key } });
      update((s) => ({
        ...s,
        keys: { ...s.keys, [p]: { ...s.keys[p], status: r.status, lastChecked: Date.now() } },
      }));
      if (r.status === "connected") toast.success(`${PROVIDERS[p].displayName} connected.`);
      else toast.error(r.message);
    } finally {
      setTesting(null);
    }
  }

  function statusPill(status: string) {
    const map: Record<string, { label: string; cls: string }> = {
      connected: { label: "Connected", cls: "bg-green-500/15 text-green-400 border-green-500/30" },
      not_connected: { label: "Not connected", cls: "bg-muted text-muted-foreground border-border" },
      invalid: { label: "Invalid key", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
      rate_limited: { label: "Rate limited", cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
      quota_exceeded: { label: "Quota exceeded", cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
      unavailable: { label: "Unavailable", cls: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
    };
    const m = map[status] || map.not_connected;
    return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${m.cls}`}>{m.label}</span>;
  }

  return (
    <fieldset className="bg-card border rounded-2xl p-5 space-y-4">
      <legend className="px-2 text-xs uppercase tracking-wider text-muted-foreground">AI Providers (BYOK)</legend>

      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="font-semibold text-sm">Bring your own key</h2>
          <p className="text-xs text-muted-foreground">Use your own provider keys. HYCS routes agent calls through them.</p>
        </div>
        <ToggleSwitch checked={state.enabled} onChange={(v) => update({ enabled: v })} label="BYOK enabled" />
      </div>

      {state.enabled && (
        <p className="text-[11px] text-yellow-400/90 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
          Keys are stored in this browser only. Don't use shared devices. HYCS never embeds keys into generated sites or exports.
        </p>
      )}

      <div className="flex items-center gap-1 text-xs">
        <button
          type="button"
          onClick={() => update({ mode: "simple" })}
          className={`px-3 py-1 rounded-full border ${state.mode === "simple" ? "brand-bg text-white border-transparent" : "bg-card hover:bg-accent"}`}
        >
          Simple
        </button>
        <button
          type="button"
          onClick={() => update({ mode: "advanced" })}
          className={`px-3 py-1 rounded-full border ${state.mode === "advanced" ? "brand-bg text-white border-transparent" : "bg-card hover:bg-accent"}`}
        >
          Advanced
        </button>
      </div>

      <div className="space-y-3">
        {PROVIDER_ORDER.map((p) => (
          <ProviderCard
            key={p}
            providerId={p}
            keyState={state.keys[p]}
            statusPill={statusPill}
            onKeyChange={(k) =>
              update((s) => ({ ...s, keys: { ...s.keys, [p]: { ...s.keys[p], key: k, status: "not_connected" } } }))
            }
            onTest={() => handleTest(p)}
            testing={testing === p}
            onRemove={() =>
              update((s) => ({ ...s, keys: { ...s.keys, [p]: { key: "", status: "not_connected" } } }))
            }
            advanced={state.mode === "advanced"}
            customModels={state.customModels[p]}
            onAddModel={(m) =>
              update((s) => ({ ...s, customModels: { ...s.customModels, [p]: [...s.customModels[p], m] } }))
            }
            onRemoveModel={(id) =>
              update((s) => ({ ...s, customModels: { ...s.customModels, [p]: s.customModels[p].filter((x) => x.id !== id) } }))
            }
          />
        ))}
      </div>

      {state.mode === "advanced" && state.enabled && (
        <div className="border-t pt-4 space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Agent assignments</h3>
          {AGENTS.map(({ role, label, desc }) => {
            const a = state.assignments[role];
            const models = modelsForProvider(state, a.provider);
            return (
              <div key={role} className="border rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                  {state.keys[a.provider].key ? statusPill(state.keys[a.provider].status) : statusPill("not_connected")}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <CustomSelect
                    value={a.provider}
                    onChange={(v) => {
                      const prov = v as ProviderId;
                      const first = PROVIDERS[prov].defaultModels[0]?.id || "";
                      update((s) => ({
                        ...s,
                        assignments: { ...s.assignments, [role]: { provider: prov, model: first } },
                      }));
                    }}
                    options={PROVIDER_ORDER.map((p) => ({ value: p, label: PROVIDERS[p].displayName }))}
                  />
                  <CustomSelect
                    value={a.model}
                    onChange={(v) =>
                      update((s) => ({ ...s, assignments: { ...s.assignments, [role]: { ...a, model: v } } }))
                    }
                    options={models.map((m) => ({ value: m.id, label: m.custom ? `${m.label} (custom)` : m.label }))}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => { reset(); toast.success("BYOK reset to defaults."); }}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-accent text-muted-foreground"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Reset BYOK to defaults
      </button>
    </fieldset>
  );
}

function ProviderCard({
  providerId, keyState, statusPill, onKeyChange, onTest, testing, onRemove, advanced, customModels, onAddModel, onRemoveModel,
}: {
  providerId: ProviderId;
  keyState: { key: string; status: string };
  statusPill: (s: string) => React.ReactNode;
  onKeyChange: (k: string) => void;
  onTest: () => void;
  testing: boolean;
  onRemove: () => void;
  advanced: boolean;
  customModels: { id: string; label: string; notes?: string }[];
  onAddModel: (m: { id: string; label: string; notes?: string }) => void;
  onRemoveModel: (id: string) => void;
}) {
  const def = PROVIDERS[providerId];
  const [show, setShow] = useState(false);
  const [draftKey, setDraftKey] = useState(keyState.key);
  const [adding, setAdding] = useState(false);
  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const hasSaved = !!keyState.key;
  const isEditing = !hasSaved || draftKey !== keyState.key;

  return (
    <div className="border rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{def.displayName}</span>
          {def.recommended && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
              Recommended
            </span>
          )}
        </div>
        {statusPill(keyState.status)}
      </div>

      <div className="flex items-center gap-1">
        <div className="flex-1 flex items-center bg-input border rounded-lg px-2">
          <input
            type={show ? "text" : "password"}
            placeholder={hasSaved ? maskKey(keyState.key) : `Paste your ${def.displayName} key`}
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            className="flex-1 bg-transparent outline-none px-1 py-1.5 text-sm font-mono"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" onClick={() => setShow(!show)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Toggle visibility">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        {isEditing ? (
          <button
            type="button"
            onClick={() => { onKeyChange(draftKey); }}
            disabled={!draftKey}
            className="text-xs px-2.5 py-1.5 rounded-lg brand-bg text-white disabled:opacity-40"
          >
            Save
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onTest}
              disabled={testing}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border hover:bg-accent"
            >
              {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Test
            </button>
            <button
              type="button"
              onClick={() => { onRemove(); setDraftKey(""); }}
              className="p-1.5 rounded-lg border hover:bg-accent text-muted-foreground"
              aria-label="Remove key"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      <a href={def.keyUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
        Get a {def.displayName} key <ExternalLink className="w-3 h-3" />
      </a>

      {advanced && (
        <div className="pt-2 border-t mt-2 space-y-1.5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Models</div>
          <ul className="space-y-1">
            {def.defaultModels.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-accent/30">
                <span className="font-mono truncate">{m.id}</span>
                <span className="text-muted-foreground shrink-0 ml-2">default</span>
              </li>
            ))}
            {customModels.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-accent/30">
                <span className="font-mono truncate">{m.id}</span>
                <button type="button" onClick={() => onRemoveModel(m.id)} className="p-0.5 hover:text-red-400 text-muted-foreground" aria-label="Remove model">
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
          {adding ? (
            <div className="space-y-1.5 pt-1">
              <input
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder="Model id (e.g. new-groq-model)"
                className="w-full bg-input border rounded-lg px-2 py-1.5 text-xs font-mono outline-none"
              />
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Display name"
                className="w-full bg-input border rounded-lg px-2 py-1.5 text-xs outline-none"
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!newId.trim()) return;
                    onAddModel({ id: newId.trim(), label: newLabel.trim() || newId.trim() });
                    setNewId(""); setNewLabel(""); setAdding(false);
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg brand-bg text-white"
                >
                  Add
                </button>
                <button type="button" onClick={() => setAdding(false)} className="text-xs px-2.5 py-1 rounded-lg border">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border hover:bg-accent text-muted-foreground"
            >
              <Plus className="w-3 h-3" /> Add custom model
            </button>
          )}
        </div>
      )}
    </div>
  );
}
