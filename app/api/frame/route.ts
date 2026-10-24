import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, parseBody } from "@/lib/api";
import { isMockAI } from "@/lib/env";
import { processFrame } from "@/lib/pipeline/frame";
import { clientIp, overBudget, rateLimit } from "@/lib/ratelimit";
import { store } from "@/lib/store";

export const maxDuration = 60;

// Public sessions get a 5-minute live cap so visitors can't drain the demo budget.
const LIVE_CAP_MS = 5 * 60_000;

const Body = z.object({
  sessionId: z.string().min(4).max(32),
  image: z.string().startsWith("data:image/jpeg;base64,").max(1_500_000),
});

export async function POST(req: Request) {
  const body = await parseBody(req, Body);
  if (!body) return fail(400, "Invalid frame.");
  if (!(await rateLimit("frame", clientIp(req)))) return fail(429, "Too many frames. Slow down a little.");

  const session = await store.getSession(body.sessionId);
  if (!session) return fail(404, "Session not found.");
  if (session.status === "done") return fail(409, "This session is finished.");
  if (!isMockAI() && (await overBudget())) return fail(503, "Today's demo budget is used up.");
  if (process.env.NODE_ENV !== "development" && session.startedAt && Date.now() - session.startedAt > LIVE_CAP_MS) {
    return fail(403, "Demo sessions are capped at 5 minutes. Finish to see your report.");
  }

  try {
    return NextResponse.json(await processFrame(session, body.image));
  } catch (err) {
    console.error("[frame]", err);
    return fail(502, "The vision model didn't answer. Retrying with the next frame.");
  }
}
