import type { BoardParameter, CellValue } from "../types";

export function formatValue(param: BoardParameter, cell: CellValue | undefined): string {
  if (!cell || cell.value == null) return "Unknown";
  const v = cell.value;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") {
    const num = param.dataType === "CURRENCY" ? `$${v.toLocaleString()}` : v.toLocaleString();
    return param.unit && param.dataType !== "CURRENCY" ? `${num} ${param.unit}` : num;
  }
  return String(v);
}

/** Parameters most useful to show on a compact card: identifying + high-variance. */
export function topParameters(params: BoardParameter[], limit = 5): BoardParameter[] {
  const priced = params.filter((p) => p.dataType === "CURRENCY");
  const rest = params.filter((p) => p.dataType !== "CURRENCY" && p.direction !== "neutral");
  return [...priced, ...rest].slice(0, limit);
}
