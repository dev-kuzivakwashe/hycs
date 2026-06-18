import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Strip em dashes and en dashes from text — HYCS UI uses hyphens only. */
function clean(text: string) {
  return text.replace(/\u2014/g, " - ").replace(/\u2013/g, "-");
}

export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`prose-hycs ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{clean(children)}</ReactMarkdown>
    </div>
  );
}
