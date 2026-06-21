/**
 * Bring-Your-Own Supabase
 * ------------------------------------------------------------------
 * HYCS no longer ships with a built-in user account system. Instead,
 * every contributor / end-user can plug in *their own* Supabase project
 * (URL + anon key) to:
 *   - sign in / sign up against their own auth.users table
 *   - optionally mirror the locally-saved project list & current
 *     project snapshot to a `hycs_projects` table they own
 *
 * Everything in this module runs entirely in the browser. The keys are
 * stored in localStorage on the user's device, NEVER sent to HYCS
 * servers. If no project is configured the app still works fully —
 * projects just live in localStorage only.
 */
import { useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const KEY = "hycs:byosupa:v1";
const EVENT = "hycs:byosupa-change";

export type ByoSupaConfig = {
  url: string;
  anonKey: string;
  /** Mirror the saved-projects list to user's Supabase. */
  syncEnabled: boolean;
};

const empty: ByoSupaConfig = { url: "", anonKey: "", syncEnabled: false };

function read(): ByoSupaConfig {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const v = JSON.parse(raw) as Partial<ByoSupaConfig>;
    return { ...empty, ...v };
  } catch {
    return empty;
  }
}

function write(c: ByoSupaConfig) {
  localStorage.setItem(KEY, JSON.stringify(c));
  window.dispatchEvent(new CustomEvent(EVENT));
  // Reset the cached client so the next call picks up the new URL/key.
  _client = null;
  _clientFingerprint = "";
}

let _client: SupabaseClient | null = null;
let _clientFingerprint = "";

/** Returns a Supabase client built from the user's own project, or null
 *  if they haven't configured one yet. */
export function getByoClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  const cfg = read();
  if (!cfg.url || !cfg.anonKey) return null;
  const fp = cfg.url + "::" + cfg.anonKey;
  if (_client && _clientFingerprint === fp) return _client;
  _client = createClient(cfg.url, cfg.anonKey, {
    auth: {
      // User's own project, user's own storage key — fully isolated.
      storageKey: "hycs:byosupa:auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  _clientFingerprint = fp;
  return _client;
}

/** React hook for the BYO Supabase config. */
export function useByoSupabase() {
  const [config, setConfig] = useState<ByoSupaConfig>(() => read());
  useEffect(() => {
    const sync = () => setConfig(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return {
    config,
    configured: !!(config.url && config.anonKey),
    update: (patch: Partial<ByoSupaConfig>) => write({ ...read(), ...patch }),
    clear: () => write(empty),
  };
}

/** React hook for the current BYO Supabase user (if signed in). */
export function useByoUser() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    function attach() {
      const c = getByoClient();
      if (!c) {
        setUser(null);
        setReady(true);
        return;
      }
      c.auth.getSession().then(({ data }) => {
        setUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email ?? undefined } : null);
        setReady(true);
      });
      const sub = c.auth.onAuthStateChange((_e, session) => {
        setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null);
      });
      unsub = () => sub.data.subscription.unsubscribe();
    }
    attach();
    const onCfg = () => {
      unsub?.();
      attach();
    };
    window.addEventListener(EVENT, onCfg);
    return () => {
      window.removeEventListener(EVENT, onCfg);
      unsub?.();
    };
  }, []);

  return {
    user,
    ready,
    async signIn(email: string, password: string) {
      const c = getByoClient();
      if (!c) throw new Error("Connect your Supabase project first.");
      const { error } = await c.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signUp(email: string, password: string) {
      const c = getByoClient();
      if (!c) throw new Error("Connect your Supabase project first.");
      const { error } = await c.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
    },
    async signOut() {
      const c = getByoClient();
      if (c) await c.auth.signOut();
    },
  };
}

/** One-shot connectivity check: fetches the auth settings endpoint
 *  with the anon key. Returns null on success, a message on failure. */
export async function testByoConnection(url: string, anonKey: string): Promise<string | null> {
  try {
    const u = url.replace(/\/+$/, "") + "/auth/v1/settings";
    const r = await fetch(u, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
    if (!r.ok) return `Supabase responded ${r.status}. Double-check the URL and anon key.`;
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Could not reach the Supabase URL.";
  }
}

/** SQL the user must run in their Supabase project before enabling sync. */
export const SETUP_SQL = `-- Run this in your Supabase SQL editor (Database → SQL).
-- Creates a single table that mirrors HYCS's saved-project list per user.

create table if not exists public.hycs_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null,
  brand text,
  initial_title text,
  description text,
  page_count int default 0,
  message_count int default 0,
  snapshot jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, project_id)
);

grant select, insert, update, delete on public.hycs_projects to authenticated;
grant all on public.hycs_projects to service_role;

alter table public.hycs_projects enable row level security;

create policy "Users manage their own HYCS projects"
  on public.hycs_projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
`;
