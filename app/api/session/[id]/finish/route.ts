import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { finishSession } from "@/lib/pipeline/report";
import { rateLimit } from "@/lib/ratelimit";
import { store } from "@/lib/store";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await rateLimit("control", req))) return fail(429, "Too many requests. Try again in a minute.");
  const session = await store.getSession(id);
  if (!session) return fail(404, "Session not found.");
  const done = await finishSession(session);
  return NextResponse.json({ id: done.id, status: done.status });
}
