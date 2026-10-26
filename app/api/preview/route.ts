import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, parseBody } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";
import { store } from "@/lib/store";

const Body = z.object({
  sessionId: z.string().min(4).max(32),
  image: z.string().startsWith("data:image/jpeg;base64,").max(200_000),
});

/** Small, frequent frames for the dashboard's live view. No model calls. */
export async function POST(req: Request) {
  const body = await parseBody(req, Body);
  if (!body) return fail(400, "Invalid preview.");
  if (!(await rateLimit("preview", req))) return fail(429, "Too many previews.");
  const session = await store.getSession(body.sessionId);
  if (!session || session.status === "done") return fail(404, "Session not found.");
  await store.setLatestFrame(session.id, body.image);
  return new NextResponse(null, { status: 204 });
}
