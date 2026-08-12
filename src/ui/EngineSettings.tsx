import { useReducer, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useEngineStore } from "../ai/store";
import { DEFAULT_CLAUDE_MODEL } from "../ai/claude";
import { WebLLMBackend, webllmBackend } from "../ai/webllm";
import type { EngineId } from "../ai/types";
import { setSoundEnabled, soundEnabled } from "../lib/audio";
import { fadeUp } from "../lib/motion";

const OPTIONS: { id: EngineId; title: string; blurb: string }[] = [
  { id: "sample", title: "Sample data", blurb: "No setup. Parses pasted specs locally so every game is playable instantly." },
  { id: "webllm", title: "In-browser AI (no key)", blurb: "Runs a small model fully in your browser via WebGPU. ~1GB one-time download." },
  { id: "claude", title: "Claude (your key)", blurb: "Highest quality + screenshot vision. Your key is stored only in this browser." },
];

export function EngineSettings() {
  const [open, setOpen] = useState(false);
  const { engine, claudeKey, claudeModel, setEngine, setClaudeKey, setClaudeModel } = useEngineStore();
  const [, force] = useReducer((x) => x + 1, 0);
  const [sound, setSound] = useState(soundEnabled());

  const activeLabel = OPTIONS.find((o) => o.id === engine)?.title ?? "Engine";

  async function loadWebllm() {
    try {
      await webllmBackend.load(() => force());
    } catch {
      force();
    }
  }

  return (
    <>
      <button className="btn-ghost" onClick={() => setOpen(true)}>
        <span className="h-2 w-2 rounded-full bg-cyan shadow-glow" /> {activeLabel}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex items-start justify-center bg-ink/70 p-4 pt-20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              {...fadeUp}
              onClick={(e) => e.stopPropagation()}
              className="glass w-full max-w-lg p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">AI engine</h2>
                <button className="btn-ghost" onClick={() => setOpen(false)}>
                  Done
                </button>
              </div>

              <div className="space-y-2">
                {OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setEngine(o.id)}
                    className={`glass-hover glass w-full p-3 text-left ${
                      engine === o.id ? "!border-cyan/70 shadow-glow" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-3 w-3 rounded-full border ${
                          engine === o.id ? "border-cyan bg-cyan" : "border-line"
                        }`}
                      />
                      <span className="font-semibold text-white">{o.title}</span>
                    </div>
                    <p className="mt-1 pl-5 text-xs text-muted">{o.blurb}</p>
                  </button>
                ))}
              </div>

              {engine === "claude" && (
                <div className="mt-4 space-y-2">
                  <label className="block text-xs font-semibold text-mist">Anthropic API key</label>
                  <input
                    type="password"
                    value={claudeKey}
                    onChange={(e) => setClaudeKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full rounded-lg border border-line bg-ink/60 px-3 py-2 font-mono text-sm text-white outline-none focus:border-cyan"
                  />
                  <label className="block text-xs font-semibold text-mist">Model</label>
                  <input
                    value={claudeModel}
                    onChange={(e) => setClaudeModel(e.target.value)}
                    placeholder={DEFAULT_CLAUDE_MODEL}
                    className="w-full rounded-lg border border-line bg-ink/60 px-3 py-2 font-mono text-sm text-white outline-none focus:border-cyan"
                  />
                  <p className="text-xs text-muted">
                    Your key never leaves this browser (stored in localStorage) and calls Anthropic directly.
                  </p>
                </div>
              )}

              {engine === "webllm" && (
                <div className="mt-4 space-y-2">
                  {!WebLLMBackend.webgpuAvailable() ? (
                    <p className="rounded-lg border border-amber/40 bg-amber/10 p-2 text-xs text-amber">
                      WebGPU isn't available in this browser. Try Chrome/Edge, or use Sample / Claude.
                    </p>
                  ) : webllmBackend.status === "ready" ? (
                    <p className="text-xs text-cyan">✓ In-browser model loaded and ready.</p>
                  ) : (
                    <>
                      <button className="btn-primary" onClick={loadWebllm} disabled={webllmBackend.status === "loading"}>
                        {webllmBackend.status === "loading" ? "Loading…" : "Load in-browser model (~1GB)"}
                      </button>
                      {webllmBackend.status === "loading" && (
                        <div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-ink/60">
                            <div
                              className="h-full bg-cyan transition-all"
                              style={{ width: `${Math.round(webllmBackend.progress * 100)}%` }}
                            />
                          </div>
                          <p className="mt-1 truncate text-[11px] text-muted">{webllmBackend.progressText}</p>
                        </div>
                      )}
                      {webllmBackend.status === "error" && (
                        <p className="text-xs text-rose">{webllmBackend.error}</p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <span className="text-xs text-mist">Tactile sound effects</span>
                <button
                  className={`chip ring-1 ${sound ? "text-cyan ring-cyan/40" : "text-muted ring-line"}`}
                  onClick={() => {
                    const next = !sound;
                    setSound(next);
                    setSoundEnabled(next);
                  }}
                >
                  {sound ? "ON" : "OFF"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
