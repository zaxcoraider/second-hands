import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, parseBody } from "@/lib/api";
import { BLOCKED_TASKS } from "@/lib/categories";
import { rateLimit } from "@/lib/ratelimit";
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
  if (!(await rateLimit("session", req))) return fail(429, "Daily session limit reached. Try the sample run instead.");
  const problem = guideProblem(body.guide);
  if (problem) return fail(400, problem);
  if (BLOCKED_TASKS.test(`${body.task} ${body.guide.title} ${body.guide.device ?? ""}`)) {
    return fail(422, "This task needs a qualified professional, so Second Hands won't supervise it.");
  }
  const session = await createSession(body);
  return NextResponse.json({ id: session.id });
}

// The guide comes from the browser (steps can be edited on /start), and step text goes to the
// vision model with every frame. Real guides are under ~8 KB; these limits leave a wide margin
// while stopping an oversized guide from draining the model budget.
const LIMITS = { total: 60_000, steps: 30, step: 6_000, mistakes: 10, sources: 10, url: 2_000 };

function guideProblem(guide: z.infer<typeof Guide>): string | null {
  if (JSON.stringify(guide).length > LIMITS.total) return "This guide is too long.";
  if (guide.steps.length > LIMITS.steps) return `A guide can have at most ${LIMITS.steps} steps.`;
  for (const step of guide.steps) {
    if (JSON.stringify(step).length > LIMITS.step) return `Step "${step.title.slice(0, 40)}" is too long.`;
    if (step.commonMistakes.length > LIMITS.mistakes) return "A step lists too many mistakes.";
  }
  if (guide.sources.length > LIMITS.sources) return "Too many sources.";
  if (guide.sources.some((s) => s.url.length > LIMITS.url || !/^https?:\/\//i.test(s.url))) return "Invalid source link.";
  return null;
}
