import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, Download, Plug, BookOpen, Trash2, Check, Smartphone,
  Github, LogOut, Cpu, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Logo } from "@/components/logo";
import { useInstallPrompt } from "@/lib/install-prompt";
import { useLikeableStore } from "@/lib/likeable-store";
import { useSettings, MODEL_OPTIONS, PLANNER_MODEL_OPTIONS } from "@/lib/likeable-settings";
import { useAuth } from "@/lib/use-auth";
import { AuthModal } from "@/components/auth-modal";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Likeable" },
      { name: "description", content: "Manage your Likeable workspace, install the app, configure your AI model, and deploy to GitHub." },
    ],
  }),
  component: SettingsPage,
});

const INTEGRATIONS = [
  { name: "Bootstrap", desc: "Inject Bootstrap 5 CSS into generated pages.", status: "Connected" },
  { name: "Pexels", desc: "Royalty-free hero images (set PEXELS_API_KEY).", status: "Connected" },
  { name: "Pixabay", desc: "Backup image source (set PIXABAY_API_KEY).", status: "Connected" },
  { name: "Unsplash", desc: "Final image fallback.", status: "Connected" },
  { name: "Google Fonts", desc: "Pull any font family from fonts.google.com.", status: "Connected" },
  { name: "Netlify Deploy", desc: "One-click static deploys.", status: "Mock" },
  { name: "GitHub Deploy", desc: "Push generated site to a new repo.", status: "Mock" },
  { name: "Resend Email", desc: "Wire contact forms to email.", status: "Available" },
];

