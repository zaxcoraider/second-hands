import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env, hasRedis } from "@/lib/env";
import { store } from "@/lib/store";

/** Per-IP limits from architecture.md, plus the global daily budget. */

type Kind = "session" | "frame" | "guide";

const RULES: Record<Kind, { tokens: number; window: `${number} ${"s" | "m" | "h" | "d"}`; ms: number }> = {
  session: { tokens: 3, window: "1 d", ms: 86_400_000 },
  guide: { tokens: 10, window: "1 d", ms: 86_400_000 },
  frame: { tokens: 40, window: "1 m", ms: 60_000 },
};

let limiters: Record<Kind, Ratelimit> | undefined;

function upstash() {
  if (!limiters) {
    const redis = new Redis({ url: env.redisUrl, token: env.redisToken });
    limiters = Object.fromEntries(
      (Object.keys(RULES) as Kind[]).map((k) => [
        k,
        new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(RULES[k].tokens, RULES[k].window), prefix: `rl:${k}` }),
      ]),
    ) as Record<Kind, Ratelimit>;
  }
  return limiters;
}

const g = globalThis as unknown as { __shRl?: Map<string, number[]> };
const mem: Map<string, number[]> = (g.__shRl ??= new Map());

export async function rateLimit(kind: Kind, ip: string): Promise<boolean> {
  // Frames are cheap to allow locally; skip limits entirely in dev.
  if (process.env.NODE_ENV === "development") return true;
  if (hasRedis()) return (await upstash()[kind].limit(ip)).success;
  const key = `${kind}:${ip}`;
  const now = Date.now();
  const hits = (mem.get(key) ?? []).filter((t) => now - t < RULES[kind].ms);
  if (hits.length >= RULES[kind].tokens) return false;
  hits.push(now);
  mem.set(key, hits);
  return true;
}

export async function overBudget(): Promise<boolean> {
  return (await store.getSpend()) >= env.dailyBudgetUsd;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
