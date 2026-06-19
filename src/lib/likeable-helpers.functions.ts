import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/* ---------------- Image resolution: Pexels -> Pixabay -> Unsplash ---------------- */

const imageCache = new Map<string, string>();

async function fetchPexels(keyword: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=1`,
      { headers: { Authorization: key } },
    );
    if (!r.ok) return null;
    const j = await r.json();
    const p = j.photos?.[0];
    return p?.src?.large2x || p?.src?.large || p?.src?.medium || null;
  } catch {
    return null;
  }
}

async function fetchPixabay(keyword: string): Promise<string | null> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(
      `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(keyword)}&image_type=photo&per_page=3`,
    );
    if (!r.ok) return null;
    const j = await r.json();
    return j.hits?.[0]?.webformatURL || null;
  } catch {
    return null;
  }
}

export const resolveImage = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      keyword: z.string().min(1).max(120),
      width: z.number().default(800),
      height: z.number().default(600),
    }),
  )
  .handler(async ({ data }) => {
    const key = `${data.keyword}|${data.width}x${data.height}`;
    if (imageCache.has(key)) return { url: imageCache.get(key)!, source: "cache" as const };

    const pexels = await fetchPexels(data.keyword);
    if (pexels) {
      imageCache.set(key, pexels);
      return { url: pexels, source: "pexels" as const };
    }
    const pixabay = await fetchPixabay(data.keyword);
    if (pixabay) {
      imageCache.set(key, pixabay);
      return { url: pixabay, source: "pixabay" as const };
    }
    const fallback = `https://source.unsplash.com/featured/${data.width}x${data.height}/?${encodeURIComponent(data.keyword)}`;
    imageCache.set(key, fallback);
    return { url: fallback, source: "unsplash" as const };
  });

/* ---------------- Bulk resolve: scan HTML for source.unsplash.com img tags & swap ---------------- */

export const resolveImagesInHtml = createServerFn({ method: "POST" })
  .inputValidator(z.object({ html: z.string() }))
  .handler(async ({ data }) => {
    const rx = /https:\/\/source\.unsplash\.com\/featured\/(\d+)x(\d+)\/?\?([^"'\s)]+)/g;
    const matches = Array.from(data.html.matchAll(rx));
    let html = data.html;
    const seen = new Set<string>();
    for (const m of matches) {
      const full = m[0];
      if (seen.has(full)) continue;
      seen.add(full);
      const w = parseInt(m[1], 10) || 800;
      const h = parseInt(m[2], 10) || 600;
      const keyword = decodeURIComponent(m[3].split(",")[0]).replace(/[+]/g, " ").trim();
      if (!keyword) continue;
      const pexels = (await fetchPexels(keyword)) || (await fetchPixabay(keyword));
      if (pexels) html = html.split(full).join(pexels);
    }
    return { html };
  });

/* ---------------- Gemini: analyze uploaded image for style inspiration ---------------- */

export const analyzeImage = createServerFn({ method: "POST" })
  .inputValidator(z.object({ dataUrl: z.string().min(20) }))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image for web design inspiration. Return a short style guide (3-5 sentences) covering: color palette (include 3-4 hex codes), typography mood, spacing vibe (airy/compact), and any standout visual motifs. Output as plain text suitable to prepend to a website-build prompt.",
              },
              { type: "image_url", image_url: { url: data.dataUrl } },
            ],
          },
        ],
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`Vision error (${r.status}): ${t.slice(0, 200)}`);
    }
    const j = await r.json();
    return { analysis: j.choices?.[0]?.message?.content ?? "" };
  });

/* ---------------- Gemini: refine the user prompt ---------------- */

export const refinePrompt = createServerFn({ method: "POST" })
  .inputValidator(z.object({ prompt: z.string().min(1).max(4000) }))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Improve the user's website-build prompt. Make it more specific: add details about color palette, layout, animations, image keywords, and content sections - but preserve the original intent. Output ONLY the refined prompt as plain text, no preface, no quotes, no markdown.",
          },
          { role: "user", content: data.prompt },
        ],
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`Refine error (${r.status}): ${t.slice(0, 200)}`);
    }
    const j = await r.json();
    return { refined: (j.choices?.[0]?.message?.content ?? data.prompt).trim() };
  });
