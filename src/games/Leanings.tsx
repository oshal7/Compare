import { useMemo } from "react";
import type { Board } from "../types";
import { deriveProfile } from "../scoring/profile";

const SIGNAL: Record<string, { label: string; pct: number; color: string }> = {
  faint: { label: "faint", pct: 25, color: "bg-amber" },
  building: { label: "building", pct: 60, color: "bg-indigo" },
  strong: { label: "strong", pct: 100, color: "bg-cyan" },
};

/** A read on the person, derived from how they played (not which product won). */
export function Leanings({ board }: { board: Board }) {
  const profile = useMemo(() => deriveProfile(board), [board]);
  const sig = SIGNAL[profile.signal];

  return (
    <div className="glass p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mist">Your leanings</h2>
        <span className="text-[11px] text-muted">signal: {sig.label}</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-ink/60">
        <div className={`h-full ${sig.color} transition-all`} style={{ width: `${sig.pct}%` }} />
      </div>

      {profile.leanings.length === 0 ? (
        <p className="text-xs text-muted">
          Play a couple of rounds in the arena and we'll start reading what you lean toward — what you
          value, whether brand sways you, and how you weigh risk vs price.
        </p>
      ) : (
        <ul className="space-y-2">
          {profile.leanings.map((l) => (
            <li key={l.key} className="flex items-start gap-2">
              <span className="text-lg leading-none">{l.icon}</span>
              <div>
                <div className="text-sm font-semibold text-white">{l.title}</div>
                <div className="text-xs text-muted">{l.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
