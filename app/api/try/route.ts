import { NextResponse } from "next/server";
import { isMockAI } from "@/lib/env";
import { REDMI_NOTE_8_BATTERY } from "@/lib/mock/guides";
import { overBudget, rateLimit } from "@/lib/ratelimit";
import { createSession } from "@/lib/session";

/**
 * Starts a /try sample session on the demo guide (it matches the sample clip).
 * Over budget or rate-limited → tell the client to play the recorded replay instead of erroring.
 */
export async function POST(req: Request) {
  if (!isMockAI() && (await overBudget())) {
    return NextResponse.json({ replay: true, reason: "Today's live demo budget is used up, so this is a recorded run." });
  }
  if (!(await rateLimit("try", req))) {
    return NextResponse.json({ replay: true, reason: "You've used today's live runs, so this is a recorded run." });
  }
  const session = await createSession({ task: REDMI_NOTE_8_BATTERY.title, guide: REDMI_NOTE_8_BATTERY, mode: "try" });
  return NextResponse.json({ id: session.id });
}
