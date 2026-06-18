import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, useEffect } from "react";
import {
  ArrowUp, Download, Rocket, Code2, Eye, Sparkles, Plus, MessageSquare,
  ExternalLink, Settings, FilePlus2, FileText, MoreVertical, Image as ImageIcon,
  Wand2, Maximize2, Minimize2, Copy, X, Github, LogIn,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import hljs from "highlight.js/lib/core";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import { Logo } from "@/components/logo";
import { AuthModal } from "@/components/auth-modal";
import { generateSite } from "@/lib/likeable.functions";
import { analyzeImage, refinePrompt } from "@/lib/likeable-helpers.functions";
import { planRequest, planToFinalSpec, type Plan } from "@/lib/likeable-planner.functions";
import { useLikeableStore, wrapPage, useSavedProjects, archiveCurrentProject, loadSavedProject, deleteSavedProject, type Message, type Project } from "@/lib/likeable-store";
import { useSettings } from "@/lib/likeable-settings";
import { useAuth } from "@/lib/use-auth";
import { PlanCard } from "@/components/plan-card";
import JSZip from "jszip";

hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("javascript", javascript);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Likeable — Build websites by chatting with AI" },
      { name: "description", content: "Likeable is an AI multi-page website builder. Describe what you want, get a full Bootstrap site instantly." },
    ],
  }),
  component: Index,
});

const STARTER_PROMPTS = [
  "A landing page for my coffee shop",
  "A portfolio site for a photographer",
  "A SaaS pricing page with 3 tiers",
  "A modern blog homepage",
];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page";
}

