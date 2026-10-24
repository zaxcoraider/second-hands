import type { SessionState } from "@/lib/schemas";

/**
 * Rebuilds what the dashboard looked like `elapsedMs` into a recorded session, re-timed so it
 * appears to start at `startedAt` (local clock). Used by /try when live runs aren't available.
 * The recording is a finished session as returned by GET /api/session/[id].
 */
export function replayAt(rec: SessionState, startedAt: number, elapsedMs: number): SessionState {
  const t0 = rec.session.startedAt ?? rec.session.createdAt;
  const shift = (at: number) => startedAt + (at - t0);
  const visible = (at: number) => at - t0 <= elapsedMs;

  // Lists are newest first, same as the live API.
  const events = rec.events.filter((e) => visible(e.at)).map((e) => ({ ...e, at: shift(e.at) }));
  const trace = rec.trace.filter((t) => visible(t.at)).map((t) => ({ ...t, at: shift(t.at) }));

  const done = events.filter((e) => e.kind === "step_done").length;
  const steps = rec.session.guide.steps;
  const stepStatus = Object.fromEntries(
    steps.map((s, i) => [s.id, i < done ? "done" : i === done ? "active" : "todo"] as const),
  );
  const end = recordingLength(rec);

  return {
    ...rec,
    session: {
      ...rec.session,
      createdAt: startedAt,
      startedAt,
      finishedAt: elapsedMs >= end ? startedAt + end : undefined,
      status: elapsedMs >= end ? "done" : "live",
      currentStep: Math.min(done, steps.length),
      stepStatus,
      lastFrameAt: startedAt + Math.min(elapsedMs, end),
    },
    events,
    trace,
    overrides: rec.overrides.filter((o) => visible(o.at)),
    costUsd: trace.reduce((sum, t) => sum + t.costUsd, 0),
    latestFrame: null,
    lastObservation: null,
  };
}

/** Time from the first frame to the last recorded event. */
export function recordingLength(rec: SessionState): number {
  const t0 = rec.session.startedAt ?? rec.session.createdAt;
  return Math.max(0, ...rec.events.map((e) => e.at - t0));
}
