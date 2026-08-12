import type { BoardParameter, CandidateOption } from "../types";

/**
 * Normalize every candidate's value for a parameter onto a 0..100 "goodness"
 * scale, oriented by the parameter's direction. This is what makes options from
 * different sources directly comparable (PRD §4.1 normalization → §6 scoring).
 *
 * Unknown values (null) are treated as neutral (50) rather than zero, so missing
 * data never unfairly rewards or punishes an option (PRD §4.1: "Unknown" not zero).
 */
const NEUTRAL = 50;

export type NormalizedGrid = Record<string, Record<string, number>>; // candidateId → key → 0..100

function numericValue(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9.-]/g, "");
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function orient(score: number, direction: BoardParameter["direction"]): number {
  return direction === "lower_better" ? 100 - score : score;
}

export function normalizeParameter(
  param: BoardParameter,
  candidates: CandidateOption[],
): Record<string, number> {
  const out: Record<string, number> = {};

  if (param.dataType === "BOOLEAN") {
    for (const c of candidates) {
      const raw = c.cells[param.key]?.value;
      out[c.id] = raw == null ? NEUTRAL : orient(raw ? 100 : 0, param.direction);
    }
    return out;
  }

  if (param.dataType === "ENUM" && param.enumOrder && param.enumOrder.length > 1) {
    const order = param.enumOrder.map((s) => s.toLowerCase());
    const span = order.length - 1;
    for (const c of candidates) {
      const raw = c.cells[param.key]?.value;
      if (raw == null || typeof raw !== "string") {
        out[c.id] = NEUTRAL;
        continue;
      }
      const idx = order.indexOf(raw.toLowerCase());
      out[c.id] = idx < 0 ? NEUTRAL : orient((idx / span) * 100, param.direction);
    }
    return out;
  }

  if (param.dataType === "TEXT" || param.direction === "neutral") {
    // Non-orderable text or a parameter with no better/worse direction: neutral.
    for (const c of candidates) out[c.id] = NEUTRAL;
    return out;
  }

  // NUMBER / CURRENCY: min–max normalize across candidates that have a value.
  const nums: { id: string; n: number }[] = [];
  for (const c of candidates) {
    const n = numericValue(c.cells[param.key]?.value ?? null);
    if (n != null) nums.push({ id: c.id, n });
  }
  if (nums.length === 0) {
    for (const c of candidates) out[c.id] = NEUTRAL;
    return out;
  }
  const min = Math.min(...nums.map((x) => x.n));
  const max = Math.max(...nums.map((x) => x.n));
  const range = max - min;
  const known = new Set(nums.map((x) => x.id));
  for (const c of candidates) {
    if (!known.has(c.id)) {
      out[c.id] = NEUTRAL;
      continue;
    }
    const n = numericValue(c.cells[param.key]?.value ?? null)!;
    const raw = range === 0 ? 100 : ((n - min) / range) * 100;
    out[c.id] = orient(raw, param.direction);
  }
  return out;
}

export function normalizeAll(
  params: BoardParameter[],
  candidates: CandidateOption[],
): NormalizedGrid {
  const grid: NormalizedGrid = {};
  for (const c of candidates) grid[c.id] = {};
  for (const p of params) {
    const col = normalizeParameter(p, candidates);
    for (const c of candidates) grid[c.id][p.key] = col[c.id];
  }
  return grid;
}

/** Numeric parsing helper reused by the hard-constraint evaluator. */
export function coerceNumber(v: unknown): number | null {
  return numericValue(v);
}
