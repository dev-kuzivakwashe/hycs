import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const pageMetaSchema = z.object({
  slug: z.string(),
  title: z.string(),
});

const SYSTEM_PROMPT = `You are Likeable, an AI multi-page website builder.

You return EXACTLY ONE JSON object inside a single \`\`\`json fenced code block. No prose before or after.

JSON shape (fields are optional unless noted):
{
  "summary": string,                 // REQUIRED: one short sentence describing what you built/changed
  "slug": string,                    // REQUIRED: page slug like "home", "about", "menu" (lowercase, kebab-case)
  "title": string,                   // REQUIRED: human page title
  "brand": string,                   // include on the FIRST page only — short brand name
  "themeCss": string,                // include on FIRST page only — see THEME RULES below
  "headerHtml": string,              // include on FIRST page AND whenever a new page is added. Bootstrap 5 responsive navbar with brand + ≥5 nav items (use placeholder slugs if pages don't exist yet: home, about, services, contact, blog). Nav links MUST use href="/SLUG" (use "/" for home). Must collapse on mobile via navbar-toggler.
  "footerHtml": string,              // include on FIRST page only (or when explicitly editing footer). Footer with address (country, city, street, building no.), phone, email, social icons/word links, and © {year} brand.
  "pageHtml": string                 // REQUIRED: body content for this page ONLY. Do NOT include <html>, <head>, <body>, <header>, or <footer> tags — those are injected by the system.
}

# HARD STRUCTURAL RULES

Every page MUST follow this semantic structure (omit a section only if it doesn't make sense for that page — but home pages MUST have all five):

1. **Hero section** — full-width <section> with a background image (use https://source.unsplash.com/featured/1600x900/?KEYWORD), a semi-transparent dark overlay for contrast, a clear mission statement (h1), a sub-line, and a primary CTA button. Responsive — works on mobile, tablet, desktop.
2. **About section** — theme-color OR white background, short paragraph (max ~80 words) with custom typography, centered image with a UNIQUE asymmetric border-radius like \`border-radius: 3px 14px 1px 22px;\` (pick fresh values each time).
3. **Services / Features section** — grid or flexbox of ≥3 cards. Each card: optional image, heading, description, action button (View more / Learn more / Get started). Use overlay text on image only if text sits on top. All cards share the SAME custom border-radius.
4. **Contact section** — <form> with ≥5 inputs + a submit button. MIX label-style with placeholder-style (some inputs have a <label> and no placeholder, others have a placeholder and no label). Border-radius rule: EITHER custom radius on submit + minimal on inputs, OR custom on inputs + basic on submit (pick one). The form's onsubmit must be: \`onsubmit="event.preventDefault();this.reset();window.dispatchEvent(new CustomEvent('likeable-toast',{detail:'Message sent! We will be in touch.'}));"\` and the page should also include a small inline <script> that listens for that event and shows a designed toast (NOT alert()).
5. **Footer details** — address (country, state/city, street, building #), phone, email, social links (icons or words), © current year + brand. Optionally precede with an iframe Google-Maps-style placeholder.

# STYLING RULES (apply via themeCss on first page, and inline <style> per page as needed)

- **Typography**: readable web-safe fonts, sizes in rem/em (NOT px). Contrast WCAG AA — no light grey on white, no plain text over images without overlay.
- **Layout**: flexbox/grid only (no floats). Use \`gap\` for spacing. Apply \`margin-bottom\` to headings/paragraphs rather than relying on adjacent-sibling tricks. Include a reset: \`*{margin:0;padding:0;box-sizing:border-box}\`.
- **Sizing**: \`box-sizing:border-box\` globally. Images: \`max-width:100%;height:auto;object-fit:cover\`. Containers use % widths with max-width caps — avoid fixed px on outer containers. Use min-height (not height) on dynamic sections.
- **Colors**: define 5–7 CSS custom properties (\`--primary\`, \`--secondary\`, \`--accent\`, \`--bg\`, \`--surface\`, \`--text\`, \`--muted\`). Use creative border-radius unless the brand demands minimalism. \`cursor:pointer\` on every interactive element. Spacing on a 0.5rem scale (0.5/1/1.5/2/3rem).
- **Animation**: add a CSS \`@keyframes\` slide/fade-up and apply it to hero text + each section as it enters. Use IntersectionObserver in an inline <script> so sections animate ONCE when scrolled into view. No looping, no abrupt transforms. Subtle (≤0.6s, ease-out).
- **Randomization**: vary border-radius shapes, card aspect ratios, and accent colors across generations so two sites don't look identical.

# IMAGE RULES

For EVERY <img>, use ONLY these URL patterns (never example.com or fake URLs):
- https://source.unsplash.com/featured/800x600/?KEYWORD   (replace KEYWORD with the subject)
- https://picsum.photos/seed/SEED/800/600                  (any unique seed string)
Always include alt text.

# MODE RULES

- When ADDING a new page, regenerate headerHtml so its nav includes ALL existing pages PLUS this new one (existing slugs listed below).
- When EDITING the current page, return updated pageHtml for the same slug; only include headerHtml/footerHtml/themeCss if your edit specifically touches them.
- Use Bootstrap 5 utility classes (container, row, col-md-*, navbar, card, btn, py-5, etc.) — the system injects Bootstrap CSS+JS.
`;

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
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const ctxLines: string[] = [];
    ctxLines.push(`MODE: ${data.mode}`);
    if (data.brand) ctxLines.push(`BRAND: ${data.brand}`);
    if (data.currentSlug) ctxLines.push(`CURRENT_PAGE_SLUG: ${data.currentSlug}`);
    if (data.existingPages.length) {
      ctxLines.push(
        `EXISTING_PAGES: ${data.existingPages.map((p) => `${p.slug} (${p.title})`).join(", ")}`,
      );
    } else {
      ctxLines.push(`EXISTING_PAGES: (none yet — this is the first page)`);
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
        `USER_IMAGE: The user provided a custom image. Use this exact URL as the primary/hero image in pageHtml: ${data.userImageDataUrl.slice(0, 80)}... (full data URL will be substituted at render). Use the marker {{USER_IMAGE}} as the src and the system will swap it in.`,
      );
    }
    if (data.standardPrompt) {
      ctxLines.push(`STANDARD_PROMPT (always-apply user style guide):\n${data.standardPrompt}`);
    }

    const contextMessage = { role: "system" as const, content: ctxLines.join("\n") };

    // Lovable AI Gateway only supports google/* and openai/*. Custom endpoint hits the user's URL.
    const isCustom = data.model === "custom" && !!data.customEndpoint;
    const endpoint = isCustom ? data.customEndpoint! : "https://ai.gateway.lovable.dev/v1/chat/completions";
    const model = (data.model && data.model !== "custom") ? data.model : "google/gemini-2.5-flash";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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
    const content: string = json.choices?.[0]?.message?.content ?? "";

    const match = content.match(/```json\s*([\s\S]*?)```/i) ?? content.match(/```\s*([\s\S]*?)```/i);
    const rawJson = match ? match[1].trim() : content.trim();
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      // try to salvage: find first { ... last }
      const start = rawJson.indexOf("{");
      const end = rawJson.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try { parsed = JSON.parse(rawJson.slice(start, end + 1)); } catch { /* ignore */ }
      }
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("AI did not return valid JSON. Please rephrase.");
    }

    let pageHtml = typeof parsed.pageHtml === "string" ? parsed.pageHtml : null;
    let headerHtml = typeof parsed.headerHtml === "string" ? parsed.headerHtml : null;

    // Swap {{USER_IMAGE}} marker with the actual data URL
    if (pageHtml && data.userImageDataUrl) {
      pageHtml = pageHtml.split("{{USER_IMAGE}}").join(data.userImageDataUrl);
    }

    // Resolve Unsplash placeholder URLs through Pexels/Pixabay if keys are configured
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
        if (!url) {
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
