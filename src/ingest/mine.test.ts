import { describe, expect, it } from "vitest";
import { mineSchema } from "./mine";
import { buildBoard } from "./pipeline";
import { sampleProvider } from "../ai/sample";

const JOB_A = `Senior Engineer at Acme.
Base Salary: $150,000.
Equity: 0.4%.
Remote: Yes.
PTO: 20 days.
Signing Bonus: $20,000.`;

const JOB_B = `Staff Engineer at Globex.
Base Salary: $175,000.
Equity: 0.2%.
Remote: No.
PTO: 15 days.
Signing Bonus: $10,000.`;

describe("mineSchema — contextual params from content", () => {
  it("derives the shared attributes and infers types/direction", () => {
    const params = mineSchema(`### A\n${JOB_A}\n\n### B\n${JOB_B}`);
    const keys = params.map((p) => p.key);
    expect(keys).toContain("base_salary");
    expect(keys).toContain("equity");
    expect(keys).toContain("pto");

    const salary = params.find((p) => p.key === "base_salary")!;
    expect(salary.dataType).toBe("CURRENCY");
    expect(salary.direction).toBe("higher_better");

    const remote = params.find((p) => p.key === "remote")!;
    expect(remote.dataType).toBe("BOOLEAN");
  });

  it("a non-seed board gets contextual params, not phone specs", async () => {
    const board = await buildBoard(
      [
        { title: "Acme offer", text: JOB_A },
        { title: "Globex offer", text: JOB_B },
      ],
      sampleProvider,
    );
    expect(board.category).not.toBe("phone");
    const keys = board.parameters.map((p) => p.key);
    expect(keys).toContain("base_salary");
    expect(keys).not.toContain("ram");
    expect(keys).not.toContain("battery");
  });
});
