import { useRef } from "react";

/**
 * Captures the behavioral telemetry the Friction Index needs (PRD §5.1 / §6.1):
 * decision latency, hover count, and switchbacks (how many times the tentative
 * pick flipped before commit). One instance per pairwise matchup.
 */
export interface MatchupTelemetry {
  latencyMs: number;
  hovers: number;
  switchbacks: number;
}

export function useMatchupTelemetry() {
  const startAt = useRef<number>(Date.now());
  const hovers = useRef(0);
  const switchbacks = useRef(0);
  const tentative = useRef<string | null>(null);

  function reset() {
    startAt.current = Date.now();
    hovers.current = 0;
    switchbacks.current = 0;
    tentative.current = null;
  }

  function onHover() {
    hovers.current += 1;
  }

  /** Call as the user hovers/taps toward a side before committing. */
  function onTentative(side: string) {
    if (tentative.current && tentative.current !== side) switchbacks.current += 1;
    tentative.current = side;
  }

  function commit(): MatchupTelemetry {
    return {
      latencyMs: Math.max(1, Date.now() - startAt.current),
      hovers: hovers.current,
      switchbacks: switchbacks.current,
    };
  }

  return { reset, onHover, onTentative, commit };
}
