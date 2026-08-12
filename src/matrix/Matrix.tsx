import { useMemo, useState } from "react";
import type { Board, BoardParameter, CandidateOption } from "../types";
import { useBoardStore } from "../store/boards";
import { scoreBoard, type CandidateScore } from "../scoring/consensus";
import { normalizeAll } from "../scoring/normalize";
import { formatValue } from "./format";
import { ConfidenceBadge } from "../ui/ConfidenceBadge";
import { uid } from "../ingest/pipeline";
import { sfx } from "../lib/audio";

export function Matrix({ board }: { board: Board }) {
  const { updateCell, toggleHardConstraint, eliminate, restore, addParameter } = useBoardStore();
  const result = useMemo(() => scoreBoard(board), [board]);
  const grid = useMemo(() => normalizeAll(board.parameters, board.candidates), [board]);
  const scoreById = new Map(result.scores.map((s) => [s.candidateId, s]));
  const rankById = new Map(result.ranked.map((s, i) => [s.candidateId, i + 1]));

  return (
    <div className="glass overflow-hidden">
      <div className="flex items-center justify-between p-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mist">Comparison matrix</h2>
        <AddParameter onAdd={(p) => addParameter(p)} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[190px] bg-surface2/80 p-3 text-left text-xs font-semibold text-muted backdrop-blur">
                Parameter
              </th>
              {board.candidates.map((c) => {
                const s = scoreById.get(c.id);
                const rank = rankById.get(c.id);
                return (
                  <th key={c.id} className="min-w-[170px] p-3 text-left align-top">
                    <div className="flex items-center gap-2">
                      {rank && <span className="chip bg-cyan/15 text-cyan">#{rank}</span>}
                      <span className={`font-bold ${c.isEliminated ? "text-muted line-through" : "text-white"}`}>
                        {c.title}
                      </span>
                    </div>
                    <ScoreLine s={s} eliminated={c.isEliminated} />
                    <div className="mt-1">
                      {c.isEliminated ? (
                        <button className="text-[11px] text-cyan hover:underline" onClick={() => restore(c.id)}>
                          ♻ restore
                        </button>
                      ) : (
                        <button
                          className="text-[11px] text-muted hover:text-rose"
                          onClick={() => {
                            sfx.dismiss();
                            eliminate(c.id, "Eliminated from the matrix");
                          }}
                        >
                          ✕ eliminate
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {board.parameters.map((p) => (
              <tr key={p.id} className="border-t border-line/50">
                <td className="sticky left-0 z-10 bg-surface2/80 p-3 align-top backdrop-blur">
                  <div className="flex items-center gap-1.5">
                    <span className="text-mist">{p.label}</span>
                    <span className="chip bg-ink/60 text-muted">T{p.tier}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                    <span>{p.direction === "lower_better" ? "lower ↓" : p.direction === "higher_better" ? "higher ↑" : "—"}</span>
                    <button
                      className={`chip ring-1 ${p.isHardConstraint ? "text-rose ring-rose/40" : "text-muted ring-line"}`}
                      onClick={() => toggleHardConstraint(p.id)}
                      title="Toggle as a hard must-pass constraint"
                    >
                      {p.isHardConstraint ? "⛔ hard" : "soft"}
                    </button>
                  </div>
                </td>
                {board.candidates.map((c) => {
                  const norm = grid[c.id]?.[p.key] ?? 50;
                  const best = norm >= 99.5 && p.direction !== "neutral";
                  return (
                    <td key={c.id} className={`p-3 align-top ${c.isEliminated ? "opacity-40" : ""}`}>
                      <div className="flex items-center gap-2">
                        <EditableCell board={board} candidate={c} param={p} onSave={updateCell} best={best} />
                      </div>
                      {c.cells[p.key] && (
                        <div className="mt-1">
                          <ConfidenceBadge
                            confidence={c.cells[p.key].confidence}
                            provenance={c.cells[p.key].provenance}
                          />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreLine({ s, eliminated }: { s?: CandidateScore; eliminated: boolean }) {
  if (!s) return null;
  if (s.omega === 0) {
    return (
      <div className="mt-1 text-[11px] text-rose">
        ⛔ fails: {s.failedConstraints.join(", ")}
      </div>
    );
  }
  return (
    <div className="mt-1 flex items-center gap-2">
      <span className={`mono text-lg font-bold ${eliminated ? "text-muted" : "text-cyan"}`}>
        {s.cs.toFixed(1)}
      </span>
      <span className="text-[10px] text-muted">consensus</span>
    </div>
  );
}

function EditableCell({
  candidate,
  param,
  onSave,
  best,
}: {
  board: Board;
  candidate: CandidateOption;
  param: BoardParameter;
  onSave: (candidateId: string, key: string, value: string | number | boolean | null) => void;
  best: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const cell = candidate.cells[param.key];
  const [draft, setDraft] = useState("");

  function begin() {
    setDraft(cell?.value == null ? "" : String(cell.value));
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    const raw = draft.trim();
    if (raw === "") return onSave(candidate.id, param.key, null);
    if (param.dataType === "NUMBER" || param.dataType === "CURRENCY") {
      const n = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""));
      return onSave(candidate.id, param.key, Number.isFinite(n) ? n : raw);
    }
    if (param.dataType === "BOOLEAN") {
      return onSave(candidate.id, param.key, /^(y|t|1|yes|true)/i.test(raw));
    }
    onSave(candidate.id, param.key, raw);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="w-24 rounded border border-cyan bg-ink/70 px-1 py-0.5 font-mono text-xs text-white outline-none"
      />
    );
  }
  return (
    <button onClick={begin} className={`mono text-left ${best ? "text-cyan" : "text-white"}`} title="Click to edit">
      {best && <span className="mr-1">★</span>}
      {formatValue(param, cell)}
    </button>
  );
}

function AddParameter({ onAdd }: { onAdd: (p: BoardParameter) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  function add() {
    if (!label.trim()) return;
    onAdd({
      id: uid("param"),
      key: label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      label: label.trim(),
      tier: 3,
      dataType: "NUMBER",
      direction: "higher_better",
      weight: 0.05,
      isHardConstraint: false,
    });
    setLabel("");
    setOpen(false);
  }
  if (!open)
    return (
      <button className="btn-ghost !py-1 text-xs" onClick={() => setOpen(true)}>
        + Add parameter
      </button>
    );
  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        placeholder="e.g. 3-Year Cost"
        className="w-40 rounded border border-line bg-ink/60 px-2 py-1 text-xs text-white outline-none focus:border-cyan"
      />
      <button className="btn-primary !py-1 text-xs" onClick={add}>
        Add
      </button>
    </div>
  );
}
