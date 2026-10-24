import type { Step } from "@/lib/schemas";

export const OBSERVE_SYSTEM = `You are the eyes of a repair assistant. A phone camera looks straight down at a workbench while a person repairs or builds something. You see one frame at a time.

Judge ONLY what is visible. If hands or parts block the view, say "unclear". Never guess a mistake you can't see.

Return ONLY JSON:
{
  "stepState": "not_started" | "in_progress" | "done" | "unclear",
  "observation": one short factual sentence about what the hands and tools are doing,
  "mistake": null | { "type": one of the listed mistake types, "confidence": 0-1, "evidence": what in the frame shows it },
  "needCloserLook": true if a closer or clearer view would change your answer,
  "visibility": "good" | "poor"
}`;

export function observeUser(step: Step, next: Step | undefined, index: number, total: number) {
  const mistakes = step.commonMistakes.length
    ? step.commonMistakes.map((m) => `- ${m.type}: ${m.description} Looks like: ${m.looksLike}`).join("\n")
    : "- (none listed)";
  return `CURRENT STEP ${index + 1}/${total}: ${step.title}
Instruction: ${step.instruction}
Done correctly looks like: ${step.visualCheck}
Mistakes to watch for:
${mistakes}
${next ? `NEXT STEP: ${next.title} (if the frame already shows this, the current step is done)` : "This is the last step."}`;
}
