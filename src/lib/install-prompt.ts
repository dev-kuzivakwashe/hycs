import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export function useInstallPrompt() {
  const [available, setAvailable] = useState(!!deferred);
  const [installed, setInstalled] = useState(
    typeof window !== "undefined" &&
      window.matchMedia?.("(display-mode: standalone)").matches,
  );

  useEffect(() => {
    const cb = () => setAvailable(!!deferred);
    listeners.add(cb);
    const mm = window.matchMedia("(display-mode: standalone)");
    const onChange = () => setInstalled(mm.matches);
    mm.addEventListener?.("change", onChange);
    return () => {
      listeners.delete(cb);
      mm.removeEventListener?.("change", onChange);
    };
  }, []);

  async function promptInstall() {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      deferred = null;
      listeners.forEach((l) => l());
    }
    return outcome;
  }

  return { available, installed, promptInstall };
}
