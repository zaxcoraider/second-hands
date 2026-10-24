import "server-only";
import { customAlphabet } from "nanoid";
import { isMockAI } from "@/lib/env";
import type { Guide, Session, SessionState, TraceEntry } from "@/lib/schemas";
import { store } from "@/lib/store";

// No look-alike characters, so the code can be typed on a phone.
const sessionId = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 8);

export async function createSession(args: {
  task: string;
  guide: Guide;
  mode: Session["mode"];
  guideTraces?: TraceEntry[];
}): Promise<Session> {
  const id = sessionId();
  const stepStatus: Session["stepStatus"] = Object.fromEntries(args.guide.steps.map((s) => [s.id, "todo"]));
  stepStatus[args.guide.steps[0].id] = "active";

  const session: Session = {
    id,
    createdAt: Date.now(),
    status: "ready",
    task: args.task,
    device: args.guide.device,
    guide: args.guide,
    currentStep: 0,
    stepStatus,
    mode: args.mode,
    mock: isMockAI(),
    frames: 0,
  };
  await store.saveSession(session);

  // Carry the guide-building calls (Tavily + planner) into this session's trace.
  for (const t of (args.guideTraces ?? []).sort((a, b) => a.at - b.at)) {
    await store.pushTrace(id, t);
    await store.addSessionCost(id, t.costUsd);
  }
  return session;
}

export async function getState(id: string, opts: { frame?: boolean } = {}): Promise<SessionState | null> {
  const session = await store.getSession(id);
  if (!session) return null;
  const [events, trace, overrides, costUsd, latestFrame] = await Promise.all([
    store.getEvents(id, 50),
    store.getTrace(id, 60),
    store.getOverrides(id),
    store.getSessionCost(id),
    opts.frame ? store.getLatestFrame(id) : Promise.resolve(null),
  ]);
  return { session, events, trace, overrides, costUsd, latestFrame };
}
