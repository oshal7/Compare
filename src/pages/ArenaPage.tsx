import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useBoardStore } from "../store/boards";
import { GamesHub } from "../games/GamesHub";
import { Leanings } from "../games/Leanings";
import { Thumb } from "../ui/Thumb";
import { scoreBoard } from "../scoring/consensus";
import type { Board } from "../types";

export function ArenaPage() {
  const { slug = "" } = useParams();
  const board = useBoardStore((s) => s.board);
  const loadBySlug = useBoardStore((s) => s.loadBySlug);
  const [status, setStatus] = useState<"loading" | "ok" | "missing">(
    board?.slug === slug ? "ok" : "loading",
  );

  useEffect(() => {
    if (board?.slug === slug) {
      setStatus("ok");
      return;
    }
    let cancelled = false;
    (async () => {
      const found = await loadBySlug(slug);
      if (!cancelled) setStatus(found ? "ok" : "missing");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (status === "loading") return <div className="skeleton h-64 w-full" />;
  if (status === "missing" || !board) {
    return (
      <div className="glass p-8 text-center">
        <p className="text-mist">That showdown isn't in this browser.</p>
        <Link to="/" className="btn-primary mt-4 inline-flex">
          Start a new one
        </Link>
      </div>
    );
  }

  const rounds =
    board.games.bracket.length + board.games.blind.length + board.games.regret.length + (board.games.chips ? 1 : 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/c/${board.slug}`} className="btn-ghost">
            ← Scoreboard
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-white">The arena</h1>
            <div className="text-xs text-muted">{board.title} · {rounds} rounds played</div>
          </div>
        </div>
        <Link to={`/c/${board.slug}`} className="btn-primary">
          Done → see who's winning
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <GamesHub board={board} />
        </div>
        <div className="space-y-4">
          <MiniScoreboard board={board} />
          <Leanings board={board} />
        </div>
      </div>
    </div>
  );
}

/** Compact live ranking that shifts as the user plays more rounds. */
function MiniScoreboard({ board }: { board: Board }) {
  const res = useMemo(() => scoreBoard(board), [board]);
  const byId = new Map(board.candidates.map((c) => [c.id, c]));
  const max = Math.max(...res.ranked.map((r) => r.cs), 1);
  return (
    <div className="glass p-3">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-mist">Live scoreboard</div>
      {res.ranked.length === 0 ? (
        <p className="text-xs text-muted">Play a round to see it move.</p>
      ) : (
        <div className="space-y-2">
          {res.ranked.map((s, i) => (
            <div key={s.candidateId} className="flex items-center gap-2">
              <span className="mono w-4 text-center text-[11px] text-muted">{i + 1}</span>
              <Thumb candidate={byId.get(s.candidateId)} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-mist">{byId.get(s.candidateId)?.title}</span>
                  <span className="mono text-[11px] text-cyan">{s.cs.toFixed(0)}</span>
                </div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-ink/60">
                  <div className="h-full bg-gradient-to-r from-cyan to-indigo" style={{ width: `${(s.cs / max) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
