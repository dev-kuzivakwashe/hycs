import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, BookOpen, Cpu, FileText, Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { Markdown } from "@/components/markdown";
import generalMd from "../../general.md?raw";
import technicalMd from "../../technical.md?raw";
import byokMd from "../../READ-THIS/BYOK-Specification.md?raw";
import contributionMd from "../../READ-THIS/Contribution-Workflow.md?raw";
import designMd from "../../READ-THIS/Design-System-Specification.md?raw";
import generationMd from "../../READ-THIS/Generation-Contract.md?raw";
import githubMd from "../../READ-THIS/GitHub-Deployment-Specification.md?raw";
import governanceMd from "../../READ-THIS/HYCS-Governance.md?raw";
import readmeStructureMd from "../../READ-THIS/README-Structure.md?raw";
import readinessMd from "../../READ-THIS/Contributor-Readiness-Checklist.md?raw";

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

const docs = [
  { id: "general", label: "General", icon: BookOpen, content: generalMd },
  { id: "technical", label: "Technical", icon: Cpu, content: technicalMd },
  { id: "governance", label: "Governance", icon: FileText, content: governanceMd },
  { id: "generation", label: "Generation Contract", icon: FileText, content: generationMd },
  { id: "contribution", label: "Contribution Workflow", icon: FileText, content: contributionMd },
  { id: "byok", label: "BYOK", icon: FileText, content: byokMd },
  { id: "design", label: "Design System", icon: FileText, content: designMd },
  { id: "github", label: "GitHub Deployment", icon: FileText, content: githubMd },
  { id: "readme", label: "README Structure", icon: FileText, content: readmeStructureMd },
  { id: "readiness", label: "Contributor Readiness", icon: FileText, content: readinessMd },
] as const;

type Tab = (typeof docs)[number]["id"];

function Docs() {
  const [tab, setTab] = useState<Tab>("general");
  const [menuOpen, setMenuOpen] = useState(false);
  const activeDoc = docs.find((doc) => doc.id === tab) ?? docs[0];

  return (
    <div className="min-h-screen">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-20">
        <Link to="/settings" className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Settings
        </Link>
        <div className="flex min-w-0 items-center justify-center gap-2">
          <Logo className="w-5 h-5 shrink-0" />
          <span className="truncate font-bold">Documentation</span>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="documentation-menu"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
        >
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          <span className="sr-only">Toggle documentation menu</span>
        </button>
        <Link to="/" className="hidden text-xs text-muted-foreground hover:text-foreground lg:inline">Builder →</Link>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside
          id="documentation-menu"
          className={`${menuOpen ? "block" : "hidden"} rounded-lg border bg-card p-2 lg:block lg:sticky lg:top-20 lg:self-start`}
        >
          <nav aria-label="Documentation sections" className="space-y-1">
            {docs.map((doc) => {
              const Icon = doc.icon;
              return (
                <TabButton
                  key={doc.id}
                  active={tab === doc.id}
                  onClick={() => {
                    setTab(doc.id);
                    setMenuOpen(false);
                  }}
                  icon={<Icon className="h-3.5 w-3.5" />}
                >
                  {doc.label}
                </TabButton>
              );
            })}
          </nav>
        </aside>

        <article key={tab} className="min-w-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <Markdown>{activeDoc.content}</Markdown>
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
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-all ${
        active ? "brand-bg text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
