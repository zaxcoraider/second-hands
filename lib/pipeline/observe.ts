import "server-only";
import { chatJson } from "@/lib/ai/client";
import { OBSERVE_SYSTEM, observeUser } from "@/lib/ai/prompts/observe";
import { mockObserve } from "@/lib/mock/scripts";
import { Observation, type Guide } from "@/lib/schemas";

const ModelObservation = Observation.omit({ frameId: true, stepId: true });

/** Super VL looks at one frame against the current step. Returns null if the output is unusable. */
export async function observe(args: {
  sessionId: string;
  guide: Guide;
  stepIndex: number;
  frameId: string;
  image: string; // data URL
  k: number; // frames already seen on this step (drives the mock script)
}): Promise<Observation | null> {
  const step = args.guide.steps[args.stepIndex];
  const next = args.guide.steps[args.stepIndex + 1];

  const out = await chatJson(ModelObservation, {
    role: "vision",
    stage: "observe",
    sessionId: args.sessionId,
    maxTokens: 300,
    reasoning: false,
    timeoutMs: 15_000,
    messages: [
      { role: "system", content: OBSERVE_SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: observeUser(step, next, args.stepIndex, args.guide.steps.length) },
          { type: "image_url", image_url: { url: args.image } },
        ],
      },
    ],
    mock: () => JSON.stringify(mockObserve({ frameId: args.frameId, guide: args.guide, step, k: args.k })),
  });
  if (!out) return null;

  // Only accept mistake types the manual lists, so the model can't invent new alarms.
  const known = new Set(step.commonMistakes.map((m) => m.type));
  const mistake = out.mistake && known.has(out.mistake.type) ? out.mistake : null;
  return { ...out, mistake, frameId: args.frameId, stepId: step.id };
}
