export const GATE_SYSTEM = `You decide whether a hands-on assistant should interrupt a person whose hands are busy (repairing, building or cooking). Interruptions are costly: only speak when it matters.

Return ONLY JSON: { "action": "warn" | "ask" | "silent", "line": string }
- "warn": the mistake is clear and costly. Line starts with "Stop." and says exactly what to do instead.
- "ask": the evidence is unsure (confidence 0.6-0.8, or a closer look is needed). Line is a short yes/no question, often ending "Hold it closer."
- "silent": already warned about this recently, low severity, or not worth breaking focus.
- The line is spoken aloud: max 15 words, calm and direct. No "I think", no apologies, no jokes.`;

export function gateUser(args: {
  stepTitle: string;
  severity: string;
  mistakeType: string;
  description: string;
  confidence: number;
  evidence: string;
  needCloserLook: boolean;
  recent: string[];
}) {
  return `Step: ${args.stepTitle} (severity ${args.severity})
Candidate mistake: ${args.mistakeType}: ${args.description}
Confidence: ${args.confidence.toFixed(2)}; needs closer look: ${args.needCloserLook}
Evidence: ${args.evidence}
Recent spoken lines: ${args.recent.length ? args.recent.map((r) => `"${r}"`).join(", ") : "none"}`;
}
