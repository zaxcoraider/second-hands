import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { fail, parseBody } from "@/lib/api";
import type { SessionEvent } from "@/lib/schemas";
import { rateLimit } from "@/lib/ratelimit";
import { store } from "@/lib/store";

const Body = z.object({
  sessionId: z.string().min(4).max(32),
  stepId: z.string().max(40),
  mistakeType: z.string().max(80),
});

/** "I'm right": suppress this mistake on this step from now on. */
export async function POST(req: Request) {
  const body = await parseBody(req, Body);
  if (!body) return fail(400, "Invalid override.");
  if (!(await rateLimit("control", req))) return fail(429, "Too many taps. Slow down a little.");
  const session = await store.getSession(body.sessionId);
  if (!session) return fail(404, "Session not found.");
  if (session.status === "done") return fail(409, "This session is finished.");
  if (!session.guide.steps.some((s) => s.id === body.stepId)) return fail(400, "Invalid override.");

  const at = Date.now();
  await store.pushOverride(session.id, { stepId: body.stepId, mistakeType: body.mistakeType, at });
  const event: SessionEvent = {
    id: nanoid(10),
    at,
    kind: "override",
    stepId: body.stepId,
    mistakeType: body.mistakeType,
    message: "Got it, carry on.",
    speak: true,
  };
  await store.pushEvent(session.id, event);
  return NextResponse.json({ event });
}
