import "server-only";
import { env, isMockTavily } from "@/lib/env";
import { mockSearch } from "@/lib/mock/scripts";
import type { TraceEntry } from "@/lib/schemas";

/** Tavily search + extract. VERIFY in Phase 0: params and Bearer auth against current docs. */

const BASE = "https://api.tavily.com";

export type SearchResult = { title: string; url: string; content: string; score: number };

type Traced<T> = { data: T; trace: TraceEntry };

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.tavilyKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Tavily ${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function trace(stage: string, started: number, ok: boolean, mock: boolean): TraceEntry {
  return { at: started, stage, model: "tavily", ms: Date.now() - started, inTokens: 0, outTokens: 0, costUsd: 0, ok, mock };
}

export async function searchGuides(query: string): Promise<Traced<SearchResult[]>> {
  const started = Date.now();
  if (isMockTavily()) {
    await new Promise((r) => setTimeout(r, 600));
    return { data: mockSearch(query), trace: trace("search", started, true, true) };
  }
  try {
    const data = await post<{ results: SearchResult[] }>("/search", {
      query,
      search_depth: "advanced",
      max_results: 5,
    });
    return { data: data.results ?? [], trace: trace("search", started, true, false) };
  } catch (err) {
    // Non-fatal: the planner falls back to its own knowledge (or a curated guide).
    console.error("[tavily search]", err);
    return { data: [], trace: trace("search", started, false, false) };
  }
}

export async function extractPages(urls: string[]): Promise<Traced<{ url: string; content: string }[]>> {
  const started = Date.now();
  if (isMockTavily()) {
    await new Promise((r) => setTimeout(r, 500));
    return { data: [], trace: trace("extract", started, true, true) };
  }
  try {
    const data = await post<{ results: { url: string; raw_content: string }[] }>("/extract", { urls });
    return {
      data: (data.results ?? []).map((r) => ({ url: r.url, content: r.raw_content ?? "" })),
      trace: trace("extract", started, true, false),
    };
  } catch (err) {
    console.error("[tavily extract]", err);
    return { data: [], trace: trace("extract", started, false, false) };
  }
}
