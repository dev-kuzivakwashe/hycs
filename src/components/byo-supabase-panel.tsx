/**
 * BYO-Supabase settings panel
 * ----------------------------------------------------------------
 * Lets the user paste in *their own* Supabase project URL + anon key,
 * test the connection, and optionally sign in / sign up against it.
 * No HYCS-hosted backend is touched here.
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  Check, Copy, Database, ExternalLink, Eye, EyeOff, Loader2, LogIn,
  LogOut, RotateCcw, Plug, ShieldCheck,
} from "lucide-react";
import {
  SETUP_SQL, testByoConnection, useByoSupabase, useByoUser,
} from "@/lib/byo-supabase";
import { ToggleSwitch } from "@/components/toggle-switch";

export function ByoSupabasePanel() {
  const { config, configured, update, clear } = useByoSupabase();
  const { user, signIn, signUp, signOut } = useByoUser();

  const [url, setUrl] = useState(config.url);
  const [anonKey, setAnonKey] = useState(config.anonKey);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showSQL, setShowSQL] = useState(false);

  // Mini auth form
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleSave() {
    if (!url.trim() || !anonKey.trim()) {
      toast.error("Both project URL and anon key are required.");
      return;
    }
    setTesting(true);
    const err = await testByoConnection(url.trim(), anonKey.trim());
    setTesting(false);
    if (err) {
      toast.error(err);
      return;
    }
    update({ url: url.trim(), anonKey: anonKey.trim() });
    setSavedAt(Date.now());
    toast.success("Supabase project connected.");
  }

  function handleDisconnect() {
    clear();
    setUrl("");
    setAnonKey("");
    setSavedAt(null);
    toast.success("Disconnected. Saved projects stay safe in local storage.");
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      toast.error("Connect your Supabase project first.");
      return;
    }
    setAuthBusy(true);
    try {
      if (authMode === "signin") {
        await signIn(email, password);
        toast.success("Signed in.");
        setEmail(""); setPassword("");
      } else {
        await signUp(email, password);
        setConfirmSent(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  function copySQL() {
    navigator.clipboard.writeText(SETUP_SQL).then(() => toast.success("Setup SQL copied."));
  }

  return (
    <fieldset className="bg-card border rounded-2xl p-5 space-y-4">
      <legend className="px-2 text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Database className="w-3.5 h-3.5" /> Your Supabase
      </legend>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl brand-bg flex items-center justify-center shrink-0">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-sm">Bring your own Supabase project</h2>
            {configured ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-green-500/15 text-green-400 border-green-500/30">Connected</span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">Not connected</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            HYCS is fully local by default — your work lives in your browser. Connect <strong>your own</strong> Supabase
            project here if you also want to sign in and sync the saved-projects list across devices. The URL and anon
            key are stored only on this device.
          </p>
        </div>
      </div>

      {/* Credentials */}
      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Project URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://YOUR-PROJECT.supabase.co"
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-input border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary"
        />

        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Anon / publishable key</label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
            placeholder="eyJhbGciOi... or sb_publishable_..."
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-input border rounded-lg px-3 py-2 pr-10 text-sm font-mono outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
            aria-label={showKey ? "Hide key" : "Show key"}
          >
            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg brand-bg text-white disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />}
            {configured ? "Update & re-test" : "Connect"}
          </button>
          {configured && (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border hover:bg-accent text-muted-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Disconnect
            </button>
          )}
          {savedAt && (
            <span className="text-[11px] text-green-400 inline-flex items-center gap-1">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Find these in your project under <em>Project Settings → API</em>.{" "}
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            Open Supabase dashboard <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>

      {/* Account on YOUR Supabase */}
      {configured && (
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Account</span>
            <span className="text-[11px] text-muted-foreground">— on your project</span>
          </div>

          {user ? (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm min-w-0">
                <div className="font-medium truncate">{user.email ?? user.id}</div>
                <div className="text-xs text-muted-foreground">Signed in to your Supabase</div>
              </div>
              <button
                onClick={() => signOut().then(() => toast.success("Signed out"))}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg hover:bg-accent"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          ) : confirmSent ? (
            <div className="text-xs text-muted-foreground bg-accent/30 rounded-lg p-3">
              Check <strong>{email}</strong> for a confirmation link, then come back and sign in.
              <button onClick={() => { setConfirmSent(false); setAuthMode("signin"); }} className="block mt-2 text-primary hover:underline">
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-input border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 chars)"
                required
                minLength={6}
                className="w-full bg-input border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={authBusy}
                  className="flex-1 flex items-center justify-center gap-1.5 brand-bg text-white text-sm py-2 rounded-lg disabled:opacity-50"
                >
                  {authBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  {authMode === "signin" ? "Sign in" : "Create account"}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode((m) => (m === "signin" ? "signup" : "signin"))}
                  className="text-xs px-3 py-2 rounded-lg border hover:bg-accent text-muted-foreground"
                >
                  {authMode === "signin" ? "Sign up" : "Sign in"}
                </button>
              </div>
            </form>
          )}

          {/* Cloud sync toggle */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="min-w-0">
              <div className="text-sm font-medium">Cloud-sync saved projects</div>
              <p className="text-xs text-muted-foreground">
                Mirror your saved-projects list to a <code>hycs_projects</code> table on your Supabase. Requires the
                setup SQL below.
              </p>
            </div>
            <ToggleSwitch
              checked={config.syncEnabled}
              onChange={(v) => update({ syncEnabled: v })}
              label="Cloud sync enabled"
              disabled={!user}
            />
          </div>

          {/* Setup SQL */}
          <div>
            <button
              onClick={() => setShowSQL((v) => !v)}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              {showSQL ? "Hide" : "Show"} required setup SQL
            </button>
            {showSQL && (
              <div className="mt-2 relative">
                <pre className="bg-input border rounded-lg p-3 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-64">
{SETUP_SQL}
                </pre>
                <button
                  onClick={copySQL}
                  className="absolute top-2 right-2 flex items-center gap-1 text-[10px] px-2 py-1 rounded border bg-card hover:bg-accent"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
}
