import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string };

export function CustomSelect({
  value,
  onChange,
  options,
  disabled,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-input border rounded-lg px-3 py-2 text-sm outline-none hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span className="truncate text-left">{current?.label || placeholder || "Select…"}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-card border rounded-lg shadow-2xl py-1 max-h-64 overflow-auto animate-in fade-in-0 zoom-in-95">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent ${opt.value === value ? "text-foreground" : "text-muted-foreground"}`}
            >
              <span className="truncate">{opt.label}</span>
              {opt.value === value && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
