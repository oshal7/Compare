import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useBoardStore } from "../store/boards";
import { Matrix } from "../matrix/Matrix";
import { GamesHub } from "../games/GamesHub";
import { Results } from "../games/Results";
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const d = params.get("d");
      if (d) {
        const decoded = decodeBoard(d);
        if (decoded) {
          await setBoard(decoded); // import a shared board into this browser
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
        <p className="text-mist">That comparison isn't in this browser.</p>
        <Link to="/" className="btn-primary mt-4 inline-flex">
          Start a new comparison
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

  const confPct = Math.round(board.categoryConfidence * 100);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">{board.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted">
            <span className="chip bg-indigo/15 text-indigo">{board.category}</span>
            <span>category confidence {confPct}%</span>
            <span>· {board.candidates.length} options</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={share}>
            {copied ? "✓ Link copied" : "🔗 Share"}
          </button>
          <button className="btn-ghost" onClick={() => exportBoardJson(board)}>
            ⬇ Export
          </button>
          <Link to="/" className="btn-primary">
            + New
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Matrix board={board} />
          <GamesHub board={board} />
          <Results board={board} />
          <Graveyard board={board} />
        </div>
        <div className="space-y-4">
          <Journey board={board} />
        </div>
      </div>
    </div>
  );
}
