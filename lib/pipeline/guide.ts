import "server-only";
import { z } from "zod";
import { chatJson } from "@/lib/ai/client";
import { GUIDE_SYSTEM, guideUser } from "@/lib/ai/prompts/guide";
import { BLOCKED_TASKS } from "@/lib/categories";
import { isMockAI } from "@/lib/env";
import { findCuratedGuide } from "@/lib/mock/guides";
import { mockGuide } from "@/lib/mock/scripts";
import { Guide, type TraceEntry } from "@/lib/schemas";
import { store } from "@/lib/store";
import { extractPages, searchGuides } from "@/lib/tavily";

const PlannerGuide = Guide.omit({ sources: true });
const Refusal = z.object({ refuse: z.string() });

export type GuideResult = { guide: Guide; traces: TraceEntry[]; cached: boolean };

/** The task is one we won't supervise (a missed warning could seriously hurt someone). */
export class GuideRefused extends Error {}

const REFUSAL = "This task needs a qualified professional, so Second Hands won't supervise it.";

/** Tavily search → Tavily extract → planner model → Guide. Cached by normalized task. */
export async function buildGuide(task: string): Promise<GuideResult> {
  if (BLOCKED_TASKS.test(task)) throw new GuideRefused(REFUSAL);

  const cached = await store.getCachedGuide(task);
  if (cached) return { guide: cached, traces: [], cached: true };

  const traces: TraceEntry[] = [];

  const search = await searchGuides(`${task} step by step guide`);
  traces.push(search.trace);
  const top = search.data.slice(0, 2);

  const extract = top.length ? await extractPages(top.map((r) => r.url)) : null;
  if (extract) traces.push(extract.trace);

  // Fall back to the search snippets when extract returns nothing for a URL.
  const sources = top.map((r) => ({
    url: r.url,
    content: extract?.data.find((e) => e.url === r.url)?.content || r.content,
  }));

  const planned = await chatJson(z.union([Refusal, PlannerGuide]), {
    role: "planner",
    stage: "guide",
    messages: [
      { role: "system", content: GUIDE_SYSTEM },
      { role: "user", content: guideUser(task, sources) },
    ],
    maxTokens: 3000,
    traces,
    timeoutMs: 60_000,
    mock: () => JSON.stringify(mockGuide(task)),
  });

  if (planned && "refuse" in planned) throw new GuideRefused(planned.refuse || REFUSAL);

  const fallback = findCuratedGuide(task);
  if (!planned && !fallback) throw new Error("Couldn't build a guide for this task.");

  const guide: Guide = planned
    ? { ...planned, sources: top.map((r) => ({ title: r.title, url: r.url })) }
    : fallback!;

  if (planned && !isMockAI()) await store.cacheGuide(task, guide);
  return { guide, traces, cached: false };
}
