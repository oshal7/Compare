import type { DataType, Direction } from "../types";
import type { SeedParam } from "../schemas/seeded";

// Content-driven schema miner. When no seeded category applies (the "compare
// anything" case), we derive the parameters from the products themselves —
// parsing "Label: value" pairs that recur across the options — so the matrix is
// contextual to what's actually on the board instead of a fixed phone schema.

const LOWER_BETTER = /price|cost|fee|premium|deductible|rent|mileage|km|kilomet|distance|wait|deposit|emi|downpayment|age|latency|delay/;
const HIGHER_BETTER = /salary|coverage|cover|rating|score|bonus|battery|warrant|ram|storage|camera|display|screen|benefit|pto|vacation|range|capacity|resolution|speed|mah|reward|cashback|equity|discount/;
const CURRENCY_WORD = /price|cost|fee|premium|salary|rent|deposit|bonus|deductible|coverage|budget|emi|payment|value|worth|cashback/;

const UNIT_RE = /\b(gb|tb|mb|mah|mp|%|percent|km|mi|miles|kmpl|mpg|months?|month|yrs?|years?|days?|hrs?|hours?|in|inch|inches|kg|g|ghz|mhz|w|watts?|wh|kwh|cc|bhp|hp|nm)\b/i;
const BOOL_VALUES = /^(yes|no|true|false|included|excluded|available|unavailable|supported|n\/a|✓|✗|with|without)$/i;
const CURRENCY_SYM = /[$₹€£¥]/;

function keyFromLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function splitLines(text: string): string[] {
  return text
    .split(/[\n\r]+/)
    .flatMap((l) => l.split(/\.\s+(?=[A-Z(])/)) // sentence breaks, but not decimals
    .map((l) => l.trim())
    .filter(Boolean);
}

const LABEL_VALUE = /^([A-Za-z][A-Za-z0-9 /&+()'’.-]{1,38}?)\s*(?::|=|\s[–-]\s)\s*(.+?)[.\s]*$/;

interface Acc {
  label: string;
  count: number;
  values: string[];
}

function inferType(values: string[]): { dataType: DataType; unit?: string } {
  const joined = values.join(" ");
  if (values.every((v) => BOOL_VALUES.test(v.trim()))) return { dataType: "BOOLEAN" };
  if (CURRENCY_SYM.test(joined)) return { dataType: "CURRENCY" };
  const unitMatch = joined.match(UNIT_RE);
  const numeric = values.filter((v) => /\d/.test(v.replace(/[^0-9.,]/g, "")));
  if (numeric.length >= Math.max(1, Math.ceil(values.length / 2))) {
    let unit = unitMatch?.[1];
    if (unit) unit = unit === "percent" ? "%" : unit;
    return { dataType: "NUMBER", unit };
  }
  return { dataType: "TEXT" };
}

function inferDirection(key: string, dataType: DataType): Direction {
  if (dataType === "TEXT" || dataType === "ENUM") return "neutral";
  if (LOWER_BETTER.test(key)) return "lower_better";
  if (HIGHER_BETTER.test(key)) return "higher_better";
  if (dataType === "CURRENCY") return CURRENCY_WORD.test(key) && HIGHER_BETTER.test(key) ? "higher_better" : "lower_better";
  return "neutral";
}

/**
 * Mine 6–10 decision-relevant parameters straight from the options' text.
 * `sampleText` is the concatenation of every option (see pipeline buildBoard).
 */
export function mineSchema(sampleText: string): SeedParam[] {
  const acc = new Map<string, Acc>();
  for (const line of splitLines(sampleText)) {
    const m = line.match(LABEL_VALUE);
    if (!m) continue;
    const label = m[1].replace(/\s+/g, " ").trim();
    const value = m[2].trim();
    if (!label || !value || value.length > 60) continue;
    const key = keyFromLabel(label);
    if (!key || key.length < 2) continue;
    const cur = acc.get(key) ?? { label, count: 0, values: [] };
    cur.count += 1;
    cur.values.push(value);
    acc.set(key, cur);
  }

  const entries = [...acc.entries()];
  // Prefer attributes shared across options (count >= 2); relax if too few.
  let kept = entries.filter(([, a]) => a.count >= 2);
  if (kept.length < 4) kept = entries.filter(([, a]) => a.count >= 1);

  kept.sort((a, b) => b[1].count - a[1].count);

  return kept.slice(0, 10).map(([key, a]) => {
    const { dataType, unit } = inferType(a.values);
    return {
      key,
      label: a.label.replace(/\b\w/g, (c) => c.toUpperCase()),
      dataType,
      direction: inferDirection(key, dataType),
      unit,
    } satisfies SeedParam;
  });
}
