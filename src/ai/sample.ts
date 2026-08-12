import type { CellValue, RegretScenario } from "../types";
import type { SeedParam } from "../schemas/seeded";
import { findSeedSchema } from "../schemas/seeded";
import type {
  CategoryGuess,
  ExtractInput,
  ExtractResult,
  ExtractionProvider,
  RegretInput,
} from "./types";

/**
 * Sample provider — needs no API key and no model download. It does genuine
 * lightweight local parsing (regex/number extraction) so pasted specs actually
 * populate the matrix, and the full four-game flow is playable out of the box.
 */

const GENERIC_SCHEMA: SeedParam[] = [
  { key: "price", label: "Price", dataType: "CURRENCY", direction: "lower_better" },
  { key: "quality", label: "Quality / Rating", dataType: "NUMBER", direction: "higher_better" },
  { key: "warranty", label: "Warranty / Guarantee", dataType: "TEXT", direction: "neutral" },
  { key: "availability", label: "Availability", dataType: "TEXT", direction: "neutral" },
];

const TRUE_WORDS = ["yes", "included", "available", "covered", "supported", "true", "✓", "with"];
const FALSE_WORDS = ["no", "not", "excluded", "unavailable", "none", "false", "✗", "without"];

function labelTokens(p: SeedParam): string[] {
  return [p.label, p.key.replace(/_/g, " ")]
    .join(" ")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function windowAround(text: string, idx: number, span = 60): string {
  return text.slice(Math.max(0, idx - 8), Math.min(text.length, idx + span)).trim();
}

function findValue(text: string, p: SeedParam): CellValue {
  const lower = text.toLowerCase();
  const tokens = labelTokens(p);
  let at = -1;
  for (const t of tokens) {
    const i = lower.indexOf(t);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  if (at < 0) return { value: null, confidence: 0.2 };

  const snippet = windowAround(text, at);
  const region = lower.slice(at, Math.min(lower.length, at + 80));

  if (p.dataType === "BOOLEAN") {
    const hasTrue = TRUE_WORDS.some((w) => region.includes(w));
    const hasFalse = FALSE_WORDS.some((w) => region.includes(w));
    if (hasFalse && !hasTrue) return { value: false, confidence: 0.7, provenance: snippet };
    if (hasTrue) return { value: true, confidence: 0.7, provenance: snippet };
    return { value: null, confidence: 0.3 };
  }

  if (p.dataType === "ENUM" && p.enumOrder) {
    const found = p.enumOrder.find((e) => region.includes(e.toLowerCase()));
    return found ? { value: found, confidence: 0.75, provenance: snippet } : { value: null, confidence: 0.3 };
  }

  if (p.dataType === "NUMBER" || p.dataType === "CURRENCY") {
    const num = region.replace(/[^0-9.,kK]/g, " ").match(/(\d[\d,]*\.?\d*)\s*(k)?/i);
    if (num) {
      let n = Number.parseFloat(num[1].replace(/,/g, ""));
      if (num[2]) n *= 1000;
      if (Number.isFinite(n)) return { value: n, confidence: 0.72, provenance: snippet };
    }
    return { value: null, confidence: 0.3 };
  }

  // TEXT: capture the phrase right after the label.
  const after = text.slice(at + tokens[0].length, at + tokens[0].length + 40).replace(/^[\s:>-]+/, "");
  const word = after.split(/[\n,;|]/)[0].trim();
  return word ? { value: word, confidence: 0.6, provenance: snippet } : { value: null, confidence: 0.3 };
}

export const sampleProvider: ExtractionProvider = {
  id: "sample",
  label: "Sample data (no setup)",
  needsKey: false,
  supportsVision: false,
  isReady: () => true,

  async detectCategory(text: string): Promise<CategoryGuess> {
    const seed = findSeedSchema(text.slice(0, 500));
    if (seed) return { category: seed.category, label: seed.label, confidence: 0.6 };
    // Scan the whole text for any alias hit.
    const lower = text.toLowerCase();
    for (const t of ["car", "insurance", "policy", "phone", "laptop"]) {
      if (lower.includes(t)) {
        const s = findSeedSchema(t);
        if (s) return { category: s.category, label: s.label, confidence: 0.5 };
      }
    }
    return { category: "general", label: "General", confidence: 0.3 };
  },

  async proposeSchema(category: string): Promise<SeedParam[]> {
    const seed = findSeedSchema(category);
    return seed ? seed.params : GENERIC_SCHEMA;
  },

  async extract(input: ExtractInput): Promise<ExtractResult> {
    const cells: Record<string, CellValue> = {};
    for (const p of input.params) cells[p.key] = findValue(input.text, p);
    return { cells };
  },

  async generateRegret(input: RegretInput): Promise<RegretScenario[]> {
    const cands = input.candidates;
    if (cands.length < 2) return [];
    const templates = [
      "💸 Money: a surprise bill lands next year. Whichever option costs you less when things go wrong — which do you keep?",
      "⏳ Time: you're busy and something breaks. The one that's faster/less hassle to deal with — which do you pick?",
      "🛡️ Risk: the worst realistic scenario happens. The option that shields you best from the downside — which wins?",
    ];
    const out: RegretScenario[] = [];
    for (let i = 0; i < Math.min(3, templates.length); i++) {
      const a = cands[i % cands.length];
      const b = cands[(i + 1) % cands.length];
      if (a.id === b.id) continue;
      out.push({ id: `rs_${i}`, prompt: templates[i], optionA: a.id, optionB: b.id });
    }
    return out;
  },
};
