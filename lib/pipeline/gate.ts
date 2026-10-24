import "server-only";
import { chatJson } from "@/lib/ai/client";
import { GATE_SYSTEM, gateUser } from "@/lib/ai/prompts/gate";
import { mockGate } from "@/lib/mock/scripts";
import { GateDecision, type SessionEvent, type Step } from "@/lib/schemas";
import type { Candidate } from "@/lib/pipeline/confirm";

/** The fast model decides warn / ask / silent and writes the spoken line. */
export async function gate(args: {
  sessionId: string;
  step: Step;
  candidate: Candidate;
  events: SessionEvent[];
}): Promise<GateDecision> {
  const { step, candidate } = args;
  const mistake = step.commonMistakes.find((m) => m.type === candidate.type);
  const scripted = mockGate({
    step,
    mistakeType: candidate.type,
    confidence: candidate.confidence,
    needCloserLook: candidate.needCloserLook,
  });

  const out = await chatJson(GateDecision, {
    role: "fast",
    stage: "gate",
    sessionId: args.sessionId,
    maxTokens: 120,
    reasoning: false,
    timeoutMs: 6_000,
    messages: [
      { role: "system", content: GATE_SYSTEM },
      {
        role: "user",
        content: gateUser({
          stepTitle: step.title,
          severity: step.severity,
          mistakeType: candidate.type,
          description: mistake?.description ?? "",
          confidence: candidate.confidence,
          evidence: candidate.evidence,
          needCloserLook: candidate.needCloserLook,
          recent: args.events.filter((e) => e.speak).slice(0, 3).map((e) => e.message),
        }),
      },
    ],
    mock: () => JSON.stringify(scripted),
  });

  // If the fast model fails, the deterministic rule still protects the user.
  return out ? { ...out, line: clampWords(out.line, 15) } : scripted;
}

function clampWords(line: string, max: number) {
  const words = line.trim().split(/\s+/);
  return words.length <= max ? line.trim() : words.slice(0, max).join(" ").replace(/[,;:]$/, "") + ".";
}
