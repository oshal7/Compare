import type { BoardParameter, DataType, Direction } from "../types";

// Seeded (Tier-1) category schemas — the industry-standard parameters DecisionLens
// projects automatically once it detects a domain (PRD §4, Tier 1). The LLM adds
// Tier-2 (page-found) and Tier-3 (user-defined) parameters on top of these.

export interface SeedParam {
  key: string;
  label: string;
  dataType: DataType;
  direction: Direction;
  unit?: string;
  enumOrder?: string[];
}

export interface SeedSchema {
  category: string;
  label: string;
  aliases: string[]; // detector hints
  params: SeedParam[];
}

export const SEED_SCHEMAS: SeedSchema[] = [
  {
    category: "used-car",
    label: "Used Car",
    aliases: ["car", "used car", "vehicle", "automobile", "sedan", "suv", "pre-owned"],
    params: [
      { key: "price", label: "Price", dataType: "CURRENCY", direction: "lower_better" },
      { key: "year", label: "Year", dataType: "NUMBER", direction: "higher_better" },
      { key: "km_driven", label: "Kilometers Driven", dataType: "NUMBER", direction: "lower_better", unit: "km" },
      { key: "owners", label: "Number of Owners", dataType: "NUMBER", direction: "lower_better" },
      {
        key: "condition",
        label: "Condition",
        dataType: "ENUM",
        direction: "higher_better",
        enumOrder: ["Poor", "Fair", "Good", "Very Good", "Excellent"],
      },
      { key: "service_history", label: "Service History", dataType: "BOOLEAN", direction: "higher_better" },
      { key: "accident_history", label: "Accident History", dataType: "BOOLEAN", direction: "lower_better" },
      { key: "fuel_type", label: "Fuel Type", dataType: "TEXT", direction: "neutral" },
      { key: "transmission", label: "Transmission", dataType: "TEXT", direction: "neutral" },
    ],
  },
  {
    category: "insurance",
    label: "Insurance",
    aliases: ["insurance", "policy", "premium", "health cover", "mediclaim", "coverage plan"],
    params: [
      { key: "premium", label: "Premium", dataType: "CURRENCY", direction: "lower_better" },
      { key: "coverage", label: "Coverage Amount", dataType: "CURRENCY", direction: "higher_better" },
      { key: "deductible", label: "Deductible", dataType: "CURRENCY", direction: "lower_better" },
      { key: "no_claim_bonus_pct", label: "No Claim Bonus", dataType: "NUMBER", direction: "higher_better", unit: "%" },
      { key: "claim_settlement_ratio", label: "Claim Settlement Ratio", dataType: "NUMBER", direction: "higher_better", unit: "%" },
      { key: "network_size", label: "Network Hospitals", dataType: "NUMBER", direction: "higher_better" },
      { key: "waiting_period", label: "Waiting Period", dataType: "NUMBER", direction: "lower_better", unit: "months" },
      { key: "room_rent_cap", label: "Room Rent Capping", dataType: "BOOLEAN", direction: "lower_better" },
      { key: "zero_depreciation", label: "Zero Depreciation", dataType: "BOOLEAN", direction: "higher_better" },
    ],
  },
  {
    category: "phone",
    label: "Phone / Electronics",
    aliases: ["phone", "smartphone", "mobile", "iphone", "android", "laptop", "electronics"],
    params: [
      { key: "price", label: "Price", dataType: "CURRENCY", direction: "lower_better" },
      { key: "chip", label: "Chipset", dataType: "TEXT", direction: "neutral" },
      { key: "ram", label: "RAM", dataType: "NUMBER", direction: "higher_better", unit: "GB" },
      { key: "storage", label: "Storage", dataType: "NUMBER", direction: "higher_better", unit: "GB" },
      { key: "battery", label: "Battery", dataType: "NUMBER", direction: "higher_better", unit: "mAh" },
      { key: "display", label: "Display Size", dataType: "NUMBER", direction: "higher_better", unit: "in" },
      { key: "camera", label: "Main Camera", dataType: "NUMBER", direction: "higher_better", unit: "MP" },
      { key: "warranty", label: "Warranty", dataType: "NUMBER", direction: "higher_better", unit: "months" },
      { key: "os_support", label: "OS Support Window", dataType: "NUMBER", direction: "higher_better", unit: "years" },
    ],
  },
];

let seq = 0;
export function toBoardParameters(params: SeedParam[], tier: 1 | 2 | 3 = 1): BoardParameter[] {
  return params.map((p) => ({
    id: `param_${Date.now().toString(36)}_${seq++}`,
    key: p.key,
    label: p.label,
    tier,
    dataType: p.dataType,
    unit: p.unit,
    direction: p.direction,
    enumOrder: p.enumOrder,
    weight: 1 / params.length,
    isHardConstraint: false,
  }));
}

export function findSeedSchema(category: string): SeedSchema | undefined {
  const c = category.toLowerCase().trim();
  return SEED_SCHEMAS.find(
    (s) => s.category === c || s.aliases.some((a) => c.includes(a) || a.includes(c)),
  );
}
