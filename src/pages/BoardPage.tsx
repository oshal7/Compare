import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useBoardStore } from "../store/boards";
import { Matrix } from "../matrix/Matrix";
import { Results } from "../games/Results";
import { Leanings } from "../games/Leanings";
import { Graveyard } from "../games/Graveyard";
import { Journey } from "../journey/Journey";
import { buildShareUrl, decodeBoard, exportBoardJson } from "../lib/share";

export function BoardPage() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const board = useBoardStore((s) => s.board);
  const loadBySlug = useBoardStore((s) => s.loadBySlug);
  const setBoard = useBoardStore((s) => s.setBoard);
  const [status, setStatus] = useState<"loading" | "ok" | "missing">("loading");
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const d = params.get("d");
      if (d) {
        const decoded = decodeBoard(d);
        if (decoded) {
          await setBoard(decoded);
          if (!cancelled) setStatus("ok");
          return;
        }
      }
      const found = await loadBySlug(slug);
      if (cancelled) return;
      setStatus(found ? "ok" : "missing");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="space-y-3">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

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

  async function share() {
    try {
      await navigator.clipboard.writeText(buildShareUrl(board!));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">{board.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted">
            <span className="chip bg-indigo/15 text-indigo">{board.category}</span>
            <span>{board.candidates.length} products</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={share}>
            {copied ? "✓ Link copied" : "🔗 Share"}
          </button>
          <button className="btn-ghost" onClick={() => exportBoardJson(board)}>
            ⬇ Export
          </button>
          <Link to="/" className="btn-ghost">
            + New
          </Link>
          <Link to={`/c/${board.slug}/play`} className="btn-primary">
            🎮 Play the arena
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Results board={board} />
          {/* Parameter matrix demoted behind a disclosure — available, never the hero. */}
          <div className="glass overflow-hidden">
            <button
              className="flex w-full items-center justify-between p-3 text-left"
              onClick={() => setShowDetails((v) => !v)}
            >
              <span className="text-sm font-bold uppercase tracking-wide text-mist">
                See the details — why they rank this way
              </span>
              <span className="text-muted">{showDetails ? "▲" : "▼"}</span>
            </button>
            {showDetails && (
              <div className="border-t border-line/50">
                <Matrix board={board} />
              </div>
            )}
          </div>
          <Graveyard board={board} />
        </div>
        <div className="space-y-4">
          <Leanings board={board} />
          <Journey board={board} />
        </div>
      </div>
    </div>
  );
}
