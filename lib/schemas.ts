import { z } from "zod";

export const Severity = z.enum(["low", "medium", "high"]);

export const CommonMistake = z.object({
  type: z.string(), // snake_case id, e.g. "battery_still_connected"
  description: z.string(),
  looksLike: z.string(), // what the camera above the bench would see
});

export const Step = z.object({
  id: z.string(),
  title: z.string(),
  instruction: z.string(),
  visualCheck: z.string(),
  commonMistakes: z.array(CommonMistake).default([]),
  severity: Severity,
  safety: z.boolean().default(false),
});

export const Source = z.object({ title: z.string(), url: z.string() });

export const Guide = z.object({
  title: z.string(),
  device: z.string().optional(),
  sources: z.array(Source).default([]),
  steps: z.array(Step).min(1),
});

/** Normalized box (0-1, from the top-left of the frame) around the hands/tool and the part they're on. */
export const Focus = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});

export const Observation = z.object({
  frameId: z.string(),
  stepId: z.string(),
  stepState: z.enum(["not_started", "in_progress", "done", "unclear"]),
  observation: z.string(),
  mistake: z
    .object({ type: z.string(), confidence: z.number().min(0).max(1), evidence: z.string() })
    .nullable(),
  needCloserLook: z.boolean().default(false),
  visibility: z.enum(["good", "poor"]).default("good"),
  focus: Focus.nullable().default(null),
});

export const GateDecision = z.object({
  action: z.enum(["warn", "ask", "silent"]),
  line: z.string(),
});

export const VerifyResult = z.object({
  confirmed: z.boolean(),
  reason: z.string(),
});

export const EventKind = z.enum(["step_done", "ask", "warn", "stop", "override", "info"]);

export const SessionEvent = z.object({
  id: z.string(),
  at: z.number(),
  kind: EventKind,
  stepId: z.string().optional(),
  message: z.string(),
  speak: z.boolean().default(true),
  mistakeType: z.string().optional(),
  reason: z.string().optional(),
  frameThumb: z.string().optional(),
  manualRef: z.string().optional(),
  verifiedBy: z.literal("ultra").optional(),
  focus: Focus.optional(),
});

export const TraceEntry = z.object({
  at: z.number(),
  stage: z.string(), // "observe", "gate", "verify", "guide", "report", "search", "extract"
  model: z.string(),
  ms: z.number(),
  inTokens: z.number(),
  outTokens: z.number(),
  costUsd: z.number(),
  ok: z.boolean(),
  mock: z.boolean().default(false),
});

export const Override = z.object({ stepId: z.string(), mistakeType: z.string(), at: z.number() });

export const Session = z.object({
  id: z.string(),
  createdAt: z.number(),
  startedAt: z.number().optional(),
  finishedAt: z.number().optional(),
  status: z.enum(["ready", "live", "done"]),
  task: z.string(),
  device: z.string().optional(),
  guide: Guide,
  currentStep: z.number(),
  stepStatus: z.record(z.string(), z.enum(["todo", "active", "done", "skipped"])),
  mode: z.enum(["live", "try"]),
  mock: z.boolean(),
  frames: z.number().default(0),
  lastFrameAt: z.number().optional(),
  lastFrameId: z.string().optional(),
  summary: z.string().optional(),
});

export type Step = z.infer<typeof Step>;
export type Guide = z.infer<typeof Guide>;
export type Source = z.infer<typeof Source>;
export type Observation = z.infer<typeof Observation>;
export type Focus = z.infer<typeof Focus>;
export type GateDecision = z.infer<typeof GateDecision>;
export type VerifyResult = z.infer<typeof VerifyResult>;
export type EventKind = z.infer<typeof EventKind>;
export type SessionEvent = z.infer<typeof SessionEvent>;
export type TraceEntry = z.infer<typeof TraceEntry>;
export type Session = z.infer<typeof Session>;
export type Override = z.infer<typeof Override>;

/** What GET /api/session/[id] returns to the dashboard and phone. */
export type SessionState = {
  session: Session;
  events: SessionEvent[];
  trace: TraceEntry[];
  overrides: Override[];
  costUsd: number;
  latestFrame: string | null;
  lastObservation?: Observation | null;
  now?: number; // server time, set by GET /api/session/[id]
};
