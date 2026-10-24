import "server-only";
import { chat } from "@/lib/ai/client";
import { REPORT_SYSTEM, reportUser } from "@/lib/ai/prompts/report";
import { mockReport } from "@/lib/mock/scripts";
import type { Session } from "@/lib/schemas";
import { store } from "@/lib/store";

/** Marks the session done and writes the planner model's summary. */
export async function finishSession(session: Session): Promise<Session> {
  if (session.status === "done") return session;

  const events = (await store.getEvents(session.id, 200)).reverse();
  const t0 = session.startedAt ?? session.createdAt;
  const timeline = events.map(
    (e) => `${fmt(e.at - t0)} ${e.kind.toUpperCase()}${e.stepId ? ` [${e.stepId}]` : ""}: ${e.message}`,
  );

  let summary: string;
  try {
    const { text } = await chat({
      role: "planner",
      stage: "report",
      sessionId: session.id,
      maxTokens: 400,
      timeoutMs: 30_000,
      messages: [
        { role: "system", content: REPORT_SYSTEM },
        { role: "user", content: reportUser(session.task, timeline) },
      ],
      mock: () => mockReport(events),
    });
    summary = text;
  } catch {
    summary = mockReport(events);
  }

  const done: Session = { ...session, status: "done", finishedAt: Date.now(), summary };
  await store.saveSession(done);
  return done;
}

function fmt(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
