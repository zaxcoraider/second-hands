import "server-only";
import { nanoid } from "nanoid";
import { findCandidate, shouldAdvance } from "@/lib/pipeline/confirm";
import { gate } from "@/lib/pipeline/gate";
import { observe } from "@/lib/pipeline/observe";
import { verify } from "@/lib/pipeline/verify";
import type { Observation, Session, SessionEvent } from "@/lib/schemas";
import { store } from "@/lib/store";

export type FrameResult = {
  events: SessionEvent[]; // new events from this frame (the phone speaks these)
  observation: Observation | null;
  currentStep: number;
  status: Session["status"];
};

/** One frame through the live pipeline: observe → confirm → gate → (verify) → events. */
export async function processFrame(session: Session, image: string): Promise<FrameResult> {
  const id = session.id;
  const now = Date.now();
  const frameId = nanoid(12);
  const step = session.guide.steps[session.currentStep];

  if (session.status === "ready") {
    session.status = "live";
    session.startedAt = now;
  }
  session.frames += 1;
  session.lastFrameAt = now;
  session.lastFrameId = frameId;
  await store.setLatestFrame(id, image);

  const idle = { events: [], observation: null, currentStep: session.currentStep, status: session.status };
  if (!step) {
    await save(session);
    return idle;
  }

  const [prior, events, overrides] = await Promise.all([
    store.getObservations(id, 20),
    store.getEvents(id, 20),
    store.getOverrides(id),
  ]);
  const k = prior.filter((o) => o.stepId === step.id).length;

  const obs = await observe({ sessionId: id, guide: session.guide, stepIndex: session.currentStep, frameId, image, k });
  if (!obs) {
    await save(session);
    return idle;
  }
  await store.pushObservation(id, obs);

  const recent = [obs, ...prior].filter((o) => o.stepId === step.id).slice(0, 3);
  const out: SessionEvent[] = [];
  const base = { at: Date.now(), stepId: step.id, speak: true };

  if (shouldAdvance(recent)) {
    session.stepStatus[step.id] = "done";
    session.currentStep += 1;
    const next = session.guide.steps[session.currentStep];
    if (next) session.stepStatus[next.id] = "active";
    out.push({
      ...base,
      id: nanoid(10),
      kind: "step_done",
      message: next
        ? `Step ${session.currentStep} done. Next: ${next.title.toLowerCase()}.`
        : "All steps done. Tap finish when you're ready.",
    });
  } else {
    const candidate = findCandidate({ recent, stepId: step.id, overrides, events, now });
    if (candidate) {
      const decision = await gate({ sessionId: id, step, candidate, events });
      if (decision.action !== "silent") {
        let kind: SessionEvent["kind"] = decision.action;
        let message = decision.line;
        let reason: string | undefined = candidate.evidence;
        let verifiedBy: SessionEvent["verifiedBy"];

        if (decision.action === "warn" && step.severity === "high") {
          const verdict = await verify({ sessionId: id, step, mistakeType: candidate.type, recent });
          if (verdict?.confirmed) {
            kind = "stop";
            verifiedBy = "ultra";
            reason = verdict.reason;
          } else {
            // Ultra didn't confirm (or timed out): ask instead of ordering a stop.
            kind = "ask";
            message = "Hold on. Is that right? Hold it closer.";
            reason = verdict?.reason ?? candidate.evidence;
          }
        }

        const mistake = step.commonMistakes.find((m) => m.type === candidate.type);
        await store.putThumb(frameId, image);
        out.push({
          ...base,
          id: nanoid(10),
          kind,
          message,
          mistakeType: candidate.type,
          reason,
          verifiedBy,
          frameThumb: frameId,
          focus: obs.focus ?? undefined,
          manualRef: `${step.title}: ${step.instruction}${mistake ? `\nCommon mistake: ${mistake.description}` : ""}`,
        });
      }
    }
  }

  // Events are pushed oldest → newest so the list stays newest-first.
  for (const e of out) await store.pushEvent(id, e);
  await save(session);
  return { events: out, observation: obs, currentStep: session.currentStep, status: session.status };
}

/** Don't resurrect a session that was finished while this frame was in flight. */
async function save(session: Session) {
  const latest = await store.getSession(session.id);
  if (latest?.status === "done") return;
  await store.saveSession(session);
}