function Index() {
  const generate = useServerFn(generateSite);
  const analyze = useServerFn(analyzeImage);
  const refine = useServerFn(refinePrompt);
  const plan = useServerFn(planRequest);
  const { project, update } = useLikeableStore();
  const { settings } = useSettings();
  const { user } = useAuth();
  const savedProjects = useSavedProjects();
  const messages = project.messages;
  const pages = project.pages;
  const pageSlugs = Object.keys(pages);
  const hasAnyPage = pageSlugs.length > 0;
  const currentSlug = project.currentPage;
  const currentPage = pages[currentSlug];
  const started = messages.length > 0 || hasAnyPage;

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"preview" | "code">("preview");
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  const [actionMode, setActionMode] = useState<"edit" | "new">("edit");
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageModal, setImageModal] = useState<{ dataUrl: string } | null>(null);
  const [analysisModal, setAnalysisModal] = useState<{ text: string } | null>(null);
  const [pendingUserImage, setPendingUserImage] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => { if (!hasAnyPage) setActionMode("edit"); }, [hasAnyPage]);

  // ESC to exit fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [fullscreen]);

  // Close mini-menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const h = () => setMenuOpen(false);
    setTimeout(() => window.addEventListener("click", h, { once: true }), 0);
    return () => window.removeEventListener("click", h);
  }, [menuOpen]);

  // Syntax highlight when code view opens or content changes
  useEffect(() => {
    if (view === "code" && codeRef.current) {
      codeRef.current.removeAttribute("data-highlighted");
      hljs.highlightElement(codeRef.current);
    }
  }, [view, currentSlug, project]);

  async function send(prompt: string) {
    const text = prompt.trim();
    if (!text || loading) return;
    setInput("");
    const mode: "first" | "new-page" | "edit" =
      !hasAnyPage ? "first" : actionMode === "new" ? "new-page" : "edit";

    const userMsg: Message = { role: "user", content: text };
    update((p) => ({ ...p, messages: [...p.messages, userMsg] }));

    if (!settings.plannerEnabled) {
      await runDeveloper(text, null, mode);
      return;
    }

    setLoading(true);
    try {
      const existingPages = Object.entries(pages).map(([slug, p]) => ({ slug, title: p.title }));
      const res = await plan({
        data: {
          prompt: text,
          mode,
          brand: project.brand || undefined,
          currentSlug: mode === "edit" ? currentSlug : undefined,
          existingPages,
          standardPrompt: settings.standardPromptActive ? settings.standardPrompt : undefined,
          plannerModel: settings.plannerModel,
        },
      });
      update((p) => ({
        ...p,
        messages: [...p.messages, {
          role: "assistant",
          content: `📋 Plan ready: **${res.plan.name}** — review and approve to build.`,
          plan: res.plan,
          planStatus: "pending",
          originalPrompt: text,
        }],
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Planner failed";
      toast.error(msg);
      update((p) => ({ ...p, messages: [...p.messages, { role: "assistant", content: `Planner error: ${msg}` }] }));
    } finally {
      setLoading(false);
    }
  }

  /** Mark a plan message approved and run the Developer Agent with the final spec. */
  async function approvePlan(messageIndex: number, finalPlan: Plan) {
    const msg = messages[messageIndex];
    if (!msg?.originalPrompt) return;
    const finalSpec = planToFinalSpec(finalPlan, msg.originalPrompt);
    update((p) => ({
      ...p,
      messages: p.messages.map((m, i) => i === messageIndex ? { ...m, plan: finalPlan, planStatus: "approved" } : m),
    }));
    const mode: "first" | "new-page" | "edit" =
      !hasAnyPage ? "first" : actionMode === "new" ? "new-page" : "edit";
    await runDeveloper(msg.originalPrompt, finalSpec, mode);
  }

  function rejectPlan(messageIndex: number) {
    update((p) => ({
      ...p,
      messages: p.messages.map((m, i) => i === messageIndex ? { ...m, planStatus: "rejected" } : m),
    }));
  }

  /** Runs the Developer Agent. If finalSpec is given, it is appended as the source-of-truth instruction. */
  async function runDeveloper(originalPrompt: string, finalSpec: string | null, mode: "first" | "new-page" | "edit") {
    setLoading(true);
    try {
      const baseMessages = [...messages.slice(-8), { role: "user" as const, content: originalPrompt }];
      const recent = finalSpec
        ? [...baseMessages, { role: "user" as const, content: finalSpec }]
        : baseMessages;
      const existingPages = Object.entries(pages).map(([slug, p]) => ({ slug, title: p.title }));

      const res = await generate({
        data: {
          messages: recent.map((m) => ({ role: m.role, content: m.content })),
          mode,
          brand: project.brand || undefined,
          currentSlug: mode === "edit" ? currentSlug : undefined,
          existingPages,
          standardPrompt: settings.standardPromptActive ? settings.standardPrompt : undefined,
          model: settings.model,
          customEndpoint: settings.model === "custom" ? settings.customEndpoint : undefined,
          userImageDataUrl: pendingUserImage || undefined,
        },
      });

      if (pendingUserImage) setPendingUserImage(null);

      if (!res.pageHtml || !res.slug) {
        toast.error("AI didn't return a page. Try rephrasing.");
        update((p) => ({ ...p, messages: [...p.messages, { role: "assistant", content: res.summary || "No page returned." }] }));
        return;
      }

      const slug = mode === "edit" ? currentSlug : slugify(res.slug);
      const title = res.title || slug;
      const filename = `${slug === "home" ? "index" : slug}.html`;

      update((p): Project => ({
        ...p,
        brand: res.brand || p.brand || (mode === "first" ? "My Site" : p.brand),
        pages: { ...p.pages, [slug]: { filename, title, content: res.pageHtml! } },
        shared: {
          headerHtml: res.headerHtml ?? p.shared.headerHtml,
          footerHtml: res.footerHtml ?? p.shared.footerHtml,
          themeCss: res.themeCss ?? p.shared.themeCss,
        },
        currentPage: slug,
        messages: [...p.messages, { role: "assistant", content: res.summary, slug }],
      }));

      setActionMode("edit");
      if (typeof window !== "undefined" && window.innerWidth < 1024) setMobileTab("preview");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
      update((p) => ({ ...p, messages: [...p.messages, { role: "assistant", content: `Error: ${msg}` }] }));
    } finally {
      setLoading(false);
    }
  }

  function selectPage(slug: string) {
    update((p) => ({ ...p, currentPage: slug }));
    setActionMode("edit");
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) { toast.error("Image too large (max 4MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setImageModal({ dataUrl: String(reader.result) });
    reader.readAsDataURL(f);
  }

  function useImage() {
    if (!imageModal) return;
    const dataUrl = imageModal.dataUrl;
    setPendingUserImage(dataUrl);
    update((p) => ({ ...p, userImages: [dataUrl, ...p.userImages.filter((u) => u !== dataUrl)].slice(0, 5) }));
    setImageModal(null);
    toast.success("Image attached — describe your site and it'll be used as the hero.");
  }

  async function analyzeStyle() {
    if (!imageModal) return;
    const url = imageModal.dataUrl;
    setImageModal(null);
    const id = toast.loading("Analyzing image…");
    try {
      const r = await analyze({ data: { dataUrl: url } });
      toast.dismiss(id);
      setAnalysisModal({ text: r.analysis });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analyze failed", { id });
    }
  }

  function applyAnalysis() {
    if (!analysisModal) return;
    setInput((prev) => `${analysisModal.text}\n\n${prev}`.trim());
    setAnalysisModal(null);
  }

  async function doRefine() {
    if (!input.trim()) { toast.info("Type something first."); return; }
    setMenuOpen(false);
    const id = toast.loading("Refining…");
    try {
      const r = await refine({ data: { prompt: input } });
      setInput(r.refined);
      toast.success("Prompt refined", { id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refine failed", { id });
    }
  }

  async function exportZip() {
    if (!hasAnyPage) return;
    const zip = new JSZip();
    zip.file("shared/header.html", project.shared.headerHtml || "");
    zip.file("shared/footer.html", project.shared.footerHtml || "");
    zip.file("shared/theme.css", project.shared.themeCss || "");
    for (const slug of pageSlugs) {
      const html = wrapPage(project, slug);
      const filename = slug === "home" ? "index.html" : `${slug}.html`;
      zip.file(filename, html);
    }
    const origin = "https://example.com";
    const urls = pageSlugs.map((s) => `  <url><loc>${origin}/${s === "home" ? "" : s}</loc></url>`).join("\n");
    zip.file("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
    zip.file("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(project.brand || "likeable-site")}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded site as zip");
  }

  function deployNetlify() {
    if (!hasAnyPage) return;
    toast.loading("Deploying to Netlify...", { id: "deploy" });
    setTimeout(() => {
      toast.success("Deployed! likeable-site-" + Math.random().toString(36).slice(2, 7) + ".netlify.app", { id: "deploy", duration: 5000 });
    }, 1800);
  }

  function deployGitHub() {
    if (!hasAnyPage) return;
    if (!user) { toast.info("Sign in to deploy to GitHub."); setAuthOpen(true); return; }
    if (!settings.githubToken) { toast.info("Connect GitHub in Settings first."); return; }
    const repoName = window.prompt("Repository name", `likeable-${project.projectId.slice(0, 8)}`);
    if (!repoName) return;
    const files: Record<string, string> = {
      "shared/header.html": project.shared.headerHtml || "",
      "shared/footer.html": project.shared.footerHtml || "",
      "shared/theme.css": project.shared.themeCss || "",
    };
    for (const slug of pageSlugs) files[slug === "home" ? "index.html" : `${slug}.html`] = wrapPage(project, slug);
    toast.loading("Deploying to GitHub…", { id: "gh" });
    // Mock — real call would hit /api/deploy/github
    console.log("[Likeable] Deploying to GitHub", { repoName, fileCount: Object.keys(files).length, token: settings.githubToken.slice(0, 6) + "…" });
    setTimeout(() => toast.success(`Mock-deployed to github.com/you/${repoName}`, { id: "gh", duration: 5000 }), 1500);
  }

  async function copyCode() {
    if (!currentPage) return;
    await navigator.clipboard.writeText(wrapPage(project, currentSlug));
    toast.success("Copied HTML to clipboard");
  }

  if (!started) {
    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col">
        <Toaster theme="dark" position="top-center" />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        <div className="absolute inset-x-0 bottom-0 h-[55vh] glow-bg pointer-events-none" />
        <header className="relative z-10 flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2"><Logo className="w-7 h-7" /><span className="text-xl font-bold">Likeable</span></div>
          <div className="flex items-center gap-2">
            {!user && (
              <button onClick={() => setAuthOpen(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-accent">
                <LogIn className="w-3.5 h-3.5" /> Sign in
              </button>
            )}
            <Link to="/settings" aria-label="Settings" className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"><Settings className="w-5 h-5" /></Link>
          </div>
        </header>
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border mb-8">
            <span className="text-sm">Multi-page sites, one at a time</span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">
            What do you want to <span className="brand-text">build</span>?
          </h1>
          <p className="text-muted-foreground text-center mb-8 text-sm">
            Describe a site. Add more pages by chatting. Export as a ready-to-host zip.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="w-full max-w-2xl bg-card border rounded-3xl p-3 shadow-2xl">
            <textarea
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ask Likeable to build a home page for..." rows={2}
              className="w-full bg-transparent outline-none resize-none px-3 py-2 text-base placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between mt-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="p-2 rounded-full hover:bg-accent text-muted-foreground" aria-label="Attach">
                <Plus className="w-5 h-5" />
              </button>
              <button type="submit" disabled={!input.trim() || loading} className="w-10 h-10 rounded-full brand-bg flex items-center justify-center disabled:opacity-40" aria-label="Send">
                <ArrowUp className="w-5 h-5 text-white" />
              </button>
            </div>
          </form>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-2xl">
            {STARTER_PROMPTS.map((p) => (
              <button key={p} onClick={() => send(p)} className="text-xs px-3 py-1.5 rounded-full border bg-card/50 hover:bg-accent">{p}</button>
            ))}
          </div>
          {savedProjects.length > 0 && (
            <div className="w-full max-w-4xl mt-12">
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your projects</h2>
                <span className="text-xs text-muted-foreground">{savedProjects.length} saved</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedProjects.map((proj) => (
                  <ProjectCard key={proj.projectId} proj={proj} onOpen={() => loadSavedProject(proj.projectId)} onDelete={() => deleteSavedProject(proj.projectId)} />
                ))}
              </div>
            </div>
          )}
        </main>
        {imageModalNode()}
        {analysisModalNode()}
      </div>
    );
  }

  const previewHtml = currentPage ? wrapPage(project, currentSlug) : "";

  function imageModalNode() {
    if (!imageModal) return null;
    return (
      <div className="fixed inset-0 z-[10001] bg-black/70 flex items-center justify-center p-4" onClick={() => setImageModal(null)}>
        <div className="bg-card border rounded-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">Use this image</h3>
            <button onClick={() => setImageModal(null)} className="p-1 rounded hover:bg-accent"><X className="w-4 h-4" /></button>
          </div>
          <img src={imageModal.dataUrl} alt="" className="w-full rounded-lg mb-4 max-h-64 object-contain bg-black/30" />
          <div className="space-y-2">
            <button onClick={useImage} className="w-full brand-bg text-white py-2 rounded-lg text-sm font-medium">Use this image in my site</button>
            <button onClick={analyzeStyle} className="w-full border py-2 rounded-lg text-sm hover:bg-accent">Analyze for style inspiration</button>
          </div>
        </div>
      </div>
    );
  }

  function analysisModalNode() {
    if (!analysisModal) return null;
    return (
      <div className="fixed inset-0 z-[10001] bg-black/70 flex items-center justify-center p-4" onClick={() => setAnalysisModal(null)}>
        <div className="bg-card border rounded-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">Style guide</h3>
            <button onClick={() => setAnalysisModal(null)} className="p-1 rounded hover:bg-accent"><X className="w-4 h-4" /></button>
          </div>
          <div className="text-sm bg-input border rounded-lg p-3 mb-3 max-h-72 overflow-auto whitespace-pre-wrap">{analysisModal.text}</div>
          <button onClick={applyAnalysis} className="w-full brand-bg text-white py-2 rounded-lg text-sm font-medium">Apply to prompt</button>
        </div>
      </div>
    );
  }

  const chatPanel = (
    <div className="flex flex-col min-h-0 h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m: Message, i: number) => {
          if (m.plan) {
            return (
              <div key={i} className="space-y-2">
                <div className="text-xs text-muted-foreground">{m.content}</div>
                <PlanCard
                  plan={m.plan}
                  status={m.planStatus ?? "pending"}
                  onApprove={(finalPlan) => approvePlan(i, finalPlan)}
                  onReject={() => rejectPlan(i)}
                />
              </div>
            );
          }
          return (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === "user" ? "brand-bg text-white" : "bg-card border"}`}>
                {m.content}
                {m.slug && (<div className="mt-1.5 text-xs opacity-70 flex items-center gap-1"><Code2 className="w-3 h-3" /> {m.slug}.html updated</div>)}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.3s]" />
            </div>
            Generating...
          </div>
        )}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t p-3 space-y-2">
        {hasAnyPage && (
          <div className="flex items-center gap-1 text-xs">
            <button type="button" onClick={() => setActionMode("edit")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full border ${actionMode === "edit" ? "brand-bg text-white border-transparent" : "bg-card hover:bg-accent"}`}>
              <FileText className="w-3 h-3" /> Edit {currentSlug}
            </button>
            <button type="button" onClick={() => setActionMode("new")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full border ${actionMode === "new" ? "brand-bg text-white border-transparent" : "bg-card hover:bg-accent"}`}>
              <FilePlus2 className="w-3 h-3" /> New page
            </button>
          </div>
        )}
        {pendingUserImage && (
          <div className="flex items-center gap-2 text-xs bg-accent/40 px-2 py-1 rounded-lg">
            <img src={pendingUserImage} alt="" className="w-6 h-6 rounded object-cover" />
            <span className="flex-1">Image attached</span>
            <button type="button" onClick={() => setPendingUserImage(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
          </div>
        )}
        <div className="bg-card border rounded-2xl p-2 relative">
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder={!hasAnyPage ? "Describe your site's home page..." : actionMode === "new" ? "Describe a new page, e.g. 'an about page with our story'" : `Tweak the ${currentSlug} page...`}
            rows={2}
            className="w-full bg-transparent outline-none resize-none px-2 py-1 text-sm placeholder:text-muted-foreground"
          />
          <div className="flex justify-between items-center">
            <div className="relative">
              <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className="p-1.5 rounded-full hover:bg-accent text-muted-foreground" aria-label="More">
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div onClick={(e) => e.stopPropagation()} className="absolute bottom-full left-0 mb-2 bg-card border rounded-xl shadow-2xl py-1 w-44 z-50">
                  <button type="button" onClick={() => { setMenuOpen(false); fileRef.current?.click(); }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent">
                    <ImageIcon className="w-4 h-4" /> Upload image
                  </button>
                  <button type="button" onClick={doRefine}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent">
                    <Wand2 className="w-4 h-4" /> Refine prompt
                  </button>
                </div>
              )}
            </div>
            <button type="submit" disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-full brand-bg flex items-center justify-center disabled:opacity-40" aria-label="Send">
              <ArrowUp className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  const previewPanel = (
    <div className="flex flex-col min-h-0 h-full bg-muted/30">
      {hasAnyPage && (
        <div className="flex items-center gap-1 px-2 pt-2 overflow-x-auto bg-card border-b">
          {pageSlugs.map((slug) => (
            <button key={slug} onClick={() => selectPage(slug)}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-t-md whitespace-nowrap ${slug === currentSlug ? "bg-muted/30 border border-b-transparent" : "text-muted-foreground hover:text-foreground"}`}
              title={pages[slug].title}>
              <FileText className="w-3 h-3" /> {slug}
            </button>
          ))}
          <button onClick={() => { setActionMode("new"); setMobileTab("chat"); }}
            className="flex items-center gap-1 text-xs px-2 py-1.5 text-muted-foreground hover:text-foreground" title="Add a new page via chat">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between gap-1 p-2 border-b bg-card">
        <div className="flex items-center gap-1">
          <button onClick={() => setView("preview")} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md ${view === "preview" ? "bg-accent" : "hover:bg-accent/50"}`}>
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          <button onClick={() => setView("code")} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md ${view === "code" ? "bg-accent" : "hover:bg-accent/50"}`}>
            <Code2 className="w-3.5 h-3.5" /> Code
          </button>
        </div>
        <div className="flex items-center gap-1">
          {view === "code" && currentPage && (
            <button onClick={copyCode} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-accent/50 text-muted-foreground">
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          )}
          {view === "preview" && currentPage && (
            <button onClick={() => setFullscreen(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-accent/50 text-muted-foreground" title="Expand">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          <a href="/output" target="_blank" rel="noreferrer"
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md hover:bg-accent/50 text-muted-foreground ${!currentPage ? "pointer-events-none opacity-40" : ""}`}>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {!currentPage ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-8 text-center">Your website preview will appear here.</div>
        ) : view === "preview" ? (
          <iframe key={currentSlug} title="Preview" srcDoc={previewHtml} sandbox="allow-scripts allow-forms allow-popups"
            className={fullscreen ? "likeable-fullscreen border-0" : "w-full h-full border-0 bg-white"} />
        ) : (
          <pre className="w-full h-full overflow-auto p-4 text-xs font-mono bg-card m-0">
            <code ref={codeRef} className="language-xml">{previewHtml}</code>
          </pre>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      <Toaster theme="dark" position="top-center" />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
      {imageModalNode()}
      {analysisModalNode()}
      {fullscreen && (
        <button onClick={() => setFullscreen(false)} className="likeable-fullscreen-exit" aria-label="Exit fullscreen">
          <Minimize2 className="w-5 h-5" />
        </button>
      )}
      <header className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <button onClick={() => { archiveCurrentProject(); }} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity" title="Save & start a new project">
          <Logo className="w-6 h-6 shrink-0" />
          <span className="font-bold">Likeable</span>
          {project.brand && (
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              · {project.brand} · {pageSlugs.length} page{pageSlugs.length === 1 ? "" : "s"}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={exportZip} disabled={!hasAnyPage} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-accent disabled:opacity-40">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          {user && (
            <button onClick={deployGitHub} disabled={!hasAnyPage} className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-accent disabled:opacity-40">
              <Github className="w-3.5 h-3.5" /> GitHub
            </button>
          )}
          <button onClick={deployNetlify} disabled={!hasAnyPage} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg brand-bg text-white disabled:opacity-40">
            <Rocket className="w-3.5 h-3.5" /> Deploy
          </button>
          {!user && (
            <button onClick={() => setAuthOpen(true)} className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border hover:bg-accent">
              <LogIn className="w-3.5 h-3.5" />
            </button>
          )}
          <Link to="/settings" aria-label="Settings" className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <div className="lg:hidden flex border-b shrink-0">
        <button onClick={() => setMobileTab("chat")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm ${mobileTab === "chat" ? "border-b-2 border-pink-500 text-foreground" : "text-muted-foreground"}`}>
          <MessageSquare className="w-4 h-4" /> Chat
        </button>
        <button onClick={() => setMobileTab("preview")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm ${mobileTab === "preview" ? "border-b-2 border-pink-500 text-foreground" : "text-muted-foreground"}`}>
          <Eye className="w-4 h-4" /> Preview
        </button>
      </div>

      <div className="flex-1 min-h-0 lg:flex">
        <aside className={`lg:w-[380px] lg:border-r lg:flex h-full ${mobileTab === "chat" ? "flex" : "hidden"} flex-col min-h-0`}>{chatPanel}</aside>
        <section className={`flex-1 lg:flex h-full ${mobileTab === "preview" ? "flex" : "hidden"} flex-col min-h-0`}>{previewPanel}</section>
      </div>
    </div>
  );
}

const UNIVERSAL_PROJECT_IMAGE =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ec4899"/>
          <stop offset="50%" stop-color="#a855f7"/>
          <stop offset="100%" stop-color="#3b82f6"/>
        </linearGradient>
        <radialGradient id="s" cx="0.8" cy="0.2" r="0.6">
          <stop offset="0%" stop-color="white" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="white" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill="url(#g)"/>
      <rect width="400" height="240" fill="url(#s)"/>
      <g transform="translate(200 120)" fill="white" fill-opacity="0.95">
        <path d="M0,-40 C18,-40 30,-26 30,-10 C30,8 18,20 0,32 C-18,20 -30,8 -30,-10 C-30,-26 -18,-40 0,-40 Z"/>
      </g>
      <g fill="white" fill-opacity="0.9" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-weight="700">
        <text x="20" y="220" font-size="14">Likeable project</text>
      </g>
    </svg>`,
  );

function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

function ProjectCard({
  proj,
  onOpen,
  onDelete,
}: {
  proj: { projectId: string; brand: string; description: string; pageCount: number; updatedAt: number };
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative bg-card border rounded-2xl overflow-hidden hover:border-pink-500/50 transition-colors text-left">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="aspect-[5/3] overflow-hidden bg-muted">
          <img src={UNIVERSAL_PROJECT_IMAGE} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="p-3">
          <div className="font-semibold text-sm truncate">{proj.brand}</div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2rem]">{proj.description}</p>
          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground uppercase tracking-wide">
            <span>{proj.pageCount} page{proj.pageCount === 1 ? "" : "s"}</span>
            <span>{formatRelative(proj.updatedAt)}</span>
          </div>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); if (confirm("Delete this project?")) onDelete(); }}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition"
        aria-label="Delete project"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
