import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EngineId, ExtractionProvider } from "./types";
import { sampleProvider } from "./sample";
import { createLlmProvider } from "./llm";
import { createClaudeBackend, DEFAULT_CLAUDE_MODEL } from "./claude";
import { webllmBackend } from "./webllm";

interface EngineState {
  engine: EngineId;
  claudeKey: string;
  claudeModel: string;
  setEngine: (e: EngineId) => void;
  setClaudeKey: (k: string) => void;
  setClaudeModel: (m: string) => void;
}

export const useEngineStore = create<EngineState>()(
  persist(
    (set) => ({
      engine: "sample",
      claudeKey: "",
      claudeModel: DEFAULT_CLAUDE_MODEL,
      setEngine: (engine) => set({ engine }),
      setClaudeKey: (claudeKey) => set({ claudeKey }),
      setClaudeModel: (claudeModel) => set({ claudeModel }),
    }),
    { name: "decisionlens.engine" },
  ),
);

// Claude backend reads the latest key/model from the store on every call.
const claudeProvider = createLlmProvider(
  createClaudeBackend(() => {
    const s = useEngineStore.getState();
    return { apiKey: s.claudeKey, model: s.claudeModel };
  }),
);

const webllmProvider = createLlmProvider(webllmBackend);

/** The extraction provider matching the current engine selection. */
export function getActiveProvider(): ExtractionProvider {
  const engine = useEngineStore.getState().engine;
  if (engine === "claude") return claudeProvider;
  if (engine === "webllm") return webllmProvider;
  return sampleProvider;
}

/** True when the selected engine can actually run right now. */
export function activeEngineReady(): boolean {
  return getActiveProvider().isReady();
}
