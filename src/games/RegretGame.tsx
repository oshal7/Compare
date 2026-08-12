import { useEffect, useMemo, useState } from "react";
import type { Board, CandidateOption, RegretScenario } from "../types";
import type { MatchupTelemetry } from "../lib/telemetry";
import { useBoardStore } from "../store/boards";
import { getActiveProvider } from "../ai/store";
import { sampleProvider } from "../ai/sample";
import { Matchup } from "./Matchup";
import { Done, Empty } from "./BracketGame";

/** Game 3 — Regret Minimization / Pre-Mortem. LLM-generated fine-print scenarios. */
export function RegretGame({ board, onDone }: { board: Board; onDone: () => void }) {
  const recordRegret = useBoardStore((s) => s.recordRegret);
  const setRegretScenarios = useBoardStore((s) => s.setRegretScenarios);
  const active = useMemo(() => board.candidates.filter((c) => !c.isEliminated), [board]);
  const byId = useMemo(() => new Map(board.candidates.map((c) => [c.id, c])), [board]);
  const [scenarios, setScenarios] = useState<RegretScenario[]>(board.games.regretScenarios);
  const [loading, setLoading] = useState(scenarios.length === 0);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (scenarios.length > 0 || active.length < 2) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const input = {
        category: board.category,
        candidates: active.map((c) => ({ id: c.id, title: c.title, text: c.rawText ?? "" })),
        params: board.parameters.map((p) => ({
          key: p.key,
          label: p.label,
          dataType: p.dataType,
          direction: p.direction,
          unit: p.unit,
        })),
      };
      let out: RegretScenario[] = [];
      try {
        out = await getActiveProvider().generateRegret(input);
      } catch {
        out = [];
      }
      if (out.length === 0) out = await sampleProvider.generateRegret(input);
      if (cancelled) return;
      setScenarios(out);
      setRegretScenarios(out);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (active.length < 2) return <Empty onDone={onDone} />;
  if (loading) {
    return (
      <div className="glass p-8 text-center">
        <div className="skeleton mx-auto mb-3 h-4 w-64" />
        <div className="text-sm text-cyan">Writing pre-mortem risk scenarios…</div>
      </div>
    );
  }

  const s = scenarios[idx];
  if (!s) return <Done title="Pre-mortem complete" subtitle="Regret-proofing recorded." onDone={onDone} />;

  const a = byId.get(s.optionA);
  const b = byId.get(s.optionB);
  if (!a || !b) {
    // Skip a scenario referencing an unknown option.
    setIdx((i) => i + 1);
    return null;
  }

  function choose(winner: CandidateOption, _loser: CandidateOption, _tel: MatchupTelemetry) {
    recordRegret({ scenarioId: s.id, selectedId: winner.id, candidateIds: [s.optionA, s.optionB] });
    setIdx((i) => i + 1);
  }

  return (
    <Matchup
      left={a}
      right={b}
      params={board.parameters}
      prompt={s.prompt}
      onChoose={choose}
      progress={`Pre-mortem · scenario ${idx + 1} of ${scenarios.length}`}
    />
  );
}
