import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Board, GameType } from "../types";
import { BracketGame } from "./BracketGame";
import { BlindGame } from "./BlindGame";
import { RegretGame } from "./RegretGame";
import { ChipsGame } from "./ChipsGame";
import { fadeUp } from "../lib/motion";

const GAMES: { id: GameType; title: string; blurb: string; icon: string }[] = [
  { id: "CHIPS", title: "100-Chip Allocation", blurb: "Set what matters most — your weights.", icon: "🎯" },
  { id: "BRACKET", title: "Bracket Tournament", blurb: "1v1 knockout. We track your hesitation.", icon: "🏆" },
  { id: "BLIND", title: "Blind Trade-off", blurb: "Brands hidden — specs only. Exposes bias.", icon: "🕶️" },
  { id: "REGRET", title: "Regret Pre-Mortem", blurb: "Fine-print risk scenarios from the future.", icon: "⚠️" },
];

function playCount(board: Board, g: GameType): number {
  if (g === "CHIPS") return board.games.chips ? 1 : 0;
  if (g === "BRACKET") return board.games.bracket.length;
  if (g === "BLIND") return board.games.blind.length;
  return board.games.regret.length;
}

export function GamesHub({ board }: { board: Board }) {
  const [active, setActive] = useState<GameType | null>(null);

  return (
    <div className="glass p-4">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-mist">The arena</h2>
      <p className="mb-3 text-xs text-muted">
        Play any game, as many times as you like. Every round sharpens the scoreboard and teaches us what
        you lean toward. Replay the close ones.
      </p>
      <AnimatePresence mode="wait">
        {active ? (
          <motion.div key={active} {...fadeUp}>
            {active === "BRACKET" && <BracketGame board={board} onDone={() => setActive(null)} />}
            {active === "BLIND" && <BlindGame board={board} onDone={() => setActive(null)} />}
            {active === "REGRET" && <RegretGame board={board} onDone={() => setActive(null)} />}
            {active === "CHIPS" && <ChipsGame board={board} onDone={() => setActive(null)} />}
          </motion.div>
        ) : (
          <motion.div key="hub" {...fadeUp} className="grid gap-3 sm:grid-cols-2">
            {GAMES.map((g) => (
              <button
                key={g.id}
                onClick={() => setActive(g.id)}
                className="glass glass-hover flex items-start gap-3 p-3 text-left"
              >
                <span className="text-2xl">{g.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{g.title}</span>
                    {playCount(board, g.id) > 0 && (
                      <span className="chip bg-cyan/15 text-cyan">
                        {g.id === "CHIPS" ? "✓ set" : `${playCount(board, g.id)}× played`}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted">{g.blurb}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
