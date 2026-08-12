import type { PairwiseChoice } from "../types";

/**
 * Behavioral Friction Index (PRD §6.1 Step 2).
 *
 *   F_ij = 1 / (1 + e^-(α·ln(T_ij / T_median) + β·H_ij + γ·S_ij))
 *   C_ij = 1 − F_ij   (decision confidence)
 *
 * where T_ij is decision latency, T_median the platform median, H_ij hover count,
 * and S_ij switchback count. High friction → low confidence in that pairwise choice.
 */
export const FRICTION_COEFF = { alpha: 0.6, beta: 0.15, gamma: 0.4 } as const;

export function median(values: number[]): number {
  if (values.length === 0) return 1;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export function frictionIndex(choice: PairwiseChoice, tMedian: number): number {
  const { alpha, beta, gamma } = FRICTION_COEFF;
  const t = Math.max(1, choice.latencyMs);
  const tm = Math.max(1, tMedian);
  const z = alpha * Math.log(t / tm) + beta * choice.hovers + gamma * choice.switchbacks;
  return sigmoid(z);
}

export function confidence(choice: PairwiseChoice, tMedian: number): number {
  return 1 - frictionIndex(choice, tMedian);
}

/** The pair whose choice caused the most cognitive hesitation (PRD §6.2). */
export interface FrictionHotspot {
  winnerId: string;
  loserId: string;
  friction: number;
  latencyMs: number;
  hovers: number;
  switchbacks: number;
}

export function frictionHotspot(choices: PairwiseChoice[]): FrictionHotspot | null {
  if (choices.length === 0) return null;
  const tMedian = median(choices.map((c) => c.latencyMs));
  let best: FrictionHotspot | null = null;
  for (const c of choices) {
    const f = frictionIndex(c, tMedian);
    if (!best || f > best.friction) {
      best = {
        winnerId: c.winnerId,
        loserId: c.loserId,
        friction: f,
        latencyMs: c.latencyMs,
        hovers: c.hovers,
        switchbacks: c.switchbacks,
      };
    }
  }
  return best;
}
