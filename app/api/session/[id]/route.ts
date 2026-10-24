import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { getState } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const frame = new URL(req.url).searchParams.get("frame") === "1";
  const state = await getState(id, { frame });
  if (!state) return fail(404, "Session not found. It may have expired.");
  // `now` lets clients measure event age against the server clock.
  return NextResponse.json({ ...state, now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
