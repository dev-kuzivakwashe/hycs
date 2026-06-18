import { useEffect, useState } from "react";

import type { Plan } from "./likeable-planner.functions";

export type Message = {
  role: "user" | "assistant";
  content: string;
  slug?: string;
  /** When set, this assistant message renders as a Plan card with Approve/Edit actions. */
  plan?: Plan;
  /** Lifecycle of the plan card. */
  planStatus?: "pending" | "approved" | "rejected";
  /** The raw user prompt this plan was built for (kept so we can re-run developer with edits). */
  originalPrompt?: string;
};

export type Page = { filename: string; title: string; content: string };

export type Project = {
  projectId: string;
  brand: string;
  /** First title the planner assigned to this project, displayed on saved cards. */
  initialTitle?: string;
  pages: Record<string, Page>;
  shared: { headerHtml: string; footerHtml: string; themeCss: string };
  currentPage: string;
  messages: Message[];
  userImages: string[]; // data URLs, max 5, newest first
};

const KEY = "hycs:project:v2";
const LIST_KEY = "hycs:projects:v1";
const EVENT = "hycs:state-change";
const LIST_EVENT = "hycs:list-change";

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "p-" + Math.random().toString(36).slice(2, 10);
}

function emptyProject(): Project {
  return {
    projectId: uuid(),
    brand: "",
    initialTitle: "",
    pages: {},
    shared: { headerHtml: "", footerHtml: "", themeCss: "" },
    currentPage: "home",
    messages: [],
    userImages: [],
  };
}

function read(): Project {
  if (typeof window === "undefined") return emptyProject();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProject();
    const p = JSON.parse(raw) as Project;
    if (!p.pages) p.pages = {};
    if (!p.shared) p.shared = { headerHtml: "", footerHtml: "", themeCss: "" };
    if (!p.messages) p.messages = [];
    if (!p.userImages) p.userImages = [];
    if (!p.initialTitle) p.initialTitle = "";
    return p;
  } catch {
    return emptyProject();
  }
}

