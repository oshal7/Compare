import type { CellValue, RegretScenario } from "../types";
import type { SeedParam } from "../schemas/seeded";

export type EngineId = "sample" | "webllm" | "claude";

export interface CategoryGuess {
  category: string; // canonical slug or free label
  label: string; // display label
  confidence: number; // 0..1
}

export interface ExtractInput {
  title: string;
  text: string;
  images?: string[]; // data URLs (used by vision-capable providers only)
  params: SeedParam[];
}

export interface ExtractResult {
  cells: Record<string, CellValue>;
  /** Notable attributes the source mentioned that weren't in the schema (Tier 2). */
  extraParams?: SeedParam[];
}

export interface RegretInput {
  category: string;
  candidates: { id: string; title: string; text: string }[];
  params: SeedParam[];
}

export interface ExtractionProvider {
  id: EngineId;
  label: string;
  needsKey: boolean;
  supportsVision: boolean;
  isReady(): boolean;
  detectCategory(text: string): Promise<CategoryGuess>;
  proposeSchema(category: string, sampleText: string): Promise<SeedParam[]>;
  extract(input: ExtractInput): Promise<ExtractResult>;
  generateRegret(input: RegretInput): Promise<RegretScenario[]>;
}

/** A minimal chat primitive; Claude and WebLLM both implement it. */
export interface LlmBackend {
  id: EngineId;
  label: string;
  needsKey: boolean;
  supportsVision: boolean;
  isReady(): boolean;
  chat(opts: {
    system: string;
    user: string;
    images?: string[];
    maxTokens?: number;
  }): Promise<string>;
}
