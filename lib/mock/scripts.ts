import type { Focus, GateDecision, Guide, Observation, SessionEvent, Step, VerifyResult } from "@/lib/schemas";
import { REDMI_NOTE_8_BATTERY, findCuratedGuide } from "@/lib/mock/guides";

/**
 * Scripted model outputs for mock mode. Same shapes as the real models, so the whole
 * product can be built and demoed before credits arrive.
 *
 * The script per step (k = frames seen on that step):
 * - the first safety step with mistakes: a confident mistake on k=1,2 (→ "stop"), done on k=5,6
 * - the next high-severity step with mistakes: an unsure mistake on k=1,2 (→ "ask"), done on k=5,6
 * - every other step: in progress on k=0, done on k=1,2
 */

export function scriptedRole(guide: Guide, step: Step): "stop" | "ask" | null {
  const stopStep = guide.steps.find((s) => s.safety && s.commonMistakes.length > 0);
  if (stopStep?.id === step.id) return "stop";
  const askStep = guide.steps.find(
    (s) => s.id !== stopStep?.id && s.severity === "high" && s.commonMistakes.length > 0 && !s.safety,
  );
  if (askStep?.id === step.id) return "ask";
  return null;
}

// Where the hands are in the placeholder bench clip (768×576) for each Redmi step; the
// scripted "display connector first" mistake happens at the LCD connector.
const WORK_POINTS = [[640, 120], [250, 470], [330, 170], [330, 300], [445, 205], [320, 400], [400, 170], [330, 300]];
const MISTAKE_POINT = [445, 205];

function box([px, py]: number[], size = 120): Focus {
  return { x: (px - size / 2) / 768, y: (py - size / 2) / 576, w: size / 768, h: size / 576 };
}

export function mockObserve(args: { frameId: string; guide: Guide; step: Step; k: number }): Observation {
  const { frameId, guide, step, k } = args;
  const role = scriptedRole(guide, step);
  const index = guide.steps.findIndex((s) => s.id === step.id);
  const focus = box(WORK_POINTS[index] ?? [384, 288]);
  const base = { frameId, stepId: step.id, needCloserLook: false, visibility: "good" as const, focus };

  if (role) {
    const m = step.commonMistakes[0];
    if (k === 1 || k === 2) {
      return {
        ...base,
        stepState: "in_progress",
        observation: m.looksLike,
        mistake: {
          type: m.type,
          confidence: role === "stop" ? 0.88 : 0.68,
          evidence: m.looksLike,
        },
        needCloserLook: role === "ask",
        focus: role === "stop" ? box(MISTAKE_POINT, 110) : focus,
      };
    }
    if (k >= 5) return { ...base, stepState: "done", observation: step.visualCheck, mistake: null };
    return { ...base, stepState: "in_progress", observation: `Working on: ${step.title.toLowerCase()}.`, mistake: null };
  }

  if (k >= 1) return { ...base, stepState: "done", observation: step.visualCheck, mistake: null };
  return { ...base, stepState: "in_progress", observation: `Working on: ${step.title.toLowerCase()}.`, mistake: null };
}

export function mockGate(args: { step: Step; mistakeType: string; confidence: number; needCloserLook: boolean }): GateDecision {
  const m = args.step.commonMistakes.find((x) => x.type === args.mistakeType);
  const unsure = args.confidence < 0.8 || args.needCloserLook;
  if (unsure) {
    return { action: "ask", line: ASK_LINES[args.mistakeType] ?? `Check this step again. Hold it closer.` };
  }
  return {
    action: "warn",
    line: WARN_LINES[args.mistakeType] ?? `Stop. ${m?.description.split(".")[0] ?? "Check the manual"}.`,
  };
}

const WARN_LINES: Record<string, string> = {
  flex_before_battery: "Stop. Disconnect the battery connector first.",
  metal_tool_on_battery: "Stop. Use a plastic tool on the battery connector.",
  prying_battery: "Stop. Never pry the battery. Use the pull tabs.",
  long_screw_wrong_hole: "Stop. That long screw goes in the marked corner.",
  cover_pulled_with_flex: "Careful. The fingerprint cable is still attached.",
  missing_resistor: "Stop. Add the resistor before powering the LED.",
  led_reversed: "Flip the LED. Long leg toward plus.",
};

const ASK_LINES: Record<string, string> = {
  long_screw_wrong_hole: "Is that the long screw? Hold it closer.",
  led_reversed: "Is the long leg facing plus? Hold it closer.",
  missing_resistor: "Is there a resistor in that row? Hold it closer.",
  screws_mixed: "Are those screws kept in order?",
};

export function mockVerify(): VerifyResult {
  return {
    confirmed: true,
    reason:
      "Two consecutive frames show a tool at a non-battery connector while the battery connector is still seated; the manual requires battery disconnect first.",
  };
}

export function mockGuide(task: string): Guide {
  const curated = findCuratedGuide(task);
  if (curated) return curated;
  // Unknown task in mock mode: reuse the phone guide's shape with the user's title.
  return { ...REDMI_NOTE_8_BATTERY, title: task, device: undefined };
}

export function mockReport(events: SessionEvent[]): string {
  const caught = events.filter((e) => e.kind === "stop" || e.kind === "warn").length;
  const asked = events.filter((e) => e.kind === "ask").length;
  const overrides = events.filter((e) => e.kind === "override").length;
  const done = events.filter((e) => e.kind === "step_done").length;
  return `The repair went through ${done} steps. Second Hands stopped ${caught} likely mistake${caught === 1 ? "" : "s"} before damage was done and asked ${asked} clarifying question${asked === 1 ? "" : "s"}. ${overrides} warning${overrides === 1 ? " was" : "s were"} overridden by the technician. Next time, disconnect the battery before reaching for any other connector, and keep screws laid out in order.`;
}

export function mockSearch(task: string) {
  const g = mockGuide(task);
  return g.sources.map((s) => ({ title: s.title, url: s.url, content: g.steps.map((x) => x.instruction).join(" "), score: 0.9 }));
}
