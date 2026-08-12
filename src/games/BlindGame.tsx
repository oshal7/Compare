import { useMemo, useState } from "react";
import type { Board, CandidateOption } from "../types";
import type { MatchupTelemetry } from "../lib/telemetry";
import { useBoardStore } from "../store/boards";
import { Matchup } from "./Matchup";
import { Done, Empty } from "./BracketGame";

/** Game 2 — Blind Feature Trade-off. Brands/prices hidden; vote on specs alone. */
export function BlindGame({ board, onDone }: { board: Board; onDone: () => void }) {
  const recordBlind = useBoardStore((s) => s.recordBlind);
  const active = useMemo(() => board.candidates.filter((c) => !c.isEliminated), [board]);
  const pairs = useMemo(() => buildPairs(active), [active]);
  const [idx, setIdx] = useState(0);

  if (active.length < 2) return <Empty onDone={onDone} />;
  const pair = pairs[idx];
  if (!pair) {
    return <Done title="Blind round complete" subtitle="Brand bias exposed — see the results." onDone={onDone} />;
  }

  function choose(winner: CandidateOption, loser: CandidateOption, tel: MatchupTelemetry) {
    recordBlind({ winnerId: winner.id, loserId: loser.id, ...tel });
    setIdx((i) => i + 1);
  }

  return (
    <Matchup
      left={pair[0]}
      right={pair[1]}
      params={board.parameters}
      blind
      onChoose={choose}
      progress={`Blind · match ${idx + 1} of ${pairs.length}`}
    />
  );
}

/** Round-robin-ish pairing, capped so the round stays short. */
export function buildPairs(cands: CandidateOption[]): [CandidateOption, CandidateOption][] {
  const pairs: [CandidateOption, CandidateOption][] = [];
  for (let i = 0; i < cands.length; i++) {
    for (let j = i + 1; j < cands.length; j++) pairs.push([cands[i], cands[j]]);
  }
  // Shuffle deterministically-ish and cap to 6 matchups.
  return pairs.sort(() => Math.random() - 0.5).slice(0, 6);
}
