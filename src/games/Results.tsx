import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Board } from "../types";
import { scoreBoard } from "../scoring/consensus";
import { useBoardStore } from "../store/boards";
import { Confetti } from "../ui/Confetti";
import { Thumb } from "../ui/Thumb";
import { spring } from "../lib/motion";
import { sfx } from "../lib/audio";

/** The Scoreboard — who's winning across the games + the parameters. */
export function Results({ board }: { board: Board }) {
  const addJourney = useBoardStore((s) => s.addJourney);
  const res = useMemo(() => scoreBoard(board), [board]);
  const byId = new Map(board.candidates.map((c) => [c.id, c]));
  const [revealed, setRevealed] = useState(false);
  const gp = res.gamesPlayed;
  const rounds =
    board.games.bracket.length + board.games.blind.length + board.games.regret.length + (gp.chips ? 1 : 0);

  if (rounds === 0) {
    return (
      <div className="glass p-6 text-center">
        <div className="text-lg font-bold text-white">The scoreboard is empty</div>
        <p className="mx-auto mt-1 max-w-md text-sm text-mist">
          Play a few quick rounds in the arena and watch your products climb. The more you play, the more
          confident the winner — and the more we learn what you lean toward.
        </p>
        <Link to={`/c/${board.slug}/play`} className="btn-primary mt-4 inline-flex">
          Enter the arena →
        </Link>
      </div>
    );
  }

  if (res.ranked.length === 0) {
    return (
      <div className="glass p-5 text-center text-mist">
        No product currently passes every hard constraint. Loosen one, or restore an option.
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
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-mist">Scoreboard</h2>
          <p className="text-xs text-muted">Who's winning across your games + the parameters</p>
        </div>
        <Link to={`/c/${board.slug}/play`} className="btn-ghost text-xs">
          🎮 {rounds} rounds · play more
        </Link>
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
          className="mb-4 flex items-center gap-4 rounded-xl border border-cyan/50 bg-cyan/10 p-4 shadow-glow"
        >
          <Thumb candidate={byId.get(winner.candidateId)} size={64} />
          <div>
            <div className="text-xs uppercase tracking-widest text-cyan">Your confident pick</div>
            <div className="text-2xl font-extrabold text-white">{byId.get(winner.candidateId)?.title}</div>
            <div className="mono text-cyan">score {winner.cs.toFixed(1)} / 100</div>
          </div>
          <button
            className="btn-ghost ml-auto"
            onClick={() =>
              addJourney({
                action: "chosen",
                candidateId: winner.candidateId,
                candidateTitle: byId.get(winner.candidateId)?.title,
                reason: `Chosen with the highest score (${winner.cs.toFixed(1)})`,
              })
            }
          >
            ✓ Lock it in
          </button>
        </motion.div>
      )}

      <div className="space-y-2">
        {res.ranked.map((s, i) => {
          const brandBias = s.brandAnchoring != null && s.brandAnchoring > 25;
          return (
            <div key={s.candidateId} className="flex items-center gap-3 rounded-lg border border-line/60 p-2">
              <span className="mono w-5 text-center text-xs text-muted">#{i + 1}</span>
              <Thumb candidate={byId.get(s.candidateId)} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-white">{byId.get(s.candidateId)?.title}</span>
                  {brandBias && <span className="chip bg-amber/15 text-amber">brand bias</span>}
                  <span className="mono ml-auto text-sm font-bold text-cyan">{s.cs.toFixed(1)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/60">
                  <div className="h-full bg-gradient-to-r from-cyan to-indigo" style={{ width: `${(s.cs / max) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {excluded.length > 0 && (
        <div className="mt-3 text-xs text-rose">
          Ruled out (failed a must-have):{" "}
          {excluded.map((s) => `${byId.get(s.candidateId)?.title} (${s.failedConstraints.join(", ")})`).join("; ")}
        </div>
      )}

      {res.hotspot && (
        <div className="mt-3 rounded-lg border border-amber/30 bg-amber/5 p-2 text-xs text-mist">
          <span className="font-semibold text-amber">Toughest call: </span>
          <b>{byId.get(res.hotspot.winnerId)?.title}</b> vs <b>{byId.get(res.hotspot.loserId)?.title}</b> — you
          hesitated the most here ({(res.hotspot.latencyMs / 1000).toFixed(1)}s, {res.hotspot.switchbacks} switchbacks).
        </div>
      )}
    </div>
  );
}
