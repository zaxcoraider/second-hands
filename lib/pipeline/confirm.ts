import type { Observation, Override, SessionEvent } from "@/lib/schemas";

/**
 * Multi-frame confirmation. Pure functions: no model calls, no I/O.
 * `recent` is newest first and already filtered to the current step.
 */

export const CONFIRM = {
  window: 3, // look at the last N frames
  needed: 2, // ... and need K of them to agree
  minConfidence: 0.6,
  repeatCooldownMs: 25_000, // don't raise the same mistake again within this time
};

export function shouldAdvance(recent: Observation[]): boolean {
  return recent.slice(0, CONFIRM.window).filter((o) => o.stepState === "done").length >= CONFIRM.needed;
}

export type Candidate = {
  type: string;
  confidence: number;
  evidence: string;
  needCloserLook: boolean;
};

export function findCandidate(args: {
  recent: Observation[];
  stepId: string;
  overrides: Override[];
  events: SessionEvent[]; // newest first
  now: number;
}): Candidate | null {
  const window = args.recent.slice(0, CONFIRM.window);
  const latest = window[0]?.mistake;
  // Only raise on the newest frame, so a mistake the user already fixed isn't announced late.
  if (!latest || latest.confidence < CONFIRM.minConfidence) return null;

  const agreeing = window.filter(
    (o) => o.mistake?.type === latest.type && o.mistake.confidence >= CONFIRM.minConfidence,
  );
  if (agreeing.length < CONFIRM.needed) return null;

  if (args.overrides.some((o) => o.stepId === args.stepId && o.mistakeType === latest.type)) return null;

  const raisedRecently = args.events.some(
    (e) =>
      e.stepId === args.stepId &&
      e.mistakeType === latest.type &&
      (e.kind === "ask" || e.kind === "warn" || e.kind === "stop") &&
      args.now - e.at < CONFIRM.repeatCooldownMs,
  );
  if (raisedRecently) return null;

  const confidence = agreeing.reduce((sum, o) => sum + (o.mistake?.confidence ?? 0), 0) / agreeing.length;
  return {
    type: latest.type,
    confidence,
    evidence: latest.evidence,
    needCloserLook: agreeing.some((o) => o.needCloserLook),
  };
}
