import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, BookOpen, Cpu } from "lucide-react";
import { Logo } from "@/components/logo";
import { Markdown } from "@/components/markdown";
import generalMd from "../../general.md?raw";
import technicalMd from "../../technical.md?raw";

export const Route = createFileRoute("/documentation")({
  head: () => ({
    meta: [
      { title: "Documentation - HYCS" },
      { name: "description", content: "HYCS is a free, no-framework vibe coding platform. Read the general overview and technical architecture." },
      { property: "og:title", content: "HYCS Documentation" },
      { property: "og:description", content: "General overview and technical architecture of HYCS." },
    ],
    links: [{ rel: "canonical", href: "/documentation" }],
  }),
  component: Docs,
});

type Tab = "general" | "technical";

function Docs() {
  const [tab, setTab] = useState<Tab>("general");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <Link to="/settings" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Settings
        </Link>
        <div className="flex items-center gap-2">
          <Logo className="w-5 h-5" />
          <span className="font-bold">Documentation</span>
        </div>
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Builder →</Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div
          role="tablist"
          aria-label="Documentation sections"
          className="inline-flex w-full sm:w-auto items-center gap-1 p-1 rounded-xl bg-card border mb-6"
        >
          <TabButton active={tab === "general"} onClick={() => setTab("general")} icon={<BookOpen className="w-3.5 h-3.5" />}>
            General
          </TabButton>
          <TabButton active={tab === "technical"} onClick={() => setTab("technical")} icon={<Cpu className="w-3.5 h-3.5" />}>
            Technical
          </TabButton>
        </div>

        <article key={tab} className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <Markdown>{tab === "general" ? generalMd : technicalMd}</Markdown>
        </article>
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 text-sm rounded-lg transition-all ${
        active ? "brand-bg text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
