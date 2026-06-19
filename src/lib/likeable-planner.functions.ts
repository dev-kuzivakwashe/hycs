import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callProvider } from "./byok-call.functions";


/**
 * Planner Agent. Separate from the Developer (code-writing) model.
 * Takes a raw user prompt + project context, and returns a structured Plan
 * the Developer Agent can consume. The Planner NEVER writes code.
 */

const PLANNER_SYSTEM = `You are the Likeable Planner Agent — a requirements planner for a website-building platform. You NEVER write code. Your only output is a structured plan.

Given the user's request, you must:
1. Decompose it into discrete feature/change items.
2. Resolve ambiguities. If something is unclear, surface it as an "open question" with a sensible default answer.
3. Flag autonomous decisions you make (anything not explicitly requested).
4. Estimate scope.

You MUST return EXACTLY ONE JSON object inside a single \`\`\`json fenced code block. No prose before or after. Schema:

{
  "name": string,                        // short name for the change, e.g. "Coffee shop hero + menu page"
  "size": "Small" | "Medium" | "Large",  // multi-area change size
  "scope": string,                       // one-sentence scope summary
  "items": [                             // 1..N feature breakdown items
    {
      "what": string,                    // clear description
      "how": string,                     // technical approach
      "where": string,                   // routes / sections / files / pages affected
      "edgeCases": string,               // existing data, unauth users, empty states, etc.
      "autonomous": string               // OPTIONAL: a decision YOU made on your own; "" if none
    }
  ],
  "openQuestions": [                     // 0..5; empty array if prompt is fully clear
    { "question": string, "defaultAnswer": string }
  ],
  "appendix": {
    "migrations": string,                // table/column changes, or "" if N/A
    "policies": string,                  // RLS / access policies, or ""
    "serverFunctions": string,           // new server fns required, or ""
    "external": string                   // external service setup, or ""
  },
  "mockCleanup": [string],               // explicit list of mock files / placeholders / fake data to DELETE
  "timeEstimate": string                 // e.g. "~30 min", "~2-3 hours"
}

Rules:
- Keep "openQuestions" to AT MOST 5. Each must be specific, answerable, and have a sensible default.
- If the prompt is fully clear, return an empty openQuestions array — still produce the plan.
- Be concise. No marketing language.
- This platform builds standalone HTML websites with Bootstrap 5; "files" usually means pages (home.html, about.html, etc.) and shared theme.css/header/footer.
- Do NOT propose code. Describe intent and structure only.`;

const SizeEnum = z.enum(["Small", "Medium", "Large"]);

export const PlanSchema = z.object({
  name: z.string(),
  size: SizeEnum,
  scope: z.string(),
  items: z.array(z.object({
    what: z.string(),
    how: z.string(),
    where: z.string(),
    edgeCases: z.string(),
    autonomous: z.string().optional().default(""),
  })).min(1),
  openQuestions: z.array(z.object({
    question: z.string(),
    defaultAnswer: z.string(),
  })).max(5).default([]),
  appendix: z.object({
    migrations: z.string().default(""),
    policies: z.string().default(""),
    serverFunctions: z.string().default(""),
    external: z.string().default(""),
  }).default({ migrations: "", policies: "", serverFunctions: "", external: "" }),
  mockCleanup: z.array(z.string()).default([]),
  timeEstimate: z.string().default("~unknown"),
});

export type Plan = z.infer<typeof PlanSchema>;

export const planRequest = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      prompt: z.string().min(1),
      mode: z.enum(["first", "new-page", "edit"]),
      brand: z.string().optional(),
      currentSlug: z.string().optional(),
      existingPages: z.array(z.object({ slug: z.string(), title: z.string() })).default([]),
      standardPrompt: z.string().optional(),
      plannerModel: z.string().optional(),
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

    const ctx: string[] = [];
    ctx.push(`MODE: ${data.mode}`);
    if (data.brand) ctx.push(`BRAND: ${data.brand}`);
    if (data.currentSlug) ctx.push(`CURRENT_PAGE: ${data.currentSlug}`);
    if (data.existingPages.length) {
      ctx.push(`EXISTING_PAGES: ${data.existingPages.map((p) => p.slug).join(", ")}`);
    } else {
      ctx.push(`EXISTING_PAGES: (none — this is a brand new site)`);
    }
    if (data.standardPrompt) ctx.push(`STANDARD_STYLE_PROMPT:\n${data.standardPrompt}`);

    const model = data.byok?.model || data.plannerModel || "google/gemini-2.5-flash-lite";

    let content = "";
    if (data.byok) {
      const r = await callProvider(data.byok.provider, {
        apiKey: data.byok.apiKey,
        model: data.byok.model,
        system: `${PLANNER_SYSTEM}\n\n${ctx.join("\n")}`,
        user: data.prompt,
      });
      content = r.text;
    } else {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: PLANNER_SYSTEM },
            { role: "system", content: ctx.join("\n") },
            { role: "user", content: data.prompt },
          ],
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (res.status === 429) throw new Error("Planner rate-limited. Try again in a moment.");
        if (res.status === 402) throw new Error("AI credits exhausted.");
        throw new Error(`Planner error (${res.status}): ${text}`);
      }
      const json = await res.json();
      content = json.choices?.[0]?.message?.content ?? "";
    }

    const match = content.match(/```json\s*([\s\S]*?)```/i) ?? content.match(/```\s*([\s\S]*?)```/i);
    const raw = match ? match[1].trim() : content.trim();

    let parsed: unknown = null;
    try { parsed = JSON.parse(raw); }
    catch {
      const s = raw.indexOf("{"); const e = raw.lastIndexOf("}");
      if (s >= 0 && e > s) { try { parsed = JSON.parse(raw.slice(s, e + 1)); } catch { /* */ } }
    }

    const result = PlanSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error("Planner returned an invalid plan. Please rephrase.");
    }
    return { plan: result.data, model };
  });

/** Build the final spec string the Developer Agent receives. */
export function planToFinalSpec(plan: Plan, originalPrompt: string): string {
  const items = plan.items.map((it, i) =>
    `  ${i + 1}. ${it.what}\n     - approach: ${it.how}\n     - where: ${it.where}\n     - edge cases: ${it.edgeCases}${it.autonomous ? `\n     - autonomous decision: ${it.autonomous}` : ""}`,
  ).join("\n");
  const qa = plan.openQuestions.length
    ? plan.openQuestions.map((q) => `  - ${q.question}\n    answer: ${q.defaultAnswer}`).join("\n")
    : "  (none)";
  const cleanup = plan.mockCleanup.length ? plan.mockCleanup.map((s) => `  - DELETE: ${s}`).join("\n") : "  (none)";
  return [
    `APPROVED PLAN — implement EXACTLY this. Do not ask questions. If a step is impossible, report and stop.`,
    ``,
    `Original user request: ${originalPrompt}`,
    ``,
    `Name: ${plan.name}`,
    `Size: ${plan.size}`,
    `Scope: ${plan.scope}`,
    ``,
    `Items:`,
    items,
    ``,
    `Resolved questions / answers:`,
    qa,
    ``,
    `Mock cleanup (delete, not comment out):`,
    cleanup,
    ``,
    `Time estimate: ${plan.timeEstimate}`,
  ].join("\n");
}
