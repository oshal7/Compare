import type {
  Board,
  BoardParameter,
  CandidateOption,
  ChipAllocation,
  ConstraintRule,
  GameState,
  PairwiseChoice,
  RegretVote,
} from "../types";
import { coerceNumber, normalizeAll } from "./normalize";
import { confidence, frictionHotspot, median, type FrictionHotspot } from "./friction";

/**
 * The DecisionLens Consensus Engine (PRD §6).
 * Synthesizes the four games' sub-scores plus behavioral friction into a single
 * Consensus Score CS(c_i) ∈ [0,100], with bias diagnostics.
 */

export interface CandidateScore {
  candidateId: string;
  s1: number | null; // bracket outranking
  s2: number | null; // blind utility
  s3: number | null; // regret protection
  s4: number | null; // zero-sum WSM (chips)
  sRaw: number; // fused raw score over available games
  omega: number; // 0 or 1 — hard-constraint multiplier
  cs: number; // Ω · sRaw
  brandAnchoring: number | null; // B_i = S1 − S2 (>+25 ⇒ brand bias)
  failedConstraints: string[]; // parameter labels a hard constraint failed on
}

export interface ConsensusResult {
  scores: CandidateScore[];
  ranked: CandidateScore[]; // active (non-eliminated, Ω=1) candidates, best first
  winner: CandidateScore | null;
  hotspot: FrictionHotspot | null;
  gamesPlayed: { bracket: boolean; blind: boolean; regret: boolean; chips: boolean };
}

// PRD §6.1 Step 3 fusion weights.
const FUSION = { s1: 0.3, s2: 0.25, s3: 0.25, s4: 0.2 } as const;

function weightsFromChips(params: BoardParameter[], chips?: ChipAllocation): Record<string, number> {
  const w: Record<string, number> = {};
  if (chips && Object.keys(chips.chips).length > 0) {
    for (const p of params) w[p.key] = (chips.chips[p.key] ?? 0) / 100;
    return w;
  }
  // No chip game yet: fall back to declared parameter weights, normalized to sum 1.
  const total = params.reduce((s, p) => s + (p.weight || 0), 0) || 1;
  for (const p of params) w[p.key] = (p.weight || 0) / total;
  return w;
}

/** S4 — Zero-Sum Weighted Sum Model. */
function scoreS4(
  params: BoardParameter[],
  candidates: CandidateOption[],
  grid: Record<string, Record<string, number>>,
  chips?: ChipAllocation,
): Record<string, number> {
  const w = weightsFromChips(params, chips);
  const out: Record<string, number> = {};
  for (const c of candidates) {
    let s = 0;
    for (const p of params) s += (w[p.key] ?? 0) * (grid[c.id][p.key] ?? 50);
    out[c.id] = s;
  }
  return out;
}

/** S1 — Bracket Tournament outranking, weighted by decision confidence C_ij. */
function scoreOutranking(
  candidates: CandidateOption[],
  choices: PairwiseChoice[],
): Record<string, number> | null {
  if (choices.length === 0) return null;
  const tMedian = median(choices.map((c) => c.latencyMs));
  const wins: Record<string, number> = {};
  const matches: Record<string, number> = {};
  for (const c of candidates) {
    wins[c.id] = 0;
    matches[c.id] = 0;
  }
  for (const ch of choices) {
    const cij = confidence(ch, tMedian);
    wins[ch.winnerId] = (wins[ch.winnerId] ?? 0) + 1 * (1 + cij);
    matches[ch.winnerId] = (matches[ch.winnerId] ?? 0) + 1;
    matches[ch.loserId] = (matches[ch.loserId] ?? 0) + 1;
  }
  const out: Record<string, number> = {};
  for (const c of candidates) {
    out[c.id] = matches[c.id] > 0 ? (wins[c.id] / matches[c.id]) * 50 : 0;
  }
  return out;
}

/** S2 — Blind win rate ×100. */
function scoreBlind(
  candidates: CandidateOption[],
  choices: PairwiseChoice[],
): Record<string, number> | null {
  if (choices.length === 0) return null;
  const wins: Record<string, number> = {};
  const pairings: Record<string, number> = {};
  for (const c of candidates) {
    wins[c.id] = 0;
    pairings[c.id] = 0;
  }
  for (const ch of choices) {
    wins[ch.winnerId] = (wins[ch.winnerId] ?? 0) + 1;
    pairings[ch.winnerId] = (pairings[ch.winnerId] ?? 0) + 1;
    pairings[ch.loserId] = (pairings[ch.loserId] ?? 0) + 1;
  }
  const out: Record<string, number> = {};
  for (const c of candidates) {
    out[c.id] = pairings[c.id] > 0 ? (wins[c.id] / pairings[c.id]) * 100 : 0;
  }
  return out;
}

