import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Look up a single image URL for a query. Tries Pexels then Pixabay; returns null on miss. */
export const fetchProjectImage = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      query: z.string().min(1).max(120),
      pexelsEnabled: z.boolean().default(true),
      pixabayEnabled: z.boolean().default(true),
    }),
  )
  .handler(async ({ data }) => {
    const q = data.query.trim();
    if (data.pexelsEnabled) {
      const k = process.env.PEXELS_API_KEY;
      if (k) {
        try {
          const r = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=1&orientation=landscape`,
            { headers: { Authorization: k } },
          );
          if (r.ok) {
            const j = await r.json();
            const url = j.photos?.[0]?.src?.large || j.photos?.[0]?.src?.medium;
            if (url) return { url, source: "pexels" as const };
          }
        } catch { /* ignore */ }
      }
    }
    if (data.pixabayEnabled) {
      const k = process.env.PIXABAY_API_KEY;
      if (k) {
        try {
          const r = await fetch(
            `https://pixabay.com/api/?key=${k}&q=${encodeURIComponent(q)}&image_type=photo&per_page=3&orientation=horizontal`,
          );
          if (r.ok) {
            const j = await r.json();
            const url = j.hits?.[0]?.webformatURL || j.hits?.[0]?.largeImageURL;
            if (url) return { url, source: "pixabay" as const };
          }
        } catch { /* ignore */ }
      }
    }
    return { url: null, source: null };
  });
