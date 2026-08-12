import type { Board } from "../types";
import { computeConsensus } from "./consensus";
import { confidence, frictionIndex, median } from "./friction";
import { coerceNumber } from "./normalize";

/**
 * "Your leanings" — reads the person from how they played the games, not just
 * which product won. This is the "understand what the user is inclined toward"
 * piece: what they value, whether brand sways them, risk vs value, decisiveness.
 */
export interface Leaning {
  key: string;
  icon: string;
  title: string;
  detail: string;
}

export interface Profile {
  rounds: number;
  signal: "faint" | "building" | "strong";
  leanings: Leaning[];
}

export function deriveProfile(board: Board): Profile {
  const { games, parameters, candidates } = board;
  const rounds =
    games.bracket.length + games.blind.length + games.regret.length + (games.chips ? 1 : 0);
  const signal = rounds >= 8 ? "strong" : rounds >= 3 ? "building" : "faint";
  const leanings: Leaning[] = [];
  const titleById = new Map(candidates.map((c) => [c.id, c.title]));

  // 1) What you value most — from the chip allocation.
  if (games.chips) {
    const top = Object.entries(games.chips.chips)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k]) => parameters.find((p) => p.key === k)?.label)
      .filter(Boolean);
    if (top.length) {
      leanings.push({
        key: "values",
        icon: "🎯",
        title: "What you value most",
        detail: `You spent the most chips on ${top.join(" and ")}.`,
      });
    }
  }

  // 2) Brand vs spec — bracket (branded) vs blind (anonymized).
  const res = computeConsensus(candidates, parameters, games);
  if (res.gamesPlayed.bracket && res.gamesPlayed.blind) {
    const biggest = res.scores
      .filter((s) => s.brandAnchoring != null)
      .sort((a, b) => (b.brandAnchoring ?? 0) - (a.brandAnchoring ?? 0))[0];
    if (biggest && (biggest.brandAnchoring ?? 0) > 25) {
      leanings.push({
        key: "brand",
        icon: "🏷️",
        title: "Brand sways you",
        detail: `${titleById.get(biggest.candidateId)} won more when you could see the name than when specs were blind.`,
      });
    } else {
      leanings.push({
        key: "spec",
        icon: "🔬",
        title: "You're spec-driven",
        detail: "Hiding the brands barely changed your picks — you judge on the numbers.",
      });
    }
  }

  // 3) Risk vs value — from regret pre-mortem choices vs the price parameter.
  const priceParam = parameters.find((p) => p.dataType === "CURRENCY" && p.direction === "lower_better");
  if (priceParam && games.regret.length >= 2) {
    let safety = 0;
    let value = 0;
    for (const v of games.regret) {
      const [a, b] = v.candidateIds;
      const other = v.selectedId === a ? b : a;
      const sel = coerceNumber(candidates.find((c) => c.id === v.selectedId)?.cells[priceParam.key]?.value ?? null);
      const oth = coerceNumber(candidates.find((c) => c.id === other)?.cells[priceParam.key]?.value ?? null);
      if (sel == null || oth == null || sel === oth) continue;
      if (sel > oth) safety++;
      else value++;
    }
    if (safety > value) {
      leanings.push({
        key: "risk",
        icon: "🛡️",
        title: "You protect the downside",
        detail: "In the what-if scenarios you paid more to avoid the risk.",
      });
    } else if (value > safety) {
      leanings.push({
        key: "value",
        icon: "💸",
        title: "You chase value",
        detail: "In the what-if scenarios you took the cheaper option and accepted the risk.",
      });
    }
  }

  // 4) Decisiveness — from bracket hesitation telemetry.
  if (games.bracket.length >= 2) {
    const tMedian = median(games.bracket.map((c) => c.latencyMs));
    const avgF = games.bracket.reduce((s, c) => s + frictionIndex(c, tMedian), 0) / games.bracket.length;
    const avgC = games.bracket.reduce((s, c) => s + confidence(c, tMedian), 0) / games.bracket.length;
    if (avgF > 0.6) {
      leanings.push({
        key: "close",
        icon: "⚖️",
        title: "These are close calls for you",
        detail: "Lots of hesitation and switchbacks — worth another round to be sure.",
      });
    } else if (avgC > 0.65) {
      leanings.push({
        key: "decisive",
        icon: "⚡",
        title: "You decide fast and sure",
        detail: "Quick, low-hesitation picks — your gut is clear here.",
      });
    }
  }

  return { rounds, signal, leanings };
}
