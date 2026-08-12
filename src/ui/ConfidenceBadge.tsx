import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { popIn } from "../lib/motion";

/**
 * Confidence badge + source-snippet popover (PRD §4.1). Sub-80% confidence glows
 * amber; clicking reveals the exact snippet the value was pulled from.
 */
export function ConfidenceBadge({
  confidence,
  provenance,
}: {
  confidence: number;
  provenance?: string;
}) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(confidence * 100);
  const low = confidence < 0.8;
  const color = low ? "text-amber" : "text-cyan";
  const ring = low ? "ring-amber/40" : "ring-cyan/30";

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`chip mono ring-1 ${ring} ${color} ${low ? "animate-floaty" : ""}`}
        title="Show where this value came from"
      >
        {low ? "⚠" : "✓"} {pct}%
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            {...popIn}
            className="glass absolute left-0 top-6 z-30 w-64 p-3 text-xs text-mist shadow-glow"
          >
            <div className="mb-1 font-semibold text-white">
              Confidence {pct}%{low ? " · low" : ""}
            </div>
            <div className="text-muted">
              {provenance ? (
                <>
                  <span className="text-muted">Source snippet:</span>
                  <div className="mt-1 rounded-md bg-ink/60 p-2 font-mono text-[11px] text-cyan">
                    “{provenance}”
                  </div>
                </>
              ) : (
                "No source snippet was captured for this value."
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
