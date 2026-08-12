// Core domain model for DecisionLens. Shared across ingestion, matrix, games,
// scoring, and persistence. Kept dependency-free so it can be imported anywhere.

export type ParamTier = 1 | 2 | 3; // 1 = baseline, 2 = page-found, 3 = user-defined
export type DataType = "NUMBER" | "CURRENCY" | "BOOLEAN" | "TEXT" | "ENUM";
export type Direction = "higher_better" | "lower_better" | "neutral";

export type ConstraintOperator =
  | "LESS_THAN"
  | "LESS_OR_EQUAL"
  | "GREATER_THAN"
  | "GREATER_OR_EQUAL"
  | "EQUALS"
  | "IS_TRUE";

export interface ConstraintRule {
  operator: ConstraintOperator;
  value: number | string | boolean;
}

export interface BoardParameter {
  id: string;
  key: string; // canonical machine key, e.g. "no_claim_bonus_pct"
  label: string; // human label, e.g. "No Claim Bonus"
  tier: ParamTier;
  dataType: DataType;
  unit?: string;
  direction: Direction;
  weight: number; // default 1.0; refined by the 100-chip game
  isHardConstraint: boolean;
  constraintRule?: ConstraintRule;
  /** Ordered enum values, best-last, used to rank ENUM params. */
  enumOrder?: string[];
}

/** A single extracted value, with the confidence and provenance the PRD requires. */
export interface CellValue {
  value: number | string | boolean | null; // null == "Unknown"
  confidence: number; // 0..1
  provenance?: string; // the source snippet the LLM pulled this from
}

export interface CandidateOption {
  id: string;
  title: string;
  brand?: string;
  sourceUrl?: string;
  rawText?: string;
  /** keyed by BoardParameter.key */
  cells: Record<string, CellValue>;
  isEliminated: boolean;
  elimReason?: string;
  createdAt: number;
}

export type GameType = "BRACKET" | "BLIND" | "REGRET" | "CHIPS";

/** One 1v1 decision with the behavioral telemetry the friction model needs. */
export interface PairwiseChoice {
  winnerId: string;
  loserId: string;
  latencyMs: number;
  hovers: number;
  switchbacks: number;
  blind?: boolean; // true when brands/prices were hidden (Game 2)
}

export interface RegretVote {
  scenarioId: string;
  selectedId: string;
  candidateIds: string[]; // options presented in the scenario
}

export interface RegretScenario {
  id: string;
  prompt: string;
  optionA: string; // candidate id
  optionB: string; // candidate id
}

export interface ChipAllocation {
  /** keyed by BoardParameter.key → chips out of 100 */
  chips: Record<string, number>;
}

export interface GameState {
  bracket: PairwiseChoice[];
  blind: PairwiseChoice[];
  regret: RegretVote[];
  chips?: ChipAllocation;
  regretScenarios: RegretScenario[];
}

export type JourneyAction =
  | "added"
  | "shortlisted"
  | "eliminated"
  | "chosen"
  | "game_played";

export interface JourneyStep {
  id: string;
  action: JourneyAction;
  candidateId?: string;
  candidateTitle?: string;
  reason?: string;
  timestamp: number;
}

export interface Board {
  id: string;
  slug: string;
  title: string;
  category: string;
  categoryConfidence: number; // 0..1, how sure the detector was
  candidates: CandidateOption[];
  parameters: BoardParameter[];
  games: GameState;
  journey: JourneyStep[];
  createdAt: number;
  updatedAt: number;
}
