export const REPORT_SYSTEM = `You write the end-of-session summary for a hands-on task (a repair, a build, a recipe) supervised by an AI assistant. The reader is the person who did it (or their supervisor or teacher).

Write one paragraph, 3-5 sentences, plain text: what was done, which mistakes were caught and how they were resolved, any overridden warnings (false alarms), and one concrete tip for next time. No headings, no bullet points, no praise padding.`;

export function reportUser(task: string, timeline: string[]) {
  return `Task: ${task}\nTimeline (oldest first):\n${timeline.join("\n") || "(no events)"}`;
}
