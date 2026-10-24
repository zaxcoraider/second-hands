import "server-only";
import { chatJson } from "@/lib/ai/client";
import { VERIFY_SYSTEM, verifyUser } from "@/lib/ai/prompts/verify";
import { mockVerify } from "@/lib/mock/scripts";
import { VerifyResult, type Observation, type Step } from "@/lib/schemas";

/** Ultra double-checks a high-severity warning before it becomes a "stop". Null = no verdict in time. */
export async function verify(args: {
  sessionId: string;
  step: Step;
  mistakeType: string;
  recent: Observation[];
}): Promise<VerifyResult | null> {
  const mistake = args.step.commonMistakes.find((m) => m.type === args.mistakeType);
  return chatJson(VerifyResult, {
    role: "judge",
    stage: "verify",
    sessionId: args.sessionId,
    maxTokens: 1500,
    reasoning: true,
    timeoutMs: 10_000,
    messages: [
      { role: "system", content: VERIFY_SYSTEM },
      {
        role: "user",
        content: verifyUser({
          stepTitle: args.step.title,
          instruction: args.step.instruction,
          mistakeType: args.mistakeType,
          description: mistake?.description ?? "",
          observations: args.recent.map(
            (o) => `${o.observation}${o.mistake ? ` [suspected ${o.mistake.type} @ ${o.mistake.confidence.toFixed(2)}: ${o.mistake.evidence}]` : ""}`,
          ),
        }),
      },
    ],
    mock: () => JSON.stringify(mockVerify()),
  });
}
