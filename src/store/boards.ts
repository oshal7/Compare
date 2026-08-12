import { create } from "zustand";
import type {
  Board,
  BoardParameter,
  CandidateOption,
  ChipAllocation,
  JourneyStep,
  PairwiseChoice,
  RegretScenario,
  RegretVote,
} from "../types";
import { getBoard, getBoardBySlug, saveBoard } from "./db";
import { uid } from "../ingest/pipeline";

interface BoardStore {
  board: Board | null;
  loading: boolean;
  setBoard: (b: Board) => Promise<void>;
  loadById: (id: string) => Promise<Board | null>;
  loadBySlug: (slug: string) => Promise<Board | null>;
  /** Apply a mutation to a cloned draft, persist, and re-render. */
  update: (fn: (draft: Board) => void) => Promise<void>;

  addJourney: (step: Omit<JourneyStep, "id" | "timestamp">) => Promise<void>;
  eliminate: (candidateId: string, reason: string) => Promise<void>;
  restore: (candidateId: string) => Promise<void>;
  addCandidate: (c: CandidateOption) => Promise<void>;
  updateCell: (candidateId: string, key: string, value: CandidateOption["cells"][string]["value"]) => Promise<void>;
  addParameter: (p: BoardParameter) => Promise<void>;
  toggleHardConstraint: (paramId: string) => Promise<void>;

  recordBracket: (choice: PairwiseChoice) => Promise<void>;
  recordBlind: (choice: PairwiseChoice) => Promise<void>;
  recordRegret: (vote: RegretVote) => Promise<void>;
  setRegretScenarios: (s: RegretScenario[]) => Promise<void>;
  setChips: (chips: ChipAllocation) => Promise<void>;
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  board: null,
  loading: false,

  async setBoard(b) {
    await saveBoard(b);
    set({ board: b });
  },

  async loadById(id) {
    set({ loading: true });
    const b = (await getBoard(id)) ?? null;
    set({ board: b, loading: false });
    return b;
  },

  async loadBySlug(slug) {
    set({ loading: true });
    const b = (await getBoardBySlug(slug)) ?? null;
    set({ board: b, loading: false });
    return b;
  },

  async update(fn) {
    const cur = get().board;
    if (!cur) return;
    const draft: Board = structuredClone(cur);
    fn(draft);
    draft.updatedAt = Date.now();
    await saveBoard(draft);
    set({ board: draft });
  },

  async addJourney(step) {
    await get().update((d) => {
      d.journey.push({ ...step, id: uid("j"), timestamp: Date.now() });
    });
  },

  async eliminate(candidateId, reason) {
    await get().update((d) => {
      const c = d.candidates.find((x) => x.id === candidateId);
      if (c) {
        c.isEliminated = true;
        c.elimReason = reason;
        d.journey.push({
          id: uid("j"),
          action: "eliminated",
          candidateId,
          candidateTitle: c.title,
          reason,
          timestamp: Date.now(),
        });
      }
    });
  },

  async restore(candidateId) {
    await get().update((d) => {
      const c = d.candidates.find((x) => x.id === candidateId);
      if (c) {
        c.isEliminated = false;
        c.elimReason = undefined;
        d.journey.push({
          id: uid("j"),
          action: "shortlisted",
          candidateId,
          candidateTitle: c.title,
          reason: "Restored from the graveyard",
          timestamp: Date.now(),
        });
      }
    });
  },

  async addCandidate(c) {
    await get().update((d) => {
      d.candidates.push(c);
      d.journey.push({
        id: uid("j"),
        action: "added",
        candidateId: c.id,
        candidateTitle: c.title,
        reason: "Added to the board",
        timestamp: Date.now(),
      });
    });
  },

  async updateCell(candidateId, key, value) {
    await get().update((d) => {
      const c = d.candidates.find((x) => x.id === candidateId);
      if (!c) return;
      const cell = c.cells[key] ?? { value: null, confidence: 1 };
      c.cells[key] = { ...cell, value, confidence: 1, provenance: "Edited by you" };
    });
  },

  async addParameter(p) {
    await get().update((d) => {
      d.parameters.push(p);
    });
  },

  async toggleHardConstraint(paramId) {
    await get().update((d) => {
      const p = d.parameters.find((x) => x.id === paramId);
      if (p) p.isHardConstraint = !p.isHardConstraint;
    });
  },

  async recordBracket(choice) {
    await get().update((d) => {
      d.games.bracket.push(choice);
    });
  },

  async recordBlind(choice) {
    await get().update((d) => {
      d.games.blind.push({ ...choice, blind: true });
    });
  },

  async recordRegret(vote) {
    await get().update((d) => {
      d.games.regret.push(vote);
    });
  },

  async setRegretScenarios(s) {
    await get().update((d) => {
      d.games.regretScenarios = s;
    });
  },

  async setChips(chips) {
    await get().update((d) => {
      d.games.chips = chips;
      d.journey.push({
        id: uid("j"),
        action: "game_played",
        reason: "Allocated 100 chips across the criteria",
        timestamp: Date.now(),
      });
    });
  },
}));
