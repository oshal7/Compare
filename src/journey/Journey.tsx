import type { Board, JourneyAction } from "../types";

const ICON: Record<JourneyAction, string> = {
  added: "➕",
  shortlisted: "♻",
  eliminated: "✕",
  chosen: "🏆",
  game_played: "🎮",
};

const COLOR: Record<JourneyAction, string> = {
  added: "text-mist",
  shortlisted: "text-cyan",
  eliminated: "text-rose",
  chosen: "text-cyan",
  game_played: "text-indigo",
};

/** The shareable decision audit trail (PRD §3.2 / §4.6). */
export function Journey({ board }: { board: Board }) {
  const steps = [...board.journey].sort((a, b) => a.timestamp - b.timestamp);
  return (
    <div className="glass p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-mist">Decision journey</h2>
      <ol className="relative space-y-3 border-l border-line/60 pl-5">
        {steps.map((s) => (
          <li key={s.id} className="relative">
            <span className="absolute -left-[26px] grid h-5 w-5 place-items-center rounded-full border border-line bg-surface2 text-[10px]">
              {ICON[s.action]}
            </span>
            <div className={`text-sm font-semibold ${COLOR[s.action]}`}>
              {s.candidateTitle ?? s.action}
            </div>
            {s.reason && <div className="text-xs text-muted">{s.reason}</div>}
            <div className="text-[10px] text-muted">
              {new Date(s.timestamp).toLocaleTimeString()}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
