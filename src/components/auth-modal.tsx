import { useState } from "react";
import { X, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        // If user is null OR no session yet, confirmation email is required.
        if (!data.session) {
          setConfirmSent(true);
          return;
        }
        toast.success("Account created. You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setConfirmSent(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[10001] bg-black/70 flex items-center justify-center p-4" onClick={close}>
      <div className="bg-card border rounded-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{confirmSent ? "Check your email" : mode === "signin" ? "Sign in" : "Create account"}</h2>
          <button onClick={close} className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
        </div>

        {confirmSent ? (
          <div className="text-sm space-y-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full brand-bg mx-auto">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <p className="text-center">We sent a confirmation link to <strong>{email}</strong>.</p>
            <p className="text-xs text-muted-foreground text-center">
              Click the link in that email to verify your address, then come back and sign in. HYCS is free and does not save your projects to a database; sign-in only stores your account, settings and keys.
            </p>
            <button onClick={() => { setConfirmSent(false); setMode("signin"); }} className="w-full brand-bg text-white rounded-lg py-2 text-sm font-medium">
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              HYCS is free. Sign-in only stores your account, settings and keys, not your generated projects.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" autoComplete="email"
                className="w-full bg-input border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 chars)" autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="w-full bg-input border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit" disabled={loading}
                className="w-full brand-bg text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "signin" ? "Sign in" : "Sign up"}
              </button>
            </form>
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground"
            >
              {mode === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
