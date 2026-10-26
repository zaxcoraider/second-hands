import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { fail, parseBody } from "@/lib/api";
import type { SessionEvent } from "@/lib/schemas";
import { rateLimit } from "@/lib/ratelimit";
import { store } from "@/lib/store";

const Body = z.object({ action: z.enum(["next", "back"]) });

/** Manual step control from the phone ("skip" / "back"), for when the camera misses something. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseBody(req, Body);
  if (!body) return fail(400, "Invalid step action.");
  if (!(await rateLimit("control", req))) return fail(429, "Too many taps. Slow down a little.");
  const session = await store.getSession(id);
  if (!session) return fail(404, "Session not found.");
  if (session.status === "done") return fail(409, "This session is finished.");

  const steps = session.guide.steps;
  const from = session.currentStep;
  const to = body.action === "next" ? Math.min(from + 1, steps.length) : Math.max(from - 1, 0);
  if (to === from) return NextResponse.json({ currentStep: from, event: null });

  if (body.action === "next") {
    if (steps[from]) session.stepStatus[steps[from].id] = "skipped";
  } else if (steps[from]) {
    session.stepStatus[steps[from].id] = "todo";
  }
  if (steps[to]) session.stepStatus[steps[to].id] = "active";
  session.currentStep = to;
  session.stepVersion = (session.stepVersion ?? 0) + 1;
  await store.saveSession(session);

  const next = steps[to];
  const event: SessionEvent = {
    id: nanoid(10),
    at: Date.now(),
    kind: "info",
    stepId: next?.id,
    speak: true,
    message:
      body.action === "next"
        ? next
          ? `Skipped. Next: ${next.title.toLowerCase()}.`
          : "Skipped the last step. Tap finish when you're ready."
        : `Back to step ${to + 1}: ${next.title.toLowerCase()}.`,
  };
  await store.pushEvent(id, event);
  return NextResponse.json({ currentStep: to, event });
}
