import { Link } from "react-router-dom";
import { EngineSettings } from "./EngineSettings";

export function NavBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-base/70 backdrop-blur-glass">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan to-indigo font-bold text-base shadow-glow">
            DL
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">
            Decision<span className="text-cyan">Lens</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <a
            className="hidden text-xs text-muted hover:text-mist sm:block"
            href="https://github.com/oshal7/compare"
            target="_blank"
            rel="noreferrer"
          >
            github
          </a>
          <EngineSettings />
        </div>
      </div>
    </header>
  );
}