/** S3 — Regret protection: fraction of scenarios in which the option was chosen. */
function scoreRegret(
  candidates: CandidateOption[],
  votes: RegretVote[],
): Record<string, number> | null {
  if (votes.length === 0) return null;
  const chosen: Record<string, number> = {};
  const shown: Record<string, number> = {};
  for (const c of candidates) {
    chosen[c.id] = 0;
    shown[c.id] = 0;
  }
  for (const v of votes) {
    for (const id of v.candidateIds) shown[id] = (shown[id] ?? 0) + 1;
    chosen[v.selectedId] = (chosen[v.selectedId] ?? 0) + 1;
  }
  const out: Record<string, number> = {};
  for (const c of candidates) {
    out[c.id] = shown[c.id] > 0 ? (chosen[c.id] / shown[c.id]) * 100 : 0;
  }
  return out;
}

function passesConstraint(rule: ConstraintRule, raw: unknown): boolean {
  if (raw == null) return true; // Unknown never fails a hard constraint outright.
  switch (rule.operator) {
    case "IS_TRUE":
      return raw === true;
    case "EQUALS":
      return String(raw).toLowerCase() === String(rule.value).toLowerCase();
    default: {
      const n = coerceNumber(raw);
      const t = coerceNumber(rule.value);
      if (n == null || t == null) return true;
      if (rule.operator === "LESS_THAN") return n < t;
      if (rule.operator === "LESS_OR_EQUAL") return n <= t;
      if (rule.operator === "GREATER_THAN") return n > t;
      if (rule.operator === "GREATER_OR_EQUAL") return n >= t;
      return true;
    }
  }
}

function evalHardConstraints(
  params: BoardParameter[],
  candidate: CandidateOption,
): { omega: number; failed: string[] } {
  const failed: string[] = [];
  for (const p of params) {
    if (!p.isHardConstraint || !p.constraintRule) continue;
    if (!passesConstraint(p.constraintRule, candidate.cells[p.key]?.value ?? null)) {
      failed.push(p.label);
    }
  }
  return { omega: failed.length === 0 ? 1 : 0, failed };
}

export function computeConsensus(
  candidates: CandidateOption[],
  params: BoardParameter[],
  games: GameState,
): ConsensusResult {
  const grid = normalizeAll(params, candidates);

  const s1 = scoreOutranking(candidates, games.bracket);
  const s2 = scoreBlind(candidates, games.blind);
  const s3 = scoreRegret(candidates, games.regret);
  const s4map = scoreS4(params, candidates, grid, games.chips);
  const hasChips = !!games.chips && Object.keys(games.chips.chips).length > 0;

  const scores: CandidateScore[] = candidates.map((c) => {
    const parts: { w: number; v: number }[] = [];
    if (s1) parts.push({ w: FUSION.s1, v: s1[c.id] });
    if (s2) parts.push({ w: FUSION.s2, v: s2[c.id] });
    if (s3) parts.push({ w: FUSION.s3, v: s3[c.id] });
    // S4 always contributes (weights fall back to declared param weights).
    parts.push({ w: FUSION.s4, v: s4map[c.id] });

    // Renormalize weights across the games that actually have data, so partial
    // play still yields a meaningful score.
    const wsum = parts.reduce((s, p) => s + p.w, 0) || 1;
    const sRaw = parts.reduce((s, p) => s + (p.w / wsum) * p.v, 0);

    const { omega, failed } = evalHardConstraints(params, c);
    const b = s1 && s2 ? s1[c.id] - s2[c.id] : null;

    return {
      candidateId: c.id,
      s1: s1 ? s1[c.id] : null,
      s2: s2 ? s2[c.id] : null,
      s3: s3 ? s3[c.id] : null,
      s4: s4map[c.id],
      sRaw,
      omega,
      cs: omega * sRaw,
      brandAnchoring: b,
      failedConstraints: failed,
    };
  });

  const byId = new Map(candidates.map((c) => [c.id, c]));
  const ranked = scores
    .filter((s) => s.omega === 1 && !byId.get(s.candidateId)?.isEliminated)
    .sort((a, b) => b.cs - a.cs);

  return {
    scores,
    ranked,
    winner: ranked[0] ?? null,
    hotspot: frictionHotspot(games.bracket),
    gamesPlayed: {
      bracket: !!s1,
      blind: !!s2,
      regret: !!s3,
      chips: hasChips,
    },
  };
}

/** Convenience wrapper that scores a whole board. */
export function scoreBoard(board: Board): ConsensusResult {
  return computeConsensus(board.candidates, board.parameters, board.games);
}
