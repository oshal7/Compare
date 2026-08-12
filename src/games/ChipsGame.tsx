import { useState } from "react";
import type { Board } from "../types";
import { useBoardStore } from "../store/boards";
import { sfx } from "../lib/audio";

/** Game 4 — Zero-Sum 100-Chip Allocation. Forces explicit weights w_k. */
export function ChipsGame({ board, onDone }: { board: Board; onDone: () => void }) {
  const setChips = useBoardStore((s) => s.setChips);
  const params = board.parameters.filter((p) => p.direction !== "neutral");
  const [chips, setLocal] = useState<Record<string, number>>(() => {
    const existing = board.games.chips?.chips;
    if (existing) return existing;
    const even = Math.floor(100 / params.length);
    const init: Record<string, number> = {};
    params.forEach((p, i) => (init[p.key] = even + (i === 0 ? 100 - even * params.length : 0)));
    return init;
  });

  const total = Object.values(chips).reduce((a, b) => a + b, 0);
  const remaining = 100 - total;

  function bump(key: string, delta: number) {
    setLocal((c) => {
      const next = Math.max(0, (c[key] ?? 0) + delta);
      const others = total - (c[key] ?? 0);
      if (others + next > 100) return c; // never exceed the 100-chip budget
      sfx.click();
      return { ...c, [key]: next };
    });
  }

  function even() {
    const base = Math.floor(100 / params.length);
    const init: Record<string, number> = {};
    params.forEach((p, i) => (init[p.key] = base + (i === 0 ? 100 - base * params.length : 0)));
    setLocal(init);
  }

  async function submit() {
    await setChips({ chips });
    sfx.confirm();
    onDone();
  }

  return (
    <div className="glass p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-lg font-bold text-white">Spend your 100 chips</div>
          <div className="text-sm text-muted">Put more chips on what matters most to you.</div>
        </div>
        <div className="text-right">
          <div className={`mono text-2xl font-bold ${remaining === 0 ? "text-cyan" : "text-amber"}`}>
            {remaining}
          </div>
          <div className="text-[11px] text-muted">chips left</div>
        </div>
      </div>

      <div className="space-y-2">
        {params.map((p) => {
          const val = chips[p.key] ?? 0;
          return (
            <div key={p.id} className="flex items-center gap-3">
              <div className="w-40 shrink-0 text-sm text-mist">{p.label}</div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/60">
                <div className="h-full bg-gradient-to-r from-cyan to-indigo transition-all" style={{ width: `${val}%` }} />
              </div>
              <div className="flex items-center gap-1">
                <button className="btn-ghost !px-2 !py-1" onClick={() => bump(p.key, -5)}>
                  −
                </button>
                <span className="mono w-8 text-center text-sm text-white">{val}</span>
                <button className="btn-ghost !px-2 !py-1" onClick={() => bump(p.key, +5)}>
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button className="btn-primary" disabled={remaining !== 0} onClick={submit}>
          {remaining === 0 ? "Lock in weights →" : `Allocate ${remaining} more`}
        </button>
        <button className="btn-ghost" onClick={even}>
          Even split
        </button>
        <button className="btn-ghost" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}
