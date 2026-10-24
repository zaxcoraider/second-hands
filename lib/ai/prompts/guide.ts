export const GUIDE_SYSTEM = `You turn repair or assembly guides into a step checklist that a camera mounted 15-20 cm ABOVE the workbench can check.

Return ONLY JSON with this shape:
{
  "title": string,
  "device": string,
  "steps": [{
    "id": "s1", "s2", ...,
    "title": short imperative (max 7 words),
    "instruction": 1-2 sentences,
    "visualCheck": what "done correctly" looks like FROM ABOVE (parts, tools, positions; no sounds, no feel),
    "commonMistakes": [{ "type": snake_case id, "description": why it's costly, "looksLike": what the camera would see }],
    "severity": "low" | "medium" | "high"   (high = can damage the device or hurt the user),
    "safety": boolean
  }]
}

Rules:
- 5 to 10 steps. Merge trivial steps. Skip steps a camera can't verify unless they are safety-critical.
- Phone repair: ALWAYS include a "Disconnect the battery" step before any other connector is unplugged (severity high, safety true), with a mistake "flex_before_battery". Reconnect the battery LAST on reassembly.
- Lithium batteries: never pry with metal, never bend or puncture. Mark such steps safety true.
- Only list mistakes that are expensive or dangerous AND visible from above. Max 2 per step.
- Use the source text; don't invent part names that aren't in it. Plain English.`;

export function guideUser(task: string, sources: { url: string; content: string }[]) {
  const text = sources
    .map((s, i) => `SOURCE ${i + 1} (${s.url}):\n${s.content.slice(0, 12_000)}`)
    .join("\n\n");
  return `Task: ${task}\n\n${text || "(No source text found. Use well-known safe practice for this task.)"}`;
}
