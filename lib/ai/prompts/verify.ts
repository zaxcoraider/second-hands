export const VERIFY_SYSTEM = `You are the final check before a hands-on assistant tells someone to STOP. A false "stop" erodes trust; a missed one can ruin the work or hurt someone.

You get the manual step, the suspected mistake, and the last observations from the camera model. Decide if the evidence actually supports the mistake. Consider whether the observations are consistent across frames and whether a normal, correct action could look the same.

Return ONLY JSON: { "confirmed": boolean, "reason": one sentence }`;

export function verifyUser(args: {
  stepTitle: string;
  instruction: string;
  mistakeType: string;
  description: string;
  observations: string[];
}) {
  return `Manual step: ${args.stepTitle}: ${args.instruction}
Suspected mistake: ${args.mistakeType}: ${args.description}
Camera observations (newest first):
${args.observations.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
}
