import { describe, expect, it } from "vitest";
import { buildBoard } from "../ingest/pipeline";
import { sampleProvider } from "../ai/sample";
import { SAMPLE_PHONES } from "../ingest/samples";
import { deriveProfile } from "./profile";

describe("deriveProfile — your leanings", () => {
  it("reads what the user values, risk stance, and counts rounds", async () => {
    const board = await buildBoard(
      SAMPLE_PHONES.map((s) => ({ title: s.title, text: s.text })),
      sampleProvider,
    );
    const id = (title: string) => board.candidates.find((c) => c.title === title)!.id;

    // The user weights price + battery, and in the what-if scenarios keeps
    // picking the pricier phone (paying to avoid the downside).
    board.games.chips = {
      chips: Object.fromEntries(
        board.parameters.map((p) => [p.key, p.key === "price" ? 60 : p.key === "battery" ? 40 : 0]),
      ),
    };
    board.games.regret = [
      { scenarioId: "r1", selectedId: id("Aurora X1 Pro"), candidateIds: [id("Aurora X1 Pro"), id("Volt Neo")] },
      { scenarioId: "r2", selectedId: id("Nimbus Ultra"), candidateIds: [id("Nimbus Ultra"), id("Volt Neo")] },
    ];

    const profile = deriveProfile(board);
    expect(profile.rounds).toBe(3); // chips + 2 regret votes
    const keys = profile.leanings.map((l) => l.key);
    expect(keys).toContain("values"); // chips → what you value
    expect(keys).toContain("risk"); // pricier picks → protect the downside
  });
});