function SettingsPage() {
  const { available, installed, promptInstall } = useInstallPrompt();
  const { reset } = useLikeableStore();
  const { settings, update } = useSettings();
  const { user, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  async function handleInstall() {
    const r = await promptInstall();
    if (r === "unavailable") toast.info("Install prompt not ready. Use your browser's 'Add to Home Screen'.");
    else if (r === "accepted") toast.success("Likeable installed!");
  }

  function connectGitHub() {
    if (!user) { setAuthOpen(true); return; }
    // Mock OAuth flow — real flow would redirect to GitHub
    update({ githubToken: "gh_mock_token_" + Math.random().toString(36).slice(2, 10) });
    toast.success("GitHub connected (mock token stored)");
  }

  return (
    <div className="min-h-screen">
      <Toaster theme="dark" position="top-center" />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <header className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          <Logo className="w-5 h-5" />
          <span className="font-bold">Settings</span>
        </div>
        <div className="w-12" />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Account */}
        <section className="bg-card border rounded-2xl p-5">
          <h2 className="font-semibold mb-3">Account</h2>
          {user ? (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm min-w-0">
                <div className="font-medium truncate">{user.email}</div>
                <div className="text-xs text-muted-foreground">Signed in</div>
              </div>
              <button onClick={() => { signOut(); toast.success("Signed out"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-accent">
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          ) : (
            <button onClick={() => setAuthOpen(true)} className="w-full brand-bg text-white py-2 rounded-lg text-sm font-medium">
              Sign in / Sign up
            </button>
          )}
        </section>

        {/* Install */}
        <section className="bg-card border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl brand-bg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">Install Likeable</h2>
              <p className="text-xs text-muted-foreground">Add to your home screen for a full-screen, app-like experience.</p>
            </div>
          </div>
          {installed ? (
            <div className="flex items-center gap-2 text-sm text-green-400"><Check className="w-4 h-4" /> Installed.</div>
          ) : (
            <button onClick={handleInstall} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl brand-bg text-white text-sm font-medium">
              <Download className="w-4 h-4" /> {available ? "Install Likeable" : "Add to Home Screen"}
            </button>
          )}
        </section>

        {/* Standard Prompt */}
        <section className="bg-card border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Standard Prompt</h2>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox" checked={settings.standardPromptActive}
                onChange={(e) => update({ standardPromptActive: e.target.checked })}
                className="accent-pink-500"
              />
              Active
            </label>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Prepended to every prompt. Use it to lock in a style guide.
          </p>
          <textarea
            value={settings.standardPrompt}
            onChange={(e) => update({ standardPrompt: e.target.value })}
            rows={4}
            placeholder="e.g. Always use a dark theme, Inter typography, and rounded-2xl cards. Prefer soft gradients."
            className="w-full bg-input border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-pink-500 resize-y"
          />
        </section>

        {/* AI Model */}
        <section className="bg-card border rounded-2xl p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-3"><Cpu className="w-4 h-4" /> AI Model</h2>
          <select
            value={settings.model}
            onChange={(e) => update({ model: e.target.value })}
            className="w-full bg-input border rounded-lg px-3 py-2 text-sm outline-none"
          >
            {MODEL_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          {settings.model === "custom" && (
            <div className="mt-3 space-y-2">
              <input
                placeholder="Custom model name (e.g. anthropic/claude-3.5)"
                value={settings.customModelName}
                onChange={(e) => update({ customModelName: e.target.value })}
                className="w-full bg-input border rounded-lg px-3 py-2 text-sm outline-none"
              />
              <input
                placeholder="API endpoint URL"
                value={settings.customEndpoint}
                onChange={(e) => update({ customEndpoint: e.target.value })}
                className="w-full bg-input border rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
          )}
        </section>

        {/* Planner Agent */}
        <section className="bg-card border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Cpu className="w-4 h-4" /> Planner Agent</h2>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox" checked={settings.plannerEnabled}
                onChange={(e) => update({ plannerEnabled: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              {settings.plannerEnabled ? "Enabled" : "Disabled"}
            </label>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            A separate, lighter model that turns your prompt into a reviewable plan before the Developer Agent writes code.
            Approve uses the suggested default answers for any open questions.
          </p>
          <select
            value={settings.plannerModel}
            onChange={(e) => update({ plannerModel: e.target.value })}
            disabled={!settings.plannerEnabled}
            className="w-full bg-input border rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-50"
          >
            {PLANNER_MODEL_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </section>

        {/* GitHub */}
        <section className="bg-card border rounded-2xl p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-3"><Github className="w-4 h-4" /> GitHub</h2>
          {settings.githubToken ? (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-green-400 flex items-center gap-2"><Check className="w-4 h-4" /> Connected</div>
              <button onClick={() => update({ githubToken: "" })} className="text-xs text-muted-foreground hover:text-foreground">Disconnect</button>
            </div>
          ) : (
            <button onClick={connectGitHub} className="w-full flex items-center justify-center gap-2 border rounded-lg py-2 text-sm hover:bg-accent">
              <Github className="w-4 h-4" /> Connect GitHub
            </button>
          )}
        </section>

        {/* Docs */}
        <section>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">Resources</h3>
          <Link to="/documentation" className="flex items-center justify-between bg-card border rounded-2xl px-4 py-3.5 hover:bg-accent/40 transition-colors">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-pink-400" />
              <div>
                <div className="text-sm font-medium">Documentation</div>
                <div className="text-xs text-muted-foreground">How Likeable plans to build full sites.</div>
              </div>
            </div>
            <span className="text-muted-foreground text-sm">→</span>
          </Link>
        </section>

        {/* Integrations */}
        <section>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
            <Plug className="w-3.5 h-3.5" /> Integrations
          </h3>
          <div className="bg-card border rounded-2xl divide-y divide-border overflow-hidden">
            {INTEGRATIONS.map((i) => (
              <div key={i.name} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 pr-3">
                  <div className="text-sm font-medium">{i.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{i.desc}</div>
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full shrink-0 ${
                  i.status === "Connected" ? "bg-green-500/15 text-green-400" :
                  i.status === "Mock" ? "bg-blue-500/15 text-blue-300" :
                  "bg-muted text-muted-foreground"
                }`}>{i.status}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Workspace */}
        <section>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">Workspace</h3>
          <div className="bg-card border rounded-2xl divide-y divide-border overflow-hidden">
            <div className="px-4 py-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Plan</span><span>Free preview</span>
            </div>
            <div className="px-4 py-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Model</span><span className="truncate ml-2">{settings.model}</span>
            </div>
            <div className="px-4 py-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Version</span><span>0.2.0</span>
            </div>
            <button
              onClick={() => { reset(); toast.success("Workspace cleared"); }}
              className="w-full px-4 py-3 flex items-center gap-2 text-sm text-red-400 hover:bg-red-500/5"
            >
              <Trash2 className="w-4 h-4" /> Clear current project
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
