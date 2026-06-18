import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Logo } from "@/components/logo";
import readme from "../../README.md?raw";

export const Route = createFileRoute("/documentation")({
  head: () => ({
    meta: [
      { title: "Documentation — Likeable" },
      { name: "description", content: "Likeable is an open-source AI website builder. Read the current state, architecture, and roadmap." },
      { property: "og:title", content: "Likeable Documentation" },
      { property: "og:description", content: "Open-source AI website builder — architecture, features, roadmap." },
    ],
    links: [{ rel: "canonical", href: "/documentation" }],
  }),
  component: Docs,
});

function Docs() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <Link to="/settings" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Settings
        </Link>
        <div className="flex items-center gap-2">
          <Logo className="w-5 h-5" />
          <span className="font-bold">Docs</span>
        </div>
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Builder →</Link>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8">
        <article className="prose-likeable">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>
        </article>
      </main>
    </div>
  );
}
