import type { Focus, GateDecision, Guide, Observation, SessionEvent, Step, VerifyResult } from "@/lib/schemas";
import { findCuratedGuide } from "@/lib/mock/guides";

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
  // Prefer a non-safety high-severity step for the "ask"; otherwise any other high-severity one.
  const candidates = guide.steps.filter((s) => s.id !== stopStep?.id && s.severity === "high" && s.commonMistakes.length > 0);
  const askStep = candidates.find((s) => !s.safety) ?? candidates[0];
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
  flat_fingers: "Stop. Curl your fingertips into a claw.",
  cutting_toward_hand: "Stop. Cut away from your other hand.",
  no_anti_tip: "Stop. Fit the anti-tip strap before loading it.",
  panel_backwards: "Stop. That panel is back to front.",
  hands_in_path: "Stop. Move your hand out of the tool's path.",
  missing_resistor: "Stop. Add the resistor before powering the LED.",
  led_reversed: "Flip the LED. Long leg toward plus.",
};

const ASK_LINES: Record<string, string> = {
  long_screw_wrong_hole: "Is that the long screw? Hold it closer.",
  led_reversed: "Is the long leg facing plus? Hold it closer.",
  missing_resistor: "Is there a resistor in that row? Hold it closer.",
  screws_mixed: "Are those screws kept in order?",
  flat_fingers: "Are your fingertips tucked in? Curl them under.",
  panel_backwards: "Is the finished edge facing the front?",
  cam_wrong_way: "Is that cam lock arrow facing the bolt?",
};

export function mockVerify(): VerifyResult {
  return {
    confirmed: true,
    reason:
      "Two consecutive frames show a tool at a non-battery connector while the battery connector is still seated; the manual requires battery disconnect first.",
  };
}

export function mockGuide(task: string): Guide {
  return findCuratedGuide(task) ?? genericGuide(task);
}

/** Mock mode for a task we have no hand-checked guide for: a plain, honest 5-step outline. */
function genericGuide(task: string): Guide {
  const step = (id: string, title: string, instruction: string, visualCheck: string, extra: Partial<Step> = {}): Step => ({
    id,
    title,
    instruction,
    visualCheck,
    commonMistakes: [],
    severity: "low",
    safety: false,
    ...extra,
  });
  return {
    title: task,
    sources: [],
    steps: [
      step("s1", "Clear and light the work area", "Clear the surface and make sure your hands and the work are well lit.", "An uncluttered surface with the work in the middle of the frame."),
      step("s2", "Lay out tools and parts", "Put every tool and part you need within reach, in the order you'll use them.", "Tools and parts laid out in a row beside the work."),
      step("s3", "Do the main step carefully", "Work slowly and keep your free hand clear of any blade, bit or hot surface.", "The main change is done and both hands are clear of the tool.", {
        severity: "high",
        safety: true,
        commonMistakes: [
          { type: "hands_in_path", description: "A hand in the path of a tool is how most injuries happen.", looksLike: "Fingers directly in front of a blade, bit or hot surface." },
        ],
      }),
      step("s4", "Check the result", "Compare the result with the guide before moving on.", "The finished work matches the guide's picture.", { severity: "medium" }),
      step("s5", "Clean up", "Put tools away and clear the surface.", "An empty, clean surface."),
    ],
  };
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
