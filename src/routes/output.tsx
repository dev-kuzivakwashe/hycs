import { createFileRoute } from "@tanstack/react-router";
import { useLikeableStore, wrapPage } from "@/lib/likeable-store";

export const Route = createFileRoute("/output")({
  head: () => ({
    meta: [
      { title: "Output - HYCS" },
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
            Head back to HYCS and describe a website to build.
          </p>
          <a href="/" className="text-sm underline">Go to HYCS</a>
        </div>
      </div>
    );
  }

  return (
    <iframe
      title="HYCS output"
      srcDoc={wrapPage(project, slug)}
      sandbox="allow-scripts allow-forms allow-popups"
      className="fixed inset-0 w-screen h-screen border-0 bg-white"
    />
  );
}
