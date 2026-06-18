import { useState } from "react";
import { Check, Pencil, X, Plus, AlertTriangle, Clock, Trash2 } from "lucide-react";
import type { Plan } from "@/lib/likeable-planner.functions";

type Props = {
  plan: Plan;
  status: "pending" | "approved" | "rejected";
  onApprove: (finalPlan: Plan) => void;
  onReject: () => void;
};

const sizeColor: Record<Plan["size"], string> = {
  Small: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Large: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export function PlanCard({ plan, status, onApprove, onReject }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Plan>(plan);

  if (status === "approved") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs flex items-center gap-2">
        <Check className="w-4 h-4 text-emerald-400" />
        <span className="font-medium">Plan approved, building "{plan.name}"</span>
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="rounded-2xl border border-muted bg-muted/30 p-3 text-xs flex items-center gap-2 text-muted-foreground">
        <X className="w-4 h-4" /> Plan dismissed.
      </div>
    );
  }

  const view = editing ? draft : plan;

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3 text-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {editing ? (
            <input
              className="w-full bg-input border rounded px-2 py-1 font-bold text-base"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          ) : (
            <h3 className="font-bold text-base truncate">{view.name}</h3>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {editing ? (
              <select
                className="text-[10px] px-2 py-0.5 rounded-full border bg-input"
                value={draft.size}
                onChange={(e) => setDraft({ ...draft, size: e.target.value as Plan["size"] })}
              >
                <option>Small</option><option>Medium</option><option>Large</option>
              </select>
            ) : (
              <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${sizeColor[view.size]}`}>
                {view.size}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> {view.timeEstimate}
            </span>
          </div>
        </div>
      </div>

      {/* Scope */}
      {editing ? (
        <textarea
          className="w-full bg-input border rounded px-2 py-1 text-xs"
          rows={2}
          value={draft.scope}
          onChange={(e) => setDraft({ ...draft, scope: e.target.value })}
        />
      ) : (
        <p className="text-xs text-muted-foreground italic">{view.scope}</p>
      )}

      {/* Items */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Items ({view.items.length})
        </div>
        <ul className="space-y-2">
          {view.items.map((it, i) => (
            <li key={i} className="rounded-lg border bg-background/50 p-2.5 text-xs space-y-1.5 relative">
              {editing && (
                <button
                  onClick={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== i) })}
                  className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                  title="Remove item"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              {editing ? (
                <>
                  <LabeledField label="What" value={it.what} onChange={(v) => updateItem(draft, setDraft, i, { what: v })} />
                  <LabeledField label="How" value={it.how} onChange={(v) => updateItem(draft, setDraft, i, { how: v })} />
                  <LabeledField label="Where" value={it.where} onChange={(v) => updateItem(draft, setDraft, i, { where: v })} />
                  <LabeledField label="Edge cases" value={it.edgeCases} onChange={(v) => updateItem(draft, setDraft, i, { edgeCases: v })} />
                  <LabeledField label="Autonomous" value={it.autonomous || ""} onChange={(v) => updateItem(draft, setDraft, i, { autonomous: v })} />
                </>
              ) : (
                <>
                  <div className="font-medium">{i + 1}. {it.what}</div>
                  <div><span className="text-muted-foreground">How: </span>{it.how}</div>
                  <div><span className="text-muted-foreground">Where: </span>{it.where}</div>
                  <div><span className="text-muted-foreground">Edge cases: </span>{it.edgeCases}</div>
                  {it.autonomous && (
                    <div className="flex items-start gap-1 text-amber-400">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span><span className="font-medium">Autonomous decision: </span>{it.autonomous}</span>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
        {editing && (
          <button
            onClick={() => setDraft({ ...draft, items: [...draft.items, { what: "", how: "", where: "", edgeCases: "", autonomous: "" }] })}
            className="mt-2 text-[11px] flex items-center gap-1 px-2 py-1 rounded border hover:bg-accent"
          >
            <Plus className="w-3 h-3" /> Add item
          </button>
        )}
      </div>

      {/* Open Questions */}
      {(view.openQuestions.length > 0 || editing) && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Open questions {view.openQuestions.length > 0 && `(${view.openQuestions.length})`}
            {!editing && view.openQuestions.length > 0 && (
              <span className="ml-2 normal-case text-[10px] text-muted-foreground/70">
                — Approve uses defaults
              </span>
            )}
          </div>
          {view.openQuestions.length === 0 && editing && (
            <div className="text-[11px] text-muted-foreground italic mb-2">No open questions.</div>
          )}
          <ul className="space-y-2">
            {view.openQuestions.map((q, i) => (
              <li key={i} className="rounded-lg border bg-background/50 p-2.5 text-xs space-y-1 relative">
                {editing && (
                  <button
                    onClick={() => setDraft({ ...draft, openQuestions: draft.openQuestions.filter((_, j) => j !== i) })}
                    className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                {editing ? (
                  <>
                    <LabeledField label="Question" value={q.question} onChange={(v) => updateQ(draft, setDraft, i, { question: v })} />
                    <LabeledField label="Answer" value={q.defaultAnswer} onChange={(v) => updateQ(draft, setDraft, i, { defaultAnswer: v })} />
                  </>
                ) : (
                  <>
                    <div className="font-medium">Q: {q.question}</div>
                    <div><span className="text-muted-foreground">Default: </span>{q.defaultAnswer}</div>
                  </>
                )}
              </li>
            ))}
          </ul>
          {editing && draft.openQuestions.length < 5 && (
            <button
              onClick={() => setDraft({ ...draft, openQuestions: [...draft.openQuestions, { question: "", defaultAnswer: "" }] })}
              className="mt-2 text-[11px] flex items-center gap-1 px-2 py-1 rounded border hover:bg-accent"
            >
              <Plus className="w-3 h-3" /> Add question
            </button>
          )}
        </div>
      )}

      {/* Appendix */}
      {hasAppendix(view) && (
        <details className="text-xs">
          <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Technical appendix
          </summary>
          <div className="mt-2 space-y-1 pl-2 border-l-2 border-border">
            {view.appendix.migrations && <div><span className="text-muted-foreground">Migrations: </span>{view.appendix.migrations}</div>}
            {view.appendix.policies && <div><span className="text-muted-foreground">Policies: </span>{view.appendix.policies}</div>}
            {view.appendix.serverFunctions && <div><span className="text-muted-foreground">Server fns: </span>{view.appendix.serverFunctions}</div>}
            {view.appendix.external && <div><span className="text-muted-foreground">External: </span>{view.appendix.external}</div>}
          </div>
        </details>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t">
        {editing ? (
          <>
            <button
              onClick={() => { setEditing(false); onApprove(draft); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg brand-bg text-white text-xs font-medium"
            >
              <Check className="w-3.5 h-3.5" /> Save & approve
            </button>
            <button
              onClick={() => { setDraft(plan); setEditing(false); }}
              className="px-3 py-2 rounded-lg border text-xs hover:bg-accent"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onApprove(plan)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg brand-bg text-white text-xs font-medium"
            >
              <Check className="w-3.5 h-3.5" /> Approve plan
            </button>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs hover:bg-accent"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={onReject}
              className="p-2 rounded-lg border text-xs hover:bg-accent text-muted-foreground"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function hasAppendix(p: Plan) {
  const a = p.appendix;
  return !!(a.migrations || a.policies || a.serverFunctions || a.external);
}

function updateItem(d: Plan, set: (p: Plan) => void, i: number, patch: Partial<Plan["items"][number]>) {
  set({ ...d, items: d.items.map((it, j) => j === i ? { ...it, ...patch } : it) });
}
function updateQ(d: Plan, set: (p: Plan) => void, i: number, patch: Partial<Plan["openQuestions"][number]>) {
  set({ ...d, openQuestions: d.openQuestions.map((q, j) => j === i ? { ...q, ...patch } : q) });
}

function LabeledField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">{label}</div>
      <textarea
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-input border rounded px-2 py-1 text-xs"
      />
    </div>
  );
}
