import { describe, expect, it } from "vitest";
import { buildBoard } from "./pipeline";
import { sampleProvider } from "../ai/sample";
import { SAMPLE_PHONES } from "./samples";
import { scoreBoard } from "../scoring/consensus";

// End-to-end keyless path: the sample provider parses pasted specs, the pipeline
// builds a board, and the consensus engine produces a ranked winner — no key,
// no network, no browser APIs.
describe("keyless ingestion + scoring", () => {
  it("parses the sample phones and ranks a winner", async () => {
    const inputs = SAMPLE_PHONES.map((s) => ({ title: s.title, text: s.text }));
    const board = await buildBoard(inputs, sampleProvider);

    expect(board.candidates).toHaveLength(3);
    expect(board.category).toBe("phone");

    // The regex sample provider should recover concrete numeric specs.
    const nimbus = board.candidates.find((c) => c.title === "Nimbus Ultra")!;
    expect(nimbus.cells.battery?.value).toBe(5000);
    expect(nimbus.cells.ram?.value).toBe(12);
    expect(nimbus.cells.price?.value).toBe(699);

    // Weight everything on battery → the 5000mAh phone should top the ranking.
    board.games.chips = {
      chips: Object.fromEntries(board.parameters.map((p) => [p.key, p.key === "battery" ? 100 : 0])),
    };
    const res = scoreBoard(board);
    expect(res.winner?.candidateId).toBe(nimbus.id);
  });
});
