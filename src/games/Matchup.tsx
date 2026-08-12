import { useState } from "react";
import { motion } from "framer-motion";
import type { BoardParameter, CandidateOption } from "../types";
import { formatValue, topParameters } from "../matrix/format";
import { useMatchupTelemetry, type MatchupTelemetry } from "../lib/telemetry";
import { spring } from "../lib/motion";
import { sfx } from "../lib/audio";

/** A 1v1 card matchup with flip-for-detail and telemetry (Games 1–3). */
export function Matchup({
  left,
  right,
  params,
  blind,
  prompt,
  onChoose,
  progress,
}: {
  left: CandidateOption;
  right: CandidateOption;
  params: BoardParameter[];
  blind?: boolean;
  prompt?: string;
  onChoose: (winner: CandidateOption, loser: CandidateOption, tel: MatchupTelemetry) => void;
  progress?: string;
}) {
  const tel = useMatchupTelemetry();

  function choose(winner: CandidateOption, loser: CandidateOption) {
    sfx.confirm();
    onChoose(winner, loser, tel.commit());
    tel.reset();
  }

  return (
    <div>
      {progress && <div className="mb-2 text-center text-xs text-muted">{progress}</div>}
      {prompt && (
        <div className="glass mx-auto mb-4 max-w-2xl border-l-4 !border-l-amber p-3 text-sm italic text-mist">
          {prompt}
        </div>
      )}
      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <Card side="A" c={left} params={params} blind={blind} onHover={tel.onHover} onTentative={tel.onTentative} onPick={() => choose(left, right)} />
        <div className="hidden items-center justify-center sm:flex">
          <span className="mono rounded-full border border-line bg-surface2 px-3 py-1 text-xs text-muted">VS</span>
        </div>
        <Card side="B" c={right} params={params} blind={blind} onHover={tel.onHover} onTentative={tel.onTentative} onPick={() => choose(right, left)} />
      </div>
    </div>
  );
}

function Card({
  side,
  c,
  params,
  blind,
  onHover,
  onTentative,
  onPick,
}: {
  side: string;
  c: CandidateOption;
  params: BoardParameter[];
  blind?: boolean;
  onHover: () => void;
  onTentative: (side: string) => void;
  onPick: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  // In blind mode, hide the identity and any currency (price) parameters (PRD §5.2).
  const shown = blind ? params.filter((p) => p.dataType !== "CURRENCY") : params;
  const rows = flipped ? params : topParameters(shown, 6);

  return (
    <motion.div
      layout
      transition={spring}
      onMouseEnter={() => {
        onHover();
        onTentative(side);
      }}
      className="glass glass-hover flex flex-col p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-base font-bold text-white">
          {blind ? `Option ${side === "A" ? "Alpha" : "Beta"}` : c.title}
        </div>
        <button
          className="text-[11px] text-muted hover:text-cyan"
          onClick={() => setFlipped((v) => !v)}
        >
          {flipped ? "▲ less" : "▼ fine print"}
        </button>
      </div>
      <dl className="flex-1 space-y-1.5 text-sm">
        {rows.map((p) => (
          <div key={p.id} className="flex items-baseline justify-between gap-2">
            <dt className="text-muted">{p.label}</dt>
            <dd className="mono text-mist">{formatValue(p, c.cells[p.key])}</dd>
          </div>
        ))}
      </dl>
      <button className="btn-primary mt-4" onClick={onPick}>
        Pick this
      </button>
    </motion.div>
  );
}
