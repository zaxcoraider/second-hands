import "server-only";
import { Redis } from "@upstash/redis";
import { env, hasRedis } from "@/lib/env";
import type { Guide, Observation, Override, Session, SessionEvent, TraceEntry } from "@/lib/schemas";

/**
 * Tiny KV + list store. Upstash Redis when configured, otherwise an in-memory Map
 * (local dev only: it doesn't survive restarts or span serverless instances).
 */
interface KV {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSec?: number): Promise<void>;
  lpush(key: string, value: unknown, maxLen?: number): Promise<void>;
  lrange<T>(key: string, start: number, stop: number): Promise<T[]>;
  incrbyfloat(key: string, by: number, ttlSec?: number): Promise<number>;
}

class RedisKV implements KV {
  private r = new Redis({ url: env.redisUrl, token: env.redisToken });
  async get<T>(key: string) {
    return (await this.r.get<T>(key)) ?? null;
  }
  async set(key: string, value: unknown, ttlSec?: number) {
    if (ttlSec) await this.r.set(key, value, { ex: ttlSec });
    else await this.r.set(key, value);
  }
  async lpush(key: string, value: unknown, maxLen?: number) {
    const p = this.r.pipeline();
    p.lpush(key, value);
    if (maxLen) p.ltrim(key, 0, maxLen - 1);
    p.expire(key, SESSION_TTL);
    await p.exec();
  }
  async lrange<T>(key: string, start: number, stop: number) {
    return this.r.lrange<T>(key, start, stop);
  }
  async incrbyfloat(key: string, by: number, ttlSec?: number) {
    const v = await this.r.incrbyfloat(key, by);
    if (ttlSec) await this.r.expire(key, ttlSec);
    return Number(v);
  }
}

type Entry = { value: unknown; expires?: number };

class MemoryKV implements KV {
  private m: Map<string, Entry>;
  constructor() {
    const g = globalThis as unknown as { __shMem?: Map<string, Entry> };
    this.m = g.__shMem ??= new Map();
  }
  private read(key: string) {
    const e = this.m.get(key);
    if (!e) return undefined;
    if (e.expires && e.expires < Date.now()) {
      this.m.delete(key);
      return undefined;
    }
    return e.value;
  }
  async get<T>(key: string) {
    return (structuredClone(this.read(key)) as T) ?? null;
  }
  async set(key: string, value: unknown, ttlSec?: number) {
    this.m.set(key, { value: structuredClone(value), expires: ttlSec ? Date.now() + ttlSec * 1000 : undefined });
  }
  async lpush(key: string, value: unknown, maxLen?: number) {
    const list = ((this.read(key) as unknown[]) ?? []).slice();
    list.unshift(structuredClone(value));
    this.m.set(key, { value: maxLen ? list.slice(0, maxLen) : list });
  }
  async lrange<T>(key: string, start: number, stop: number) {
    const list = (this.read(key) as T[]) ?? [];
    return structuredClone(list.slice(start, stop === -1 ? undefined : stop + 1));
  }
  async incrbyfloat(key: string, by: number, ttlSec?: number) {
    const v = Number(this.read(key) ?? 0) + by;
    await this.set(key, v, ttlSec);
    return v;
  }
}

let kv: KV | undefined;
const db = () => (kv ??= hasRedis() ? new RedisKV() : new MemoryKV());

// Reports must outlive judging (ends Dec 15), so sessions live ~70 days.
const SESSION_TTL = 60 * 60 * 24 * 70;
const LIVE_FRAME_TTL = 60 * 30;

const k = {
  session: (id: string) => `s:${id}`,
  events: (id: string) => `s:${id}:events`,
  trace: (id: string) => `s:${id}:trace`,
  obs: (id: string) => `s:${id}:obs`,
  frame: (id: string) => `s:${id}:frame`,
  thumb: (frameId: string) => `thumb:${frameId}`,
  guide: (task: string) => `guide:${normalizeTask(task)}`,
  cost: (id: string) => `s:${id}:cost`,
  overrides: (id: string) => `s:${id}:overrides`,
  spend: (day: string) => `spend:${day}`,
};

export function normalizeTask(task: string) {
  return task.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export const store = {
  getSession: (id: string) => db().get<Session>(k.session(id)),
  saveSession: (s: Session) => db().set(k.session(s.id), s, SESSION_TTL),

  pushEvent: (id: string, e: SessionEvent) => db().lpush(k.events(id), e, 200),
  /** Newest first. */
  getEvents: (id: string, n = 50) => db().lrange<SessionEvent>(k.events(id), 0, n - 1),

  pushTrace: (id: string, t: TraceEntry) => db().lpush(k.trace(id), t, 500),
  getTrace: (id: string, n = 100) => db().lrange<TraceEntry>(k.trace(id), 0, n - 1),

  pushObservation: (id: string, o: Observation) => db().lpush(k.obs(id), o, 20),
  getObservations: (id: string, n = 3) => db().lrange<Observation>(k.obs(id), 0, n - 1),

  // Overrides live in their own list so a frame in flight can't overwrite them.
  pushOverride: (id: string, o: Override) => db().lpush(k.overrides(id), o, 100),
  getOverrides: (id: string) => db().lrange<Override>(k.overrides(id), 0, -1),

  /** The latest frame as a data URL, for the dashboard's live view. */
  // Only needed while someone is watching, so it expires quickly (privacy).
  setLatestFrame: (id: string, dataUrl: string) => db().set(k.frame(id), dataUrl, LIVE_FRAME_TTL),
  getLatestFrame: (id: string) => db().get<string>(k.frame(id)),

  /** Evidence thumbnails attached to warnings. */
  putThumb: (frameId: string, dataUrl: string) => db().set(k.thumb(frameId), dataUrl, SESSION_TTL),
  getThumb: (frameId: string) => db().get<string>(k.thumb(frameId)),

  addSessionCost: (id: string, usd: number) => db().incrbyfloat(k.cost(id), usd, SESSION_TTL),
  getSessionCost: async (id: string) => Number((await db().get<number>(k.cost(id))) ?? 0),

  getCachedGuide: (task: string) => db().get<Guide>(k.guide(task)),
  cacheGuide: (task: string, g: Guide) => db().set(k.guide(task), g, 60 * 60 * 24 * 30),

  /** Global daily Token Factory spend, for the budget cap. */
  addSpend: (usd: number) => db().incrbyfloat(k.spend(today()), usd, 60 * 60 * 48),
  getSpend: async () => Number((await db().get<number>(k.spend(today()))) ?? 0),
};

const today = () => new Date().toISOString().slice(0, 10);
