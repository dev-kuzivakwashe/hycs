import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, Download, Plug, BookOpen, Trash2, Check, Smartphone,
  Github, LogOut, Cpu, FileText, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Logo } from "@/components/logo";
import { useInstallPrompt } from "@/lib/install-prompt";
import { useLikeableStore } from "@/lib/likeable-store";
import { useSettings, MODEL_OPTIONS, PLANNER_MODEL_OPTIONS } from "@/lib/likeable-settings";
import { useAuth } from "@/lib/use-auth";
import { AuthModal } from "@/components/auth-modal";
import { CustomSelect } from "@/components/custom-select";
import { ToggleSwitch } from "@/components/toggle-switch";
import { ByokPanel } from "@/components/byok-panel";


export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings - HYCS" },
      { name: "description", content: "Manage your HYCS workspace, install the app, configure AI models, and toggle image integrations." },
    ],
  }),
  component: SettingsPage,
});

const REPO_URL = "https://github.com/dev-kuzivakwashe/hycs";
const APP_VERSION = "0.3.0";

function SettingsPage() {
  const { available, installed, promptInstall } = useInstallPrompt();
  const { reset } = useLikeableStore();
  const { settings, update } = useSettings();
  const { user, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  async function handleInstall() {
    const r = await promptInstall();
    if (r === "unavailable") {
      toast.info("Install prompt not ready yet. In Chrome: open the browser menu and choose 'Install app' or 'Add to Home Screen'.");
    } else if (r === "accepted") {
      toast.success("HYCS installed!");
    }
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

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Documentation, placed at the top per spec */}
        <fieldset className="bg-card border rounded-2xl p-1.5">
          <Link to="/documentation" className="flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-accent/40 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl brand-bg flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">Documentation</div>
                <div className="text-xs text-muted-foreground truncate">General overview and technical architecture of HYCS.</div>
              </div>
            </div>
            <span className="text-muted-foreground text-sm shrink-0">→</span>
          </Link>
        </fieldset>

        {/* Account */}
        <fieldset className="bg-card border rounded-2xl p-5">
          <legend className="px-2 text-xs uppercase tracking-wider text-muted-foreground">Account</legend>
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
              Sign in or create account
            </button>
          )}
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            HYCS is free. We do not save your generated projects to a database, only your account, settings and keys. You can build without signing in at all.
          </p>
        </fieldset>

        {/* Install */}
        <fieldset className="bg-card border rounded-2xl p-5">
          <legend className="px-2 text-xs uppercase tracking-wider text-muted-foreground">Install</legend>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl brand-bg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">Install HYCS</h2>
              <p className="text-xs text-muted-foreground">Add to your home screen for a full-screen, app-like experience.</p>
            </div>
          </div>
          {installed ? (
            <div className="flex items-center gap-2 text-sm text-green-400"><Check className="w-4 h-4" /> Installed.</div>
          ) : (
            <button onClick={handleInstall} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl brand-bg text-white text-sm font-medium">
              <Download className="w-4 h-4" /> {available ? "Install HYCS" : "Add to Home Screen"}
            </button>
          )}
        </fieldset>

        {/* Standard Prompt */}
        <fieldset className="bg-card border rounded-2xl p-5">
          <legend className="px-2 text-xs uppercase tracking-wider text-muted-foreground">Standard Prompt</legend>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Always prepend</h2>
            <ToggleSwitch
              checked={settings.standardPromptActive}
              onChange={(v) => update({ standardPromptActive: v })}
              label="Standard prompt active"
            />
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Prepended to every prompt. Use it to lock in a style guide.
          </p>
          <textarea
            value={settings.standardPrompt}
            onChange={(e) => update({ standardPrompt: e.target.value })}
            rows={4}
            placeholder="e.g. Always use a dark theme, Inter typography, and rounded-2xl cards. Prefer soft gradients."
            className="w-full bg-input border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </fieldset>

        {/* AI Model */}
        <fieldset className="bg-card border rounded-2xl p-5">
          <legend className="px-2 text-xs uppercase tracking-wider text-muted-foreground">Developer Agent</legend>
          <h2 className="font-semibold flex items-center gap-2 mb-3"><Cpu className="w-4 h-4" /> Coding model</h2>
          <CustomSelect
            value={settings.model}
            onChange={(v) => update({ model: v })}
            options={MODEL_OPTIONS}
          />
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
        </fieldset>

        {/* Planner Agent */}
        <fieldset className="bg-card border rounded-2xl p-5">
          <legend className="px-2 text-xs uppercase tracking-wider text-muted-foreground">Planner Agent</legend>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Cpu className="w-4 h-4" /> Planning model</h2>
            <ToggleSwitch
              checked={settings.plannerEnabled}
              onChange={(v) => update({ plannerEnabled: v })}
              label="Planner enabled"
            />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            A lighter model that turns your prompt into a reviewable plan before the Developer Agent writes code.
          </p>
          <CustomSelect
            value={settings.plannerModel}
            onChange={(v) => update({ plannerModel: v })}
            options={PLANNER_MODEL_OPTIONS}
            disabled={!settings.plannerEnabled}
          />
        </fieldset>

        {/* Integrations with obedient toggles */}
        <fieldset className="bg-card border rounded-2xl p-5">
          <legend className="px-2 text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Plug className="w-3.5 h-3.5" /> Integrations</legend>
          <div className="divide-y divide-border -mx-2">
            <IntegrationRow
              name="Pexels"
              desc="Royalty-free hero and project-card images."
              enabled={settings.pexelsEnabled}
              onChange={(v) => update({ pexelsEnabled: v })}
            />
            <IntegrationRow
              name="Pixabay"
              desc="Backup image source when Pexels has no match."
              enabled={settings.pixabayEnabled}
              onChange={(v) => update({ pixabayEnabled: v })}
            />
            <IntegrationRow
              name="Unsplash"
              desc="Final image fallback used when both Pexels and Pixabay are off or empty."
              enabled
              disabled
            />
          </div>
        </fieldset>

        {/* BYOK */}
        <ByokPanel />

        {/* Design system rules */}
        <fieldset className="bg-card border rounded-2xl p-5">
          <legend className="px-2 text-xs uppercase tracking-wider text-muted-foreground">Generated Output</legend>
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-3">
              <h2 className="font-semibold text-sm">Apply HYCS design system</h2>
              <p className="text-xs text-muted-foreground">Adds responsiveness, hierarchy, spacing scale and accessibility rules to every generation. Recommended on.</p>
            </div>
            <ToggleSwitch
              checked={settings.applyDesignSystem}
              onChange={(v) => update({ applyDesignSystem: v })}
              label="Design system enabled"
            />
          </div>
        </fieldset>

        {/* GitHub - PAT-based v1 */}
        <fieldset className="bg-card border rounded-2xl p-5 space-y-3">
          <legend className="px-2 text-xs uppercase tracking-wider text-muted-foreground">Connections</legend>
          <div className="flex items-center gap-2 text-sm">
            <Github className="w-4 h-4" />
            <span className="font-medium">GitHub</span>
            {settings.githubToken ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-green-500/15 text-green-400 border-green-500/30">Connected</span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">Not connected</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Add a Personal Access Token with <strong>repo</strong> scope to deploy generated sites to your own GitHub.
          </p>
          <a href="https://github.com/settings/tokens/new?scopes=repo&description=HYCS%20deploy" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            Create a new token <ExternalLink className="w-3 h-3" />
          </a>
          <input
            type="password"
            value={settings.githubToken}
            onChange={(e) => update({ githubToken: e.target.value })}
            placeholder="ghp_..."
            className="w-full bg-input border rounded-lg px-3 py-2 text-sm font-mono outline-none"
            autoComplete="off"
          />
        </fieldset>


        {/* Workspace */}
        <fieldset className="bg-card border rounded-2xl p-1.5">
          <legend className="px-2 text-xs uppercase tracking-wider text-muted-foreground">Workspace</legend>
          <div className="divide-y divide-border">
            <MetaRow label="App" value="HYCS - Hyper-text Cascading Scripts" />
            <MetaRow label="Version" value={APP_VERSION} />
            <MetaRow label="Year" value="2026" />
            <MetaRow
              label="Repository"
              value={
                <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  github.com/dev-kuzivakwashe/hycs <ExternalLink className="w-3 h-3" />
                </a>
              }
            />
            <MetaRow
              label="License"
              value={
                <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  MIT <ExternalLink className="w-3 h-3" />
                </a>
              }
            />
            <button
              onClick={() => { reset(); toast.success("Workspace cleared"); }}
              className="w-full px-4 py-3 flex items-center gap-2 text-sm text-red-400 hover:bg-red-500/5"
            >
              <Trash2 className="w-4 h-4" /> Clear current project
            </button>
          </div>
        </fieldset>
      </main>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-4 py-3 flex justify-between items-center text-sm gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="truncate text-right">{value}</span>
    </div>
  );
}

function IntegrationRow({
  name, desc, enabled, onChange, disabled,
}: { name: string; desc: string; enabled: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between px-2 py-3 gap-3">
      <div className="min-w-0 pr-2">
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ToggleSwitch
        checked={enabled}
        onChange={(v) => onChange?.(v)}
        disabled={disabled}
        label={`${name} integration toggle`}
      />
    </div>
  );
}
