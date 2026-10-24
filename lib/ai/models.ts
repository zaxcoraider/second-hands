/** Model roles, IDs and prices. IDs are env-overridable; prices are $ per 1M tokens (in / out). */

export type ModelRole = "vision" | "fast" | "planner" | "judge";

export const MODELS: Record<ModelRole, string> = {
  vision: process.env.MODEL_VISION ?? "nvidia/Nemotron-3.5-Super-VL",
  fast: process.env.MODEL_FAST ?? "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
  planner: process.env.MODEL_PLANNER ?? "nvidia/nemotron-3-super-120b-a12b",
  judge: process.env.MODEL_JUDGE ?? "nvidia/Nemotron-3-Ultra-550b-a55b",
};

const PRICES: Record<string, { in: number; out: number }> = {
  "nvidia/Nemotron-3.5-Super-VL": { in: 0.3, out: 0.9 },
  "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B": { in: 0.06, out: 0.24 },
  "nvidia/Nemotron-3_5-Lightning": { in: 0.06, out: 0.24 },
  "nvidia/nemotron-3-super-120b-a12b": { in: 0.3, out: 0.9 },
  "nvidia/Nemotron-3-Ultra-550b-a55b": { in: 1, out: 3 },
};

export function costOf(model: string, inTokens: number, outTokens: number): number {
  const p = PRICES[model] ?? { in: 1, out: 3 };
  return (inTokens * p.in + outTokens * p.out) / 1_000_000;
}

/** Short labels for the agent trace panel. */
export function shortName(model: string): string {
  if (/VL/i.test(model)) return "Super VL";
  if (/nano/i.test(model)) return "Nano 30B";
  if (/lightning/i.test(model)) return "Lightning";
  if (/ultra/i.test(model)) return "Ultra 550B";
  if (/super/i.test(model)) return "Super 120B";
  return model.split("/").pop() ?? model;
}
