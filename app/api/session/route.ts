import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, parseBody } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { Guide, TraceEntry } from "@/lib/schemas";
import { createSession } from "@/lib/session";

const Body = z.object({
  task: z.string().trim().min(3).max(160),
  guide: Guide,
  mode: z.enum(["live", "try"]).default("live"),
  guideTraces: z.array(TraceEntry).max(10).optional(),
});

export async function POST(req: Request) {
  const body = await parseBody(req, Body);
  if (!body) return fail(400, "Invalid session request.");
  if (!(await rateLimit("session", clientIp(req)))) return fail(429, "Daily session limit reached. Try the sample run instead.");
  const session = await createSession(body);
  return NextResponse.json({ id: session.id });
}
