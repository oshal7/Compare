import { describe, expect, it } from "vitest";
import type { BoardParameter, CandidateOption, GameState } from "../types";
import { computeConsensus } from "./consensus";
import { confidence, frictionIndex, median } from "./friction";
import { normalizeParameter } from "./normalize";

function cell(value: number | string | boolean | null, confidence = 0.95) {
  return { value, confidence };
}

const priceParam: BoardParameter = {
  id: "p1",
  key: "price",
  label: "Price",
  tier: 1,
  dataType: "CURRENCY",
  direction: "lower_better",
  weight: 0.5,
  isHardConstraint: false,
};

const batteryParam: BoardParameter = {
  id: "p2",
  key: "battery",
  label: "Battery",
  tier: 1,
  dataType: "NUMBER",
  direction: "higher_better",
  weight: 0.5,
  isHardConstraint: false,
};

function candidate(id: string, price: number, battery: number | null): CandidateOption {
  return {
    id,
    title: id,
    cells: { price: cell(price), battery: cell(battery) },
    isEliminated: false,
    createdAt: 0,
  };
}

const emptyGames: GameState = { bracket: [], blind: [], regret: [], regretScenarios: [] };

describe("normalize", () => {
  it("orients lower_better so the cheapest scores 100", () => {
    const cands = [candidate("a", 100, 10), candidate("b", 300, 10)];
    const col = normalizeParameter(priceParam, cands);
    expect(col.a).toBe(100);
    expect(col.b).toBe(0);
  });

  it("orients higher_better so the largest scores 100", () => {
    const cands = [candidate("a", 100, 10), candidate("b", 100, 30)];
    const col = normalizeParameter(batteryParam, cands);
    expect(col.a).toBe(0);
    expect(col.b).toBe(100);
  });

  it("treats Unknown as neutral (50), not zero", () => {
    const cands = [candidate("a", 100, 10), candidate("b", 100, null)];
    const col = normalizeParameter(batteryParam, cands);
    expect(col.b).toBe(50);
  });
});

describe("friction", () => {
  it("confidence is high for a fast, decisive choice and low for a slow, hesitant one", () => {
    const choices = [
      { winnerId: "a", loserId: "b", latencyMs: 800, hovers: 0, switchbacks: 0 },
      { winnerId: "a", loserId: "b", latencyMs: 8000, hovers: 6, switchbacks: 4 },
    ];
    const tm = median(choices.map((c) => c.latencyMs));
    expect(confidence(choices[0], tm)).toBeGreaterThan(confidence(choices[1], tm));
    expect(frictionIndex(choices[1], tm)).toBeGreaterThan(0.5);
  });
});

describe("computeConsensus — S4 (chips WSM)", () => {
  it("weights the matrix by chip allocation", () => {
    const cands = [candidate("a", 100, 10), candidate("b", 300, 30)];
    const games: GameState = {
      ...emptyGames,
      chips: { chips: { price: 100, battery: 0 } }, // all weight on price
    };
    const res = computeConsensus(cands, [priceParam, batteryParam], games);
    const a = res.scores.find((s) => s.candidateId === "a")!;
    const b = res.scores.find((s) => s.candidateId === "b")!;
    // All weight on price (lower better) → cheaper "a" wins decisively.
    expect(a.s4).toBe(100);
    expect(b.s4).toBe(0);
    expect(a.cs).toBeGreaterThan(b.cs);
    expect(res.winner?.candidateId).toBe("a");
  });
});

describe("computeConsensus — S1 (bracket outranking)", () => {
  it("rewards the option that wins its matchups", () => {
    const cands = [candidate("a", 100, 10), candidate("b", 100, 10)];
    const games: GameState = {
      ...emptyGames,
      bracket: [
        { winnerId: "a", loserId: "b", latencyMs: 1000, hovers: 0, switchbacks: 0 },
        { winnerId: "a", loserId: "b", latencyMs: 1000, hovers: 0, switchbacks: 0 },
      ],
    };
    const res = computeConsensus(cands, [priceParam, batteryParam], games);
    const a = res.scores.find((s) => s.candidateId === "a")!;
    const b = res.scores.find((s) => s.candidateId === "b")!;
    expect(a.s1!).toBeGreaterThan(b.s1!);
    expect(b.s1).toBe(0);
  });
});

describe("computeConsensus — Ω hard constraint", () => {
  it("zeros CS and excludes a candidate that fails a hard constraint", () => {
    const capped: BoardParameter = {
      ...priceParam,
      isHardConstraint: true,
      constraintRule: { operator: "LESS_THAN", value: 200 },
    };
    const cands = [candidate("a", 100, 10), candidate("b", 300, 10)];
    const res = computeConsensus(cands, [capped, batteryParam], {
      ...emptyGames,
      chips: { chips: { price: 50, battery: 50 } },
    });
    const b = res.scores.find((s) => s.candidateId === "b")!;
    expect(b.omega).toBe(0);
    expect(b.cs).toBe(0);
    expect(b.failedConstraints).toContain("Price");
    expect(res.ranked.find((s) => s.candidateId === "b")).toBeUndefined();
  });
});

describe("computeConsensus — Brand Anchoring Index", () => {
  it("B_i = S1 − S2 and flags visual/brand bias when > +25", () => {
    const cands = [candidate("a", 100, 10), candidate("b", 100, 10)];
    const games: GameState = {
      ...emptyGames,
      // Wins openly (branded) but loses blind → strong brand anchoring.
      bracket: [
        { winnerId: "a", loserId: "b", latencyMs: 1000, hovers: 0, switchbacks: 0 },
        { winnerId: "a", loserId: "b", latencyMs: 1000, hovers: 0, switchbacks: 0 },
      ],
      blind: [
        { winnerId: "b", loserId: "a", latencyMs: 1000, hovers: 0, switchbacks: 0, blind: true },
        { winnerId: "b", loserId: "a", latencyMs: 1000, hovers: 0, switchbacks: 0, blind: true },
      ],
    };
    const res = computeConsensus(cands, [priceParam, batteryParam], games);
    const a = res.scores.find((s) => s.candidateId === "a")!;
    expect(a.brandAnchoring).not.toBeNull();
    expect(a.brandAnchoring!).toBeGreaterThan(25);
  });
});

describe("computeConsensus — partial play", () => {
  it("renormalizes fusion weights when only some games are played", () => {
    const cands = [candidate("a", 100, 10), candidate("b", 300, 30)];
    const res = computeConsensus(cands, [priceParam, batteryParam], {
      ...emptyGames,
      chips: { chips: { price: 100, battery: 0 } },
    });
    // Only chips played → sRaw equals S4 exactly (weight renormalized to 1).
    const a = res.scores.find((s) => s.candidateId === "a")!;
    expect(a.sRaw).toBeCloseTo(a.s4!, 6);
  });
});
