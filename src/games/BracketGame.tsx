import { useMemo, useState } from "react";
import type { Board, CandidateOption } from "../types";
import type { MatchupTelemetry } from "../lib/telemetry";
import { useBoardStore } from "../store/boards";
import { Matchup } from "./Matchup";

/** Game 1 — single-elimination bracket. Winner advances to face each challenger. */
export function BracketGame({ board, onDone }: { board: Board; onDone: () => void }) {
  const recordBracket = useBoardStore((s) => s.recordBracket);
  const active = useMemo(() => board.candidates.filter((c) => !c.isEliminated), [board]);
  const [championId, setChampionId] = useState(active[0]?.id ?? "");
  const [idx, setIdx] = useState(1); // next challenger index

  if (active.length < 2) {
    return <Empty onDone={onDone} />;
  }

  const champion = active.find((c) => c.id === championId) ?? active[0];
  const challenger = active[idx];

  if (!challenger) {
    return (
      <Done
        title="Bracket complete"
        subtitle={`Champion of the bracket: ${champion.title}`}
        onDone={onDone}
      />
    );
  }

  function choose(winner: CandidateOption, loser: CandidateOption, tel: MatchupTelemetry) {
    recordBracket({ winnerId: winner.id, loserId: loser.id, ...tel });
    if (winner.id === challenger.id) setChampionId(challenger.id);
    setIdx((i) => i + 1);
  }

  return (
    <Matchup
      left={champion}
      right={challenger}
      params={board.parameters}
      onChoose={choose}
      progress={`Bracket · match ${idx} of ${active.length - 1}`}
    />
  );
}

export function Empty({ onDone }: { onDone: () => void }) {
  return (
    <div className="glass p-6 text-center text-mist">
      Need at least two options still in play.
      <div className="mt-3">
        <button className="btn-ghost" onClick={onDone}>
          Back
        </button>
      </div>
    </div>
  );
}

export function Done({ title, subtitle, onDone }: { title: string; subtitle: string; onDone: () => void }) {
  return (
    <div className="glass p-6 text-center">
      <div className="text-lg font-bold text-white">{title}</div>
      <div className="mt-1 text-sm text-mist">{subtitle}</div>
      <button className="btn-primary mt-4" onClick={onDone}>
        Back to games
      </button>
    </div>
  );
}
