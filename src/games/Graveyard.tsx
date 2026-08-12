import { AnimatePresence, motion } from "framer-motion";
import type { Board } from "../types";
import { useBoardStore } from "../store/boards";
import { spring } from "../lib/motion";
import { sfx } from "../lib/audio";

/** Eliminated options slide into this dock and can be restored (PRD §2.2). */
export function Graveyard({ board }: { board: Board }) {
  const restore = useBoardStore((s) => s.restore);
  const dead = board.candidates.filter((c) => c.isEliminated);
  if (dead.length === 0) return null;

  return (
    <div className="glass border-dashed p-3">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
        ⚰ Eliminated graveyard
      </div>
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {dead.map((c) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={spring}
              className="glass flex items-center gap-2 border-rose/30 px-3 py-1.5"
            >
              <div>
                <div className="text-sm font-semibold text-mist line-through">{c.title}</div>
                {c.elimReason && <div className="text-[10px] text-muted">{c.elimReason}</div>}
              </div>
              <button
                className="text-[11px] text-cyan hover:underline"
                onClick={() => {
                  sfx.click();
                  restore(c.id);
                }}
              >
                restore
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
