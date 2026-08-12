import type { CellValue, DataType, Direction, RegretScenario } from "../types";
import type { SeedParam } from "../schemas/seeded";
import type {
  CategoryGuess,
  ExtractInput,
  ExtractResult,
  ExtractionProvider,
  LlmBackend,
  RegretInput,
} from "./types";

/** Best-effort JSON extraction from an LLM response (handles code fences / prose). */
export function parseJson<T>(raw: string): T | null {
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.search(/[[{]/);
  if (start < 0) return null;
  // Walk to the matching bracket so trailing prose doesn't break the parse.
  const open = body[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < body.length; i++) {
    if (body[i] === open) depth++;
    else if (body[i] === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(body.slice(start, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function clampConf(n: unknown): number {
  const v = typeof n === "number" ? n : 0.6;
  return Math.max(0, Math.min(1, v));
}

const DATA_TYPES: DataType[] = ["NUMBER", "CURRENCY", "BOOLEAN", "TEXT", "ENUM"];
const DIRECTIONS: Direction[] = ["higher_better", "lower_better", "neutral"];

/** Build a full ExtractionProvider from a low-level chat backend. */
export function createLlmProvider(backend: LlmBackend): ExtractionProvider {
  async function detectCategory(text: string): Promise<CategoryGuess> {
    const system =
      "You classify what kind of thing a person is comparing. Reply with JSON only.";
    const user = `From the text below, identify the product/decision category (e.g. "used-car", "insurance", "phone", "credit-card", "apartment-rental", "job-offer", "saas-tool").
Return JSON: {"category": "<slug>", "label": "<Human Label>", "confidence": <0..1>}

TEXT:
${text.slice(0, 4000)}`;
    const out = await backend.chat({ system, user, maxTokens: 200 });
    const j = parseJson<CategoryGuess>(out);
    if (!j || !j.category) return { category: "general", label: "General", confidence: 0.3 };
    return { category: String(j.category), label: String(j.label ?? j.category), confidence: clampConf(j.confidence) };
  }

  async function proposeSchema(category: string, sampleText: string): Promise<SeedParam[]> {
    const system =
      "You are a comparison analyst. You decide which attributes matter when comparing options in a category. Reply with JSON only.";
    const user = `A person is comparing options in the category "${category}". List the 6-10 most decision-relevant parameters a careful buyer would compare.
For each parameter return: key (snake_case), label, dataType (one of NUMBER, CURRENCY, BOOLEAN, TEXT, ENUM), direction (higher_better, lower_better, or neutral), and unit (optional).
Return JSON: {"params": [{"key","label","dataType","direction","unit"}]}

Sample of one option:
${sampleText.slice(0, 2500)}`;
    const out = await backend.chat({ system, user, maxTokens: 900 });
    const j = parseJson<{ params: Partial<SeedParam>[] }>(out);
    const params = (j?.params ?? [])
      .filter((p) => p.key && p.label)
      .map((p) => normalizeSeed(p));
    return params.slice(0, 12);
  }

  async function extract(input: ExtractInput): Promise<ExtractResult> {
    const system =
      "You extract structured data from messy product/offer text. Never invent values. If a field is not present, use null. Reply with JSON only.";
    const paramList = input.params
      .map((p) => `- ${p.key} (${p.dataType}${p.unit ? ", " + p.unit : ""}): ${p.label}`)
      .join("\n");
    const user = `Extract these parameters for the option "${input.title}".
For each: value (number/string/boolean or null if unknown), confidence (0..1), and provenance (the short exact snippet you used, or "").
Also list up to 3 notable extra attributes present in the text but not in the list, as "extraParams".

PARAMETERS:
${paramList}

Return JSON:
{"cells": {"<key>": {"value": <v|null>, "confidence": <0..1>, "provenance": "<snippet>"}},
 "extraParams": [{"key","label","dataType","direction","unit"}]}

OPTION TEXT:
${input.text.slice(0, 6000)}`;
    const out = await backend.chat({
      system,
      user,
      images: backend.supportsVision ? input.images : undefined,
      maxTokens: 1400,
    });
    const j = parseJson<{ cells: Record<string, Partial<CellValue>>; extraParams?: Partial<SeedParam>[] }>(out);
    const cells: Record<string, CellValue> = {};
    for (const p of input.params) {
      const raw = j?.cells?.[p.key];
      cells[p.key] = {
        value: raw && raw.value !== undefined ? (raw.value as CellValue["value"]) : null,
        confidence: clampConf(raw?.confidence),
        provenance: typeof raw?.provenance === "string" ? raw.provenance : undefined,
      };
    }
    const extraParams = (j?.extraParams ?? [])
      .filter((p) => p.key && p.label && !input.params.some((ep) => ep.key === p.key))
      .map((p) => normalizeSeed(p))
      .slice(0, 3);
    return { cells, extraParams };
  }

  async function generateRegret(input: RegretInput): Promise<RegretScenario[]> {
    if (input.candidates.length < 2) return [];
    const system =
      "You design realistic 'pre-mortem' risk scenarios that expose fine-print trade-offs between two options. Reply with JSON only.";
    const summaries = input.candidates
      .map((c) => `${c.id} = ${c.title}: ${c.text.slice(0, 500)}`)
      .join("\n");
    const user = `Category: ${input.category}. Create 3 vivid future-regret scenarios, each pitting two of these options against each other on a concrete fine-print risk (cost exposure, exclusion, hidden condition).
Return JSON: {"scenarios": [{"prompt": "<2-3 sentence scenario ending in a choice>", "optionA": "<id>", "optionB": "<id>"}]}

OPTIONS:
${summaries}`;
    const out = await backend.chat({ system, user, maxTokens: 900 });
    const j = parseJson<{ scenarios: { prompt: string; optionA: string; optionB: string }[] }>(out);
    const ids = new Set(input.candidates.map((c) => c.id));
    return (j?.scenarios ?? [])
      .filter((s) => s.prompt && ids.has(s.optionA) && ids.has(s.optionB) && s.optionA !== s.optionB)
      .slice(0, 4)
      .map((s, i) => ({ id: `rs_${i}`, prompt: s.prompt, optionA: s.optionA, optionB: s.optionB }));
  }

  return {
    id: backend.id,
    label: backend.label,
    needsKey: backend.needsKey,
    supportsVision: backend.supportsVision,
    isReady: () => backend.isReady(),
    detectCategory,
    proposeSchema,
    extract,
    generateRegret,
  };
}

function normalizeSeed(p: Partial<SeedParam>): SeedParam {
  const dataType = DATA_TYPES.includes(p.dataType as DataType) ? (p.dataType as DataType) : "TEXT";
  const direction = DIRECTIONS.includes(p.direction as Direction)
    ? (p.direction as Direction)
    : "neutral";
  return {
    key: String(p.key).replace(/[^a-z0-9_]/gi, "_").toLowerCase(),
    label: String(p.label),
    dataType,
    direction,
    unit: p.unit ? String(p.unit) : undefined,
    enumOrder: p.enumOrder,
  };
}
