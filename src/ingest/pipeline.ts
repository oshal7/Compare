import type { Board, BoardParameter, CandidateOption, JourneyStep } from "../types";
import type { ExtractionProvider } from "../ai/types";
import type { SeedParam } from "../schemas/seeded";
import { findSeedSchema, toBoardParameters } from "../schemas/seeded";

export interface RawInput {
  title: string;
  text: string;
  images?: string[];
  sourceUrl?: string;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function makeSlug(): string {
  return Math.random().toString(36).slice(2, 8);
}

function paramToSeed(p: BoardParameter): SeedParam {
  return {
    key: p.key,
    label: p.label,
    dataType: p.dataType,
    direction: p.direction,
    unit: p.unit,
    enumOrder: p.enumOrder,
  };
}

export type IngestStage =
  | { kind: "detect" }
  | { kind: "schema"; category: string }
  | { kind: "extract"; index: number; total: number; title: string }
  | { kind: "tier2"; count: number }
  | { kind: "done" };

/** Resolve the parameter schema for a category: seeded, else LLM-proposed. */
async function resolveTier1(
  provider: ExtractionProvider,
  category: string,
  sampleText: string,
): Promise<SeedParam[]> {
  const seed = findSeedSchema(category);
  if (seed) return seed.params;
  return provider.proposeSchema(category, sampleText);
}

/** Build a fresh board from raw inputs: detect → schema → extract → tier-2. */
export async function buildBoard(
  inputs: RawInput[],
  provider: ExtractionProvider,
  onStage?: (s: IngestStage) => void,
): Promise<Board> {
  const now = Date.now();
  const primaryText = inputs.map((i) => i.text).join("\n").slice(0, 6000);

  onStage?.({ kind: "detect" });
  const guess = await provider.detectCategory(primaryText);

  onStage?.({ kind: "schema", category: guess.label });
  const tier1Seed = await resolveTier1(provider, guess.category, inputs[0]?.text ?? "");
  const parameters = toBoardParameters(tier1Seed, 1);

  const candidates: CandidateOption[] = [];
  const extras = new Map<string, SeedParam>();

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    onStage?.({ kind: "extract", index: i, total: inputs.length, title: input.title });
    const res = await provider.extract({
      title: input.title,
      text: input.text,
      images: input.images,
      params: tier1Seed,
    });
    for (const ep of res.extraParams ?? []) {
      if (!extras.has(ep.key) && !tier1Seed.some((s) => s.key === ep.key) && extras.size < 5) {
        extras.set(ep.key, ep);
      }
    }
    candidates.push({
      id: uid("cand"),
      title: input.title,
      sourceUrl: input.sourceUrl,
      rawText: input.text.slice(0, 4000),
      cells: res.cells,
      isEliminated: false,
      createdAt: now + i,
    });
  }

  // Tier-2: page-found parameters become new rows, extracted across competitors.
  if (extras.size > 0) {
    const tier2Seed = [...extras.values()];
    onStage?.({ kind: "tier2", count: tier2Seed.length });
    parameters.push(...toBoardParameters(tier2Seed, 2));
    for (let i = 0; i < inputs.length; i++) {
      const res2 = await provider.extract({
        title: inputs[i].title,
        text: inputs[i].text,
        images: inputs[i].images,
        params: tier2Seed,
      });
      Object.assign(candidates[i].cells, res2.cells);
    }
  }

  const journey: JourneyStep[] = candidates.map((c) => ({
    id: uid("j"),
    action: "added",
    candidateId: c.id,
    candidateTitle: c.title,
    reason: "Added to the board",
    timestamp: c.createdAt,
  }));

  onStage?.({ kind: "done" });

  return {
    id: uid("board"),
    slug: makeSlug(),
    title: `${guess.label} comparison`,
    category: guess.category,
    categoryConfidence: guess.confidence,
    candidates,
    parameters,
    games: { bracket: [], blind: [], regret: [], regretScenarios: [] },
    journey,
    createdAt: now,
    updatedAt: now,
  };
}

/** Extract one more candidate onto an existing board, reusing its schema. */
export async function extractCandidate(
  board: Board,
  input: RawInput,
  provider: ExtractionProvider,
): Promise<CandidateOption> {
  const seed = board.parameters.map(paramToSeed);
  const res = await provider.extract({
    title: input.title,
    text: input.text,
    images: input.images,
    params: seed,
  });
  return {
    id: uid("cand"),
    title: input.title,
    sourceUrl: input.sourceUrl,
    rawText: input.text.slice(0, 4000),
    cells: res.cells,
    isEliminated: false,
    createdAt: Date.now(),
  };
}
