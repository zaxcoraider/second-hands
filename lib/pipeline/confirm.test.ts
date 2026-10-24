import { describe, expect, it } from "vitest";
import { findCandidate, shouldAdvance } from "@/lib/pipeline/confirm";
import type { Observation, SessionEvent } from "@/lib/schemas";

const obs = (p: Partial<Observation> = {}): Observation => ({
  frameId: "f",
  stepId: "s4",
  stepState: "in_progress",
  observation: "",
  mistake: null,
  needCloserLook: false,
  visibility: "good",
  focus: null,
  ...p,
});
const m = (type: string, confidence = 0.9) => ({ type, confidence, evidence: "seen" });
const base = { stepId: "s4", overrides: [], events: [] as SessionEvent[], now: 100_000 };

describe("shouldAdvance", () => {
  it("needs 2 of the last 3 frames done", () => {
    expect(shouldAdvance([obs({ stepState: "done" })])).toBe(false);
    expect(shouldAdvance([obs({ stepState: "done" }), obs(), obs({ stepState: "done" })])).toBe(true);
    expect(shouldAdvance([obs(), obs(), obs({ stepState: "done" }), obs({ stepState: "done" })])).toBe(false);
  });
});

describe("findCandidate", () => {
  it("ignores a single-frame mistake", () => {
    expect(findCandidate({ ...base, recent: [obs({ mistake: m("flex_before_battery") }), obs()] })).toBeNull();
  });

  it("confirms the same mistake in 2 of 3 frames", () => {
    const c = findCandidate({
      ...base,
      recent: [obs({ mistake: m("flex_before_battery", 0.9) }), obs(), obs({ mistake: m("flex_before_battery", 0.7) })],
    });
    expect(c?.type).toBe("flex_before_battery");
    expect(c?.confidence).toBeCloseTo(0.8);
  });

  it("only raises on the newest frame", () => {
    const recent = [obs(), obs({ mistake: m("x") }), obs({ mistake: m("x") })];
    expect(findCandidate({ ...base, recent })).toBeNull();
  });

  it("drops low-confidence and mismatched types", () => {
    expect(findCandidate({ ...base, recent: [obs({ mistake: m("x", 0.5) }), obs({ mistake: m("x", 0.5) })] })).toBeNull();
    expect(findCandidate({ ...base, recent: [obs({ mistake: m("x") }), obs({ mistake: m("y") })] })).toBeNull();
  });

  it("respects overrides", () => {
    const recent = [obs({ mistake: m("x") }), obs({ mistake: m("x") })];
    expect(findCandidate({ ...base, recent, overrides: [{ stepId: "s4", mistakeType: "x", at: 0 }] })).toBeNull();
    expect(findCandidate({ ...base, recent, overrides: [{ stepId: "s9", mistakeType: "x", at: 0 }] })).not.toBeNull();
  });

  it("doesn't repeat within the cooldown", () => {
    const recent = [obs({ mistake: m("x") }), obs({ mistake: m("x") })];
    const ev = (at: number): SessionEvent => ({ id: "e", at, kind: "stop", stepId: "s4", mistakeType: "x", message: "", speak: true });
    expect(findCandidate({ ...base, recent, events: [ev(90_000)] })).toBeNull();
    expect(findCandidate({ ...base, recent, events: [ev(10_000)] })).not.toBeNull();
  });
});
