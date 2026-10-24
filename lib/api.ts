import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";

/** Small helpers so every route returns friendly JSON errors (a judge never sees a stack trace). */

export function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S> | null> {
  try {
    const parsed = schema.safeParse(await req.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
