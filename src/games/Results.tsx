import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Board } from "../types";
import { scoreBoard } from "../scoring/consensus";
import { useBoardStore } from "../store/boards";
import { Confetti } from "../ui/Confetti";
import { spring } from "../lib/motion";
import { sfx } from "../lib/audio";

export function Results({ board }: { board: Board }) {
  const addJourney = useBoardStore((s) => s.addJourney);
  const res = useMemo(() => scoreBoard(board), [board]);
  const titleById = new Map(board.candidates.map((c) => [c.id, c.title]));
  const [revealed, setRevealed] = useState(false);
  const gp = res.gamesPlayed;
  const playedCount = [gp.bracket, gp.blind, gp.regret, gp.chips].filter(Boolean).length;

  if (res.ranked.length === 0) {
    return (
      <div className="glass p-5 text-center text-mist">
        No option currently passes every hard constraint. Loosen a constraint or restore an option.
      </div>
    );
  }

  const winner = res.ranked[0];
  const max = Math.max(...res.ranked.map((r) => r.cs), 1);
  const excluded = res.scores.filter((s) => s.omega === 0);

  return (
    <div className="glass p-5">
      <Confetti fire={revealed} />
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mist">Consensus verdict</h2>
        <span className="text-[11px] text-muted">{playedCount}/4 games played</span>
      </div>

      {!revealed ? (
        <button
          className="btn-primary w-full py-3 text-base"
          onClick={() => {
            setRevealed(true);
            sfx.win();
          }}
        >
          Reveal the winner 🎉
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          className="mb-4 rounded-xl border border-cyan/50 bg-cyan/10 p-4 text-center shadow-glow"
        >
          <div className="text-xs uppercase tracking-widest text-cyan">Your confident pick</div>
          <div className="text-2xl font-extrabold text-white">{titleById.get(winner.candidateId)}</div>
          <div className="mono mt-1 text-cyan">consensus {winner.cs.toFixed(1)} / 100</div>
          <button
            className="btn-ghost mt-3"
            onClick={() =>
              addJourney({
                action: "chosen",
                candidateId: winner.candidateId,
                candidateTitle: titleById.get(winner.candidateId),
                reason: `Chosen with the highest consensus score (${winner.cs.toFixed(1)})`,
              })
            }
          >
            ✓ Lock in this decision
          </button>
        </motion.div>
      )}

      <div className="space-y-2">
        {res.ranked.map((s, i) => {
          const brandBias = s.brandAnchoring != null && s.brandAnchoring > 25;
          return (
            <div key={s.candidateId} className="rounded-lg border border-line/60 p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="mono text-xs text-muted">#{i + 1}</span>
                  <span className="font-semibold text-white">{titleById.get(s.candidateId)}</span>
                  {brandBias && (
                    <span className="chip bg-amber/15 text-amber" title={`Brand-Anchoring Index B=${s.brandAnchoring!.toFixed(0)} (>25 ⇒ brand bias)`}>
                      brand bias
                    </span>
                  )}
                </div>
                <span className="mono text-sm font-bold text-cyan">{s.cs.toFixed(1)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/60">
                <div className="h-full bg-gradient-to-r from-cyan to-indigo" style={{ width: `${(s.cs / max) * 100}%` }} />
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-muted">
                <Sub label="bracket S1" v={s.s1} />
                <Sub label="blind S2" v={s.s2} />
                <Sub label="regret S3" v={s.s3} />
                <Sub label="chips S4" v={s.s4} />
              </div>
            </div>
          );
        })}
      </div>

      {excluded.length > 0 && (
        <div className="mt-3 text-xs text-rose">
          Excluded (failed a hard constraint):{" "}
          {excluded.map((s) => `${titleById.get(s.candidateId)} (${s.failedConstraints.join(", ")})`).join("; ")}
        </div>
      )}

      {res.hotspot && (
        <div className="mt-3 rounded-lg border border-amber/30 bg-amber/5 p-2 text-xs text-mist">
          <span className="font-semibold text-amber">Friction hotspot: </span>
          Your hardest call was{" "}
          <b>{titleById.get(res.hotspot.winnerId)}</b> vs <b>{titleById.get(res.hotspot.loserId)}</b>{" "}
          ({(res.hotspot.friction * 100).toFixed(0)}% friction — {(res.hotspot.latencyMs / 1000).toFixed(1)}s,{" "}
          {res.hotspot.switchbacks} switchbacks). That trade-off deserves a second look.
        </div>
      )}
    </div>
  );
}

function Sub({ label, v }: { label: string; v: number | null }) {
  return (
    <span>
      {label}: <span className="mono text-mist">{v == null ? "—" : v.toFixed(0)}</span>
    </span>
  );
}