function write(p: Project) {
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export type SavedProjectMeta = {
  projectId: string;
  brand: string;
  /** Planner-assigned title (e.g. "Modern Blog Homepage"). */
  initialTitle: string;
  /** First user prompt (truncated). */
  description: string;
  pageCount: number;
  messageCount: number;
  updatedAt: number;
};

function readList(): SavedProjectMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIST_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SavedProjectMeta[];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function writeList(list: SavedProjectMeta[]) {
  localStorage.setItem(LIST_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(LIST_EVENT));
}

function snapshotKey(id: string) { return `hycs:project:snapshot:${id}`; }

function projectIsEmpty(p: Project) {
  return Object.keys(p.pages).length === 0 && p.messages.length === 0;
}

function deriveDescription(p: Project): string {
  const firstUser = p.messages.find((m) => m.role === "user");
  if (firstUser) return firstUser.content.slice(0, 140);
  const slug = Object.keys(p.pages)[0];
  if (slug) return p.pages[slug].title;
  return "Untitled project";
}

function deriveInitialTitle(p: Project): string {
  if (p.initialTitle) return p.initialTitle;
  const firstPlan = p.messages.find((m) => m.plan);
  if (firstPlan?.plan?.name) return firstPlan.plan.name;
  const slug = Object.keys(p.pages)[0];
  if (slug) return p.pages[slug].title;
  return "Untitled";
}

function archiveSnapshot(p: Project) {
  localStorage.setItem(snapshotKey(p.projectId), JSON.stringify(p));
  const meta: SavedProjectMeta = {
    projectId: p.projectId,
    brand: p.brand || "Untitled",
    initialTitle: deriveInitialTitle(p),
    description: deriveDescription(p),
    pageCount: Object.keys(p.pages).length,
    messageCount: p.messages.length,
    updatedAt: Date.now(),
  };
  const list = readList().filter((x) => x.projectId !== p.projectId);
  list.unshift(meta);
  writeList(list);
}

/** Archive the current project to the saved list and start a fresh one. */
export function archiveCurrentProject() {
  const cur = read();
  if (!projectIsEmpty(cur)) archiveSnapshot(cur);
  write(emptyProject());
}

export function loadSavedProject(id: string) {
  const cur = read();
  if (!projectIsEmpty(cur) && cur.projectId !== id) archiveSnapshot(cur);
  const raw = localStorage.getItem(snapshotKey(id));
  if (!raw) return;
  try {
    const p = JSON.parse(raw) as Project;
    write(p);
    writeList(readList().filter((x) => x.projectId !== id));
  } catch {}
}

export function deleteSavedProject(id: string) {
  localStorage.removeItem(snapshotKey(id));
  writeList(readList().filter((x) => x.projectId !== id));
}

export function useSavedProjects() {
  const [list, setList] = useState<SavedProjectMeta[]>(() => readList());
  useEffect(() => {
    const sync = () => setList(readList());
    window.addEventListener(LIST_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(LIST_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return list;
}

export function useLikeableStore() {
  const [project, setProject] = useState<Project>(() => read());

  useEffect(() => {
    const sync = () => setProject(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    project,
    update: (mutator: (p: Project) => Project) => {
      const next = mutator(read());
      write(next);
    },
    reset: () => write(emptyProject()),
  };
}

/** Wrap a page's body content into a full standalone HTML document — NO framework,
 *  just minimal base CSS and a tiny vanilla SPA router for sibling pages. */
export function wrapPage(project: Project, slug: string): string {
  const page = project.pages[slug];
  if (!page) {
    return `<!doctype html><html><body style="font-family:system-ui;padding:2rem;text-align:center">No page yet.</body></html>`;
  }
  const snapshot = {
    pages: Object.fromEntries(
      Object.entries(project.pages).map(([k, v]) => [k, { title: v.title, content: v.content }]),
    ),
    headerHtml: project.shared.headerHtml,
    footerHtml: project.shared.footerHtml,
    currentSlug: slug,
  };
  const json = JSON.stringify(snapshot).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(page.title)} - ${escapeHtml(project.brand || "HYCS")}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.6;color:#1a1a1a;background:#fff}
img,video{max-width:100%;height:auto;display:block;object-fit:cover}
a{color:inherit;text-decoration:none}
button{font:inherit;cursor:pointer;border:none;background:none}
input,textarea,select{font:inherit}
@keyframes hycsFadeSlideUp { 0% { opacity: 0; transform: translateY(12px); } 100% { opacity: 1; transform: translateY(0); } }
.hycs-page-wrapper { animation: hycsFadeSlideUp 0.4s ease-out; min-height:100vh; display:flex; flex-direction:column; }
.hycs-page-wrapper > main { flex: 1; }
${project.shared.themeCss || ""}
</style>
</head>
<body>
<div class="hycs-page-wrapper">
<div id="hycs-header-placeholder"></div>
<main id="hycs-main">${page.content}</main>
<div id="hycs-footer-placeholder"></div>
</div>
<script>window.__HYCS__ = ${json};</script>
<script>
(function(){
  var P = window.__HYCS__;
  function getThemePlaceholder(w, h){
    var primary = '';
    try { primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(); } catch(_){}
    if (!primary) primary = '#3b82f6';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (w||200) + '" height="' + (h||150) + '" viewBox="0 0 100 100" preserveAspectRatio="none">'
      + '<rect width="100" height="100" fill="' + primary + '" opacity="0.18"/>'
      + '<rect x="20" y="25" width="60" height="50" rx="6" fill="' + primary + '" opacity="0.45"/>'
      + '<circle cx="38" cy="42" r="5" fill="' + primary + '" opacity="0.9"/>'
      + '<path d="M25 70 L45 50 L60 65 L72 55 L80 70 Z" fill="' + primary + '" opacity="0.9"/>'
      + '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function attachFallback(img){
    if (img.__hyFb) return;
    img.__hyFb = true;
    img.addEventListener('error', function(){
      if (img.__hyPh) return;
      img.__hyPh = true;
      var w = img.getAttribute('width') || img.naturalWidth || 200;
      var h = img.getAttribute('height') || img.naturalHeight || 150;
      img.src = getThemePlaceholder(parseInt(w,10)||200, parseInt(h,10)||150);
    });
    if (img.complete && img.naturalWidth === 0 && img.src) {
      img.dispatchEvent(new Event('error'));
    }
  }
  function scanImages(){ document.querySelectorAll('img').forEach(attachFallback); }
  var mo = new MutationObserver(function(muts){
    muts.forEach(function(m){
      m.addedNodes && m.addedNodes.forEach(function(n){
        if (n.nodeType !== 1) return;
        if (n.tagName === 'IMG') attachFallback(n);
        else if (n.querySelectorAll) n.querySelectorAll('img').forEach(attachFallback);
      });
    });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  function render(slug){
    var page = P.pages[slug] || P.pages[P.currentSlug];
    document.getElementById('hycs-header-placeholder').innerHTML = P.headerHtml || '';
    document.getElementById('hycs-main').innerHTML = page ? page.content : '<div style="padding:4rem;text-align:center"><h1>Page not found</h1></div>';
    document.getElementById('hycs-footer-placeholder').innerHTML = P.footerHtml || '';
    if (page) document.title = page.title;
    document.querySelectorAll('a').forEach(function(a){
      var href = a.getAttribute('href') || '';
      var s = slugFromHref(href);
      if (s === slug) a.classList.add('active');
    });
    scanImages();
  }
  function slugFromHref(href){
    if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return null;
    var p = href.replace(/^\\/+/, '').replace(/\\.html$/, '').split(/[?#]/)[0];
    if (!p || p === 'index') p = 'home';
    return P.pages[p] ? p : null;
  }
  function showExternalLinkModal(url){
    var existing = document.getElementById('hycs-ext-modal');
    if (existing) existing.remove();
    var primary = '';
    try { primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(); } catch(_){}
    if (!primary) primary = '#3b82f6';
    var safeUrl = String(url).replace(/[<>"]/g,'');
    var host = '';
    try { host = new URL(url).hostname; } catch(_) { host = safeUrl; }
    var wrap = document.createElement('div');
    wrap.id = 'hycs-ext-modal';
    wrap.setAttribute('style','position:fixed;inset:0;z-index:2147483647;background:rgba(10,8,20,0.72);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1rem;font-family:system-ui,-apple-system,Segoe UI,sans-serif;animation:hyExtFade .18s ease-out;');
    wrap.innerHTML = '<style>@keyframes hyExtFade{from{opacity:0}to{opacity:1}}@keyframes hyExtPop{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}</style>'
      + '<div style="background:#1a1525;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:18px;max-width:420px;width:100%;padding:1.5rem;box-shadow:0 30px 80px -10px rgba(0,0,0,.6);animation:hyExtPop .22s ease-out">'
      + '<div style="width:42px;height:42px;border-radius:12px;background:' + primary + ';display:flex;align-items:center;justify-content:center;margin-bottom:1rem;font-size:20px">↗</div>'
      + '<h3 style="margin:0 0 .5rem;font-size:1.1rem;font-weight:700">Leave preview?</h3>'
      + '<p style="margin:0 0 .25rem;font-size:.85rem;color:rgba(255,255,255,.7);line-height:1.5">This link would open <strong style="color:#fff;word-break:break-all">' + host + '</strong> outside the HYCS preview environment.</p>'
      + '<p style="margin:0 0 1.25rem;font-size:.75rem;color:rgba(255,255,255,.45);word-break:break-all">' + safeUrl + '</p>'
      + '<div style="display:flex;gap:.5rem;justify-content:flex-end">'
      + '<button id="hy-ext-cancel" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,.18);padding:.55rem 1rem;border-radius:10px;font-size:.85rem;cursor:pointer">Cancel</button>'
      + '<button id="hy-ext-open" style="background:' + primary + ';color:#fff;border:none;padding:.55rem 1rem;border-radius:10px;font-size:.85rem;font-weight:600;cursor:pointer">Open in new tab</button>'
      + '</div></div>';
    document.body.appendChild(wrap);
    var close = function(){ wrap.remove(); };
    wrap.addEventListener('click', function(e){ if (e.target === wrap) close(); });
    document.getElementById('hy-ext-cancel').addEventListener('click', close);
    document.getElementById('hy-ext-open').addEventListener('click', function(){
      try { window.open(url, '_blank', 'noopener,noreferrer'); } catch(_){}
      close();
    });
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#')) return;
    var slug = slugFromHref(href);
    if (slug){
      e.preventDefault();
      try { history.pushState({slug:slug}, '', '/' + (slug === 'home' ? '' : slug)); } catch(_){}
      render(slug);
      window.scrollTo(0,0);
      return;
    }
    if (href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      e.preventDefault();
      showExternalLinkModal(href);
      return;
    }
    e.preventDefault();
  });
  window.addEventListener('popstate', function(e){
    render((e.state && e.state.slug) || P.currentSlug);
  });
  render(P.currentSlug);
  scanImages();
})();
</script>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
