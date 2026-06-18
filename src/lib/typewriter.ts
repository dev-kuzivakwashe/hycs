import { useEffect, useState } from "react";

/** Cycles through phrases with a typewriter effect (types, holds, deletes, next). */
export function useTypewriter(phrases: string[], opts?: { typeMs?: number; deleteMs?: number; holdMs?: number }) {
  const typeMs = opts?.typeMs ?? 55;
  const deleteMs = opts?.deleteMs ?? 28;
  const holdMs = opts?.holdMs ?? 1600;
  const [text, setText] = useState("");
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<"type" | "hold" | "delete">("type");

  useEffect(() => {
    const phrase = phrases[i % phrases.length] || "";
    let t: ReturnType<typeof setTimeout>;
    if (phase === "type") {
      if (text.length < phrase.length) {
        t = setTimeout(() => setText(phrase.slice(0, text.length + 1)), typeMs);
      } else {
        t = setTimeout(() => setPhase("delete"), holdMs);
      }
    } else if (phase === "delete") {
      if (text.length > 0) {
        t = setTimeout(() => setText(phrase.slice(0, text.length - 1)), deleteMs);
      } else {
        setI((x) => x + 1);
        setPhase("type");
        return;
      }
    }
    return () => clearTimeout(t);
  }, [text, phase, i, phrases, typeMs, deleteMs, holdMs]);

  return text;
}
