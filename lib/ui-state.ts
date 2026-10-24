import { CircleCheck, Eye, HelpCircle, OctagonX, TriangleAlert, Undo2, type LucideIcon } from "lucide-react";
import type { SessionEvent } from "@/lib/schemas";

/** The AI state shown by the status ring, the phone and event cards. Color + icon + text, never color alone. */
export type AiState = "idle" | "ok" | "ask" | "stop";

type StateMeta = {
  label: string; // plain words
  hud: string; // HUD chrome label
  icon: LucideIcon;
  text: string;
  border: string;
  borderSoft: string;
  bg: string;
  glow: string;
};

export const STATE: Record<AiState, StateMeta> = {
  idle: { label: "Watching", hud: "Scanning", icon: Eye, text: "text-hud", border: "border-hud/40", borderSoft: "border-hud/30", bg: "bg-hud", glow: "" },
  ok: { label: "Step done", hud: "Step done", icon: CircleCheck, text: "text-ok", border: "border-ok", borderSoft: "border-ok/50", bg: "bg-ok", glow: "glow-ok" },
  ask: { label: "Checking", hud: "Check", icon: HelpCircle, text: "text-ask", border: "border-ask", borderSoft: "border-ask/50", bg: "bg-ask", glow: "glow-ask" },
  stop: { label: "Stop", hud: "Stop", icon: OctagonX, text: "text-stop", border: "border-stop", borderSoft: "border-stop/60", bg: "bg-stop", glow: "glow-stop" },
};

export function stateOfEvent(kind: SessionEvent["kind"]): AiState {
  // A "warn" is a confirmed mistake on a lower-severity step: still red, just not Ultra-verified.
  if (kind === "stop" || kind === "warn") return "stop";
  if (kind === "ask") return "ask";
  if (kind === "step_done") return "ok";
  return "idle";
}

/** How long a state stays on screen after its event. */
export const HOLD_MS: Record<AiState, number> = { idle: 0, ok: 2_000, ask: 15_000, stop: 20_000 };

/** The current AI state from newest-first events, given the time now. */
export function currentState(events: SessionEvent[], now: number): { state: AiState; event: SessionEvent | null } {
  const e = events[0];
  if (!e || e.kind === "override" || e.kind === "info") return { state: "idle", event: null };
  const state = stateOfEvent(e.kind);
  return now - e.at < HOLD_MS[state] ? { state, event: e } : { state: "idle", event: null };
}

export const EVENT_META: Record<SessionEvent["kind"], { label: string; icon: LucideIcon; text: string }> = {
  step_done: { label: "Step done", icon: CircleCheck, text: "text-ok" },
  ask: { label: "Ask", icon: HelpCircle, text: "text-ask" },
  warn: { label: "Warn", icon: TriangleAlert, text: "text-stop" },
  stop: { label: "Stop", icon: OctagonX, text: "text-stop" },
  override: { label: "Override", icon: Undo2, text: "text-muted-foreground" },
  info: { label: "Info", icon: Eye, text: "text-muted-foreground" },
};

export const fmtUsd = (n: number) => (n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(3)}`);
export const fmtMs = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`);
export function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
