import { createFileRoute } from "@tanstack/react-router";
import { useLikeableStore, wrapPage } from "@/lib/likeable-store";

export const Route = createFileRoute("/output")({
  head: () => ({
    meta: [
      { title: "Output — Likeable" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Output,
});

function Output() {
  const { project } = useLikeableStore();
  const slug = project.currentPage;
  const hasPage = !!project.pages[slug];

  if (!hasPage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-xl font-bold mb-2">No site generated yet</h1>
          <p className="text-muted-foreground text-sm mb-4">
            Head back to Likeable and describe a website to build.
          </p>
          <a href="/" className="text-sm underline">Go to Likeable</a>
        </div>
      </div>
    );
  }

  return (
    <iframe
      title="Likeable output"
      srcDoc={wrapPage(project, slug)}
      sandbox="allow-scripts allow-forms allow-popups"
      className="fixed inset-0 w-screen h-screen border-0 bg-white"
    />
  );
}
