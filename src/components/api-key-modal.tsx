import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, KeyRound, ExternalLink, Code2, Settings } from "lucide-react";
import { PROVIDERS, applySingleKey, detectProvider, type ProviderId } from "@/lib/byok-store";

type Props = {
  open: boolean;
  /** The user's pending prompt — shown so they know what will run next. */
  pendingPrompt?: string;
  onClose: () => void;
  /** Called after a key is saved; the host should re-trigger the build. */
  onReady: (provider: ProviderId) => void;
};

export function ApiKeyModal({ open, pendingPrompt, onClose, onReady }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const detected = useMemo<ProviderId>(() => detectProvider(value) || "groq", [value]);
  const provider = PROVIDERS[detected];
  const isDetected = !!detectProvider(value);

  useEffect(() => {
    if (open) {
      setValue("");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const k = value.trim();
    if (!k) { setError("Paste an API key to continue."); return; }
    const res = applySingleKey(k, isDetected ? detected : "groq");
    if (!res) { setError("That doesn't look like a valid key."); return; }
    onReady(res.provider);
  }

  return (
    <div
      className="fixed inset-0 z-[10002] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-key-title"
    >
      <div
        className="bg-card border rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg brand-bg flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h3 id="api-key-title" className="font-bold leading-tight">API Key Not Configured</h3>
              <p className="text-xs text-muted-foreground mt-0.5">One key powers both planning and coding.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cancel"
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <a
          href={PROVIDERS.groq.keyUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm text-primary hover:underline mb-3"
        >
          Click here to get an API key (Groq is free & recommended)
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <input
              ref={inputRef}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(null); }}
              placeholder="gsk_... (paste your Groq key, or any supported provider)"
              className="w-full bg-input border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {value.trim()
                  ? isDetected
                    ? <>Detected: <span className="text-foreground font-medium">{provider.displayName}</span></>
                    : <>Couldn't detect provider — will save as <span className="text-foreground font-medium">Groq</span></>
                  : <>Default: <span className="text-foreground font-medium">Groq</span></>}
              </span>
              {error && <span className="text-destructive">{error}</span>}
            </div>
          </div>

          {pendingPrompt && (
            <div className="text-xs bg-accent/40 rounded-lg px-3 py-2 border line-clamp-2">
              <span className="text-muted-foreground">Will build: </span>
              <span>{pendingPrompt}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!value.trim()}
            className="w-full flex items-center justify-center gap-2 brand-bg text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
          >
            <Code2 className="w-4 h-4" /> Code
          </button>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <Link to="/settings" onClick={onClose} className="flex items-center gap-1 hover:text-foreground">
              <Settings className="w-3 h-3" /> Advanced settings
            </Link>
            <span>Keys stay in your browser.</span>
          </div>
        </form>
      </div>
    </div>
  );
}
