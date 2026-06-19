import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DESIGN_SYSTEM_RULES } from "./design-system";
import { callProvider } from "./byok-call.functions";


const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const pageMetaSchema = z.object({
  slug: z.string(),
  title: z.string(),
});

const SYSTEM_PROMPT = `You are HYCS, an AI multi-page website builder. HYCS pages are NO-FRAMEWORK: every page is plain HTML + custom CSS + vanilla JS. You MUST NOT use Bootstrap, Tailwind, or any other CSS framework — write your own CSS in a per-page <style> block.

You return EXACTLY ONE JSON object. No prose before or after. If the API supports JSON mode, return raw JSON without markdown fences.

JSON shape (fields are optional unless noted):
{
  "summary": string,                 // REQUIRED: one short sentence describing what you built/changed
  "slug": string,                    // REQUIRED: page slug like "home", "about", "menu" (lowercase, kebab-case)
  "title": string,                   // REQUIRED: human page title
  "brand": string,                   // include on the FIRST page only - short brand name
  "themeCss": string,                // include on FIRST page only - global CSS custom properties + base typography. Loaded into every page.
  "headerHtml": string,              // include on FIRST page AND whenever a new page is added. A responsive nav with the brand + >=5 links built from semantic <nav> + <ul>. Include a hamburger toggle script for mobile. Nav links MUST use href="/SLUG" (use "/" for home).
  "footerHtml": string,              // include on FIRST page only (or when explicitly editing footer). Footer with address (country, city, street, building no.), phone, email, social icons/word links, and (c) {year} brand.
  "pageHtml": string                 // REQUIRED: body content for this page ONLY. Do NOT include <html>, <head>, <body>, <header>, or <footer> tags - those are injected by the system.
}

# HARD STRUCTURAL RULES

Every page MUST follow this semantic structure (omit a section only if it doesn't make sense for that page; home pages MUST have all five):

1. **Hero section** - full-width <section> with a background image (use https://source.unsplash.com/featured/1600x900/?KEYWORD), a semi-transparent dark overlay for contrast, an h1, a sub-line, and a primary CTA button. Responsive.
2. **About section** - short paragraph (max ~80 words) with custom typography, centered image with a UNIQUE asymmetric border-radius like \`border-radius: 3px 14px 1px 22px;\` (pick fresh values each time).
3. **Services / Features section** - grid or flex of >=3 cards. Each card: optional image, heading, description, action button. All cards share the SAME custom border-radius.
4. **Contact section** - <form> with >=5 inputs + a submit button. MIX label-style with placeholder-style. The form's onsubmit must be: \`onsubmit="event.preventDefault();this.reset();window.dispatchEvent(new CustomEvent('hycs-toast',{detail:'Message sent! We will be in touch.'}));"\` and the page should include a small inline <script> that listens for that event and shows a designed toast (NOT alert()).
5. **Footer details** - address, phone, email, social links, (c) current year + brand.

# STYLING RULES (apply via themeCss on first page, and inline <style> per page as needed)

- **NO frameworks.** Do not link to Bootstrap, Tailwind, Bulma, Foundation, Materialize or any CSS framework CDN. Write all styles yourself.
- **Typography**: readable web-safe fonts, sizes in rem/em (NOT px). Contrast WCAG AA.
- **Layout**: flexbox/grid only (no floats). Use \`gap\` for spacing.
- **Sizing**: \`box-sizing:border-box\` globally. Images: \`max-width:100%;height:auto;object-fit:cover\`.
- **Colors**: define 5-7 CSS custom properties (\`--primary\`, \`--secondary\`, \`--accent\`, \`--bg\`, \`--surface\`, \`--text\`, \`--muted\`).
- **Animation**: add a CSS \`@keyframes\` fade-up and use IntersectionObserver in an inline <script> so sections animate ONCE when scrolled into view. Subtle (<=0.6s).
- **Punctuation**: use a regular hyphen "-" instead of em dashes or en dashes anywhere in the rendered HTML.

# IMAGE RULES

For EVERY <img>, use ONLY these URL patterns (never example.com or fake URLs):
- https://source.unsplash.com/featured/800x600/?KEYWORD   (replace KEYWORD with the subject)
- https://picsum.photos/seed/SEED/800/600                  (any unique seed string)
Always include alt text.

# MODE RULES

- When ADDING a new page, regenerate headerHtml so its nav includes ALL existing pages PLUS this new one.
- When EDITING the current page, return updated pageHtml for the same slug; only include headerHtml/footerHtml/themeCss if your edit specifically touches them.
`;

