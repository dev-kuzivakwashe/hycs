# README Structure

## 1. Project Name

HYCS

One sentence.

Answer:

What is HYCS?

---

## 2. The Experiment

Short section.

Answer:

Why does HYCS exist?

This section should explain:

* AI-assisted application generation
* No-framework output
* HTML
* CSS
* JavaScript
* The core hypothesis being tested

Avoid implementation details.

Avoid marketing language.

Avoid roadmap discussions.

---

## 3. Core Principles

Short bullet list.

Examples:

* No-framework output
* User ownership
* Portability
* Simplicity
* Independence
* Accessibility
* Deployability

This section should align with Generation Contract.md.

---

## 4. How HYCS Works

Simple explanation.

Answer:

How does a prompt become an application?

Example:

Prompt
→ Planning
→ Generation
→ Preview
→ Export

High-level only.

No deep architecture discussion.

---

## 5. Tech Stack

Briefly explain what HYCS itself is built with.

Include:

* TanStack Start
* React
* Vite
* Tailwind
* Cloudflare Workers / Lovable Cloud runtime
* AI models and providers
* LocalStorage persistence
* Optional authentication systems
* Deployment environment

Keep it factual.

Avoid defending technology choices.

Avoid explaining the no-framework philosophy here.

The stack describes HYCS, not HYCS-generated output.

---

## 6. File Structure

Show the main project structure.

Example:

```text
src/
  routes/
  components/
  lib/
```

Briefly explain:

* routes
* components
* lib
* documentation
* settings
* generation systems
* integrations

The goal is contributor orientation.

Do not explain every file.

Do not duplicate code comments.

---

## 7. HYCS Interface Breakdown

Explain the major user-facing areas of HYCS.

Examples:

* Prompt / chat interface
* Planning interface
* PlanCard review process
* Preview window
* Code viewer
* Settings
* Documentation
* Output route
* Saved projects

This section should help contributors understand the product before touching the codebase.

---

## 8. What HYCS Generates

Answer:

What can users expect from generated output?

Examples:

* Landing pages
* Business websites
* Dashboards
* Prototypes
* Multi-page websites
* Applications

Reference Generation Contract.md where appropriate.

Keep this section outcome-focused.

---

## 9. What HYCS Does Not Generate

This section is important.

Answer:

What falls outside the experiment?

Examples:

* React output
* Vue output
* Angular output
* Framework-dependent projects
* Bundler-dependent output

Keep this concise.

Refer readers to Generation Contract.md for full details.

---

## 10. Documentation

Navigation section.

Link:

* HYCS Governance.md
* Contribution Workflow.md
* Generation Contract.md

Future documentation may also appear here.

The README should point to documentation, not duplicate it.

---

## 11. Contributing

Short section.

Answer:

How do I start?

Link:

* Contribution Workflow.md

The README should not contain the full contribution process.

---

## 12. Roadmap

Current priorities only.

Examples:

* GitHub deployment
* BYOK
* Design system consistency
* Documentation tooling
* Contributor profiles

Avoid long wishlists.

Avoid speculative features.

---

## 13. License

License information.

One section.

Nothing more.

---

# README Rules

The README should not become:

* Governance documentation
* Architecture documentation
* Marketing material
* Contributor workflow documentation
* Research documentation
* Issue tracking

The README is a front door.

Everything else belongs in dedicated documentation.

A contributor should be able to understand:

* What HYCS is
* Why it exists
* How it works
* Where to go next

within five minutes of opening the repository.
