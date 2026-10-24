import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, parseBody } from "@/lib/api";
import { isMockAI, isMockTavily } from "@/lib/env";
import { GuideRefused, buildGuide } from "@/lib/pipeline/guide";
import { clientIp, overBudget, rateLimit } from "@/lib/ratelimit";

export const maxDuration = 60;

const Body = z.object({ task: z.string().trim().min(3).max(160) });

export async function POST(req: Request) {
  const body = await parseBody(req, Body);
  if (!body) return fail(400, "Tell us what you're working on (3–160 characters).");
  if (!(await rateLimit("guide", clientIp(req)))) return fail(429, "Daily guide limit reached. Try the sample run instead.");
  if (!isMockAI() && (await overBudget())) return fail(503, "Today's demo budget is used up. Try the sample run instead.");

  try {
    const result = await buildGuide(body.task);
    return NextResponse.json({ ...result, mock: { ai: isMockAI(), search: isMockTavily() } });
  } catch (err) {
    if (err instanceof GuideRefused) return fail(422, err.message);
    console.error("[guide]", err);
    return fail(502, "Couldn't build a guide for that task. Try rewording it, or pick an example.");
  }
}