function extractJsonObject(text: string): Record<string, unknown> | null {
  const candidates: string[] = [];
  for (const match of text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    candidates.push(match[1].trim());
  }
  candidates.push(text.trim());

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch { /* try sliced object */ }

    const sliced = sliceFirstJsonObject(candidate);
    if (!sliced) continue;
    try {
      const parsed = JSON.parse(sliced);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch { /* invalid candidate */ }
  }
  return null;
}

function sliceFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export const generateSite = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      messages: z.array(messageSchema).min(1),
      mode: z.enum(["first", "new-page", "edit"]),
      brand: z.string().optional(),
      currentSlug: z.string().optional(),
      existingPages: z.array(pageMetaSchema).default([]),
      standardPrompt: z.string().optional(),
      model: z.string().optional(),
      customEndpoint: z.string().optional(),
      userImageDataUrl: z.string().optional(),
      pexelsEnabled: z.boolean().default(true),
      pixabayEnabled: z.boolean().default(true),
      applyDesignSystem: z.boolean().default(true),
      byok: z
        .object({
          provider: z.enum(["groq", "openai", "gemini", "claude"]),
          model: z.string(),
          apiKey: z.string(),
        })
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey && !data.byok) throw new Error("LOVABLE_API_KEY not configured");

    const ctxLines: string[] = [];
    ctxLines.push(`MODE: ${data.mode}`);
    if (data.brand) ctxLines.push(`BRAND: ${data.brand}`);
    if (data.currentSlug) ctxLines.push(`CURRENT_PAGE_SLUG: ${data.currentSlug}`);
    if (data.existingPages.length) {
      ctxLines.push(
        `EXISTING_PAGES: ${data.existingPages.map((p) => `${p.slug} (${p.title})`).join(", ")}`,
      );
    } else {
      ctxLines.push(`EXISTING_PAGES: (none yet - this is the first page)`);
    }
    if (data.mode === "new-page") {
      ctxLines.push(
        `INSTRUCTION: Generate a brand new page. Regenerate headerHtml so its <nav> lists ALL existing pages PLUS this new one.`,
      );
    } else if (data.mode === "edit") {
      ctxLines.push(
        `INSTRUCTION: Edit the existing page with slug "${data.currentSlug}". Keep the same slug. Only return headerHtml/footerHtml/themeCss if your edit changes them.`,
      );
    } else {
      ctxLines.push(
        `INSTRUCTION: This is the first page of a new site. Generate brand, themeCss, headerHtml (with just this one page link), footerHtml, and pageHtml.`,
      );
    }
    if (data.userImageDataUrl) {
      ctxLines.push(
        `USER_IMAGE: The user provided a custom image. Use the marker {{USER_IMAGE}} as the src and the system will swap it in.`,
      );
    }
    if (data.standardPrompt) {
      ctxLines.push(`STANDARD_PROMPT (always-apply user style guide):\n${data.standardPrompt}`);
    }

    const fullSystem = data.applyDesignSystem
      ? `${SYSTEM_PROMPT}\n\n${DESIGN_SYSTEM_RULES}`
      : SYSTEM_PROMPT;
    const contextMessage = { role: "system" as const, content: ctxLines.join("\n") };

    // Collapse the chat history into a single user message for BYOK providers
    // that don't accept multi-turn system+context messages the same way.
    const userTurn = data.messages
      .map((m) => `[${m.role.toUpperCase()}] ${m.content}`)
      .join("\n\n");

    let content = "";
    const isCustom = data.model === "custom" && !!data.customEndpoint;
    const endpoint = isCustom ? data.customEndpoint! : "https://ai.gateway.lovable.dev/v1/chat/completions";
    const model = (data.model && data.model !== "custom") ? data.model : "google/gemini-2.5-flash";
    if (data.byok) {
      const r = await callProvider(data.byok.provider, {
        apiKey: data.byok.apiKey,
        model: data.byok.model,
        system: `${fullSystem}\n\n${ctxLines.join("\n")}`,
        user: userTurn,
        jsonMode: true,
      });
      content = r.text;
    } else {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 8192,
          ...(isCustom ? {} : { response_format: { type: "json_object" } }),
          messages: [
            { role: "system", content: fullSystem },
            contextMessage,
            ...data.messages,
          ],
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        if (response.status === 429) throw new Error("Rate limit exceeded. Try again in a moment.");
        if (response.status === 402) throw new Error("AI credits exhausted. Add credits to your workspace.");
        throw new Error(`AI gateway error (${response.status}): ${text}`);
      }

      const json = await response.json();
      content = json.choices?.[0]?.message?.content ?? "";
    }


    let parsed = extractJsonObject(content);
    if (!parsed && !data.byok && apiKey) {
      const repairResponse = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 8192,
          ...(isCustom ? {} : { response_format: { type: "json_object" } }),
          messages: [
            {
              role: "system",
              content: "Repair the assistant output into exactly one valid JSON object matching the HYCS developer schema. Preserve HTML, CSS and JS strings. Return only raw JSON.",
            },
            { role: "user", content: content.slice(0, 24000) },
          ],
        }),
      });
      if (repairResponse.ok) {
        const repairJson = await repairResponse.json();
        content = repairJson.choices?.[0]?.message?.content ?? content;
        parsed = extractJsonObject(content);
      }
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("AI returned incomplete JSON. Try a shorter request or switch the Developer model.");
    }

    let pageHtml = typeof parsed.pageHtml === "string" ? parsed.pageHtml : null;
    let headerHtml = typeof parsed.headerHtml === "string" ? parsed.headerHtml : null;

    if (pageHtml && data.userImageDataUrl) {
      pageHtml = pageHtml.split("{{USER_IMAGE}}").join(data.userImageDataUrl);
    }

    async function resolveImagesInHtml(html: string): Promise<string> {
      const rx = /https:\/\/source\.unsplash\.com\/featured\/(\d+)x(\d+)\/?\?([^"'\s)]+)/g;
      const matches = Array.from(html.matchAll(rx));
      let out = html;
      const seen = new Set<string>();
      for (const m of matches) {
        const full = m[0];
        if (seen.has(full)) continue;
        seen.add(full);
        const keyword = decodeURIComponent(m[3].split(",")[0]).replace(/[+]/g, " ").trim();
        if (!keyword) continue;
        let url: string | null = null;
        if (data.pexelsEnabled) {
          const pkey = process.env.PEXELS_API_KEY;
          if (pkey) {
            try {
              const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=1`, { headers: { Authorization: pkey } });
              if (r.ok) {
                const j = await r.json();
                url = j.photos?.[0]?.src?.large2x || j.photos?.[0]?.src?.medium || null;
              }
            } catch { /* ignore */ }
          }
        }
        if (!url && data.pixabayEnabled) {
          const xkey = process.env.PIXABAY_API_KEY;
          if (xkey) {
            try {
              const r = await fetch(`https://pixabay.com/api/?key=${xkey}&q=${encodeURIComponent(keyword)}&image_type=photo&per_page=3`);
              if (r.ok) {
                const j = await r.json();
                url = j.hits?.[0]?.webformatURL || null;
              }
            } catch { /* ignore */ }
          }
        }
        if (url) out = out.split(full).join(url);
      }
      return out;
    }

    if (pageHtml) pageHtml = await resolveImagesInHtml(pageHtml);
    if (headerHtml) headerHtml = await resolveImagesInHtml(headerHtml);

    return {
      summary: String(parsed.summary ?? "Updated."),
      slug: typeof parsed.slug === "string" ? parsed.slug : null,
      title: typeof parsed.title === "string" ? parsed.title : null,
      brand: typeof parsed.brand === "string" ? parsed.brand : null,
      themeCss: typeof parsed.themeCss === "string" ? parsed.themeCss : null,
      headerHtml,
      footerHtml: typeof parsed.footerHtml === "string" ? parsed.footerHtml : null,
      pageHtml,
      raw: content,
    };
  });
