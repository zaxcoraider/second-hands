/** Task categories shown on /start. Pure data, safe on client and server. */

export type CategoryId = "electronics" | "cooking" | "furniture" | "home" | "bike" | "crafts";

export type Category = {
  id: CategoryId;
  label: string;
  examples: string[];
  /** Default camera placement, used when the planner doesn't give one. */
  setup: string;
};

export const CATEGORIES: Category[] = [
  {
    id: "electronics",
    label: "Electronics repair",
    examples: ["Redmi Note 8 battery replacement", "LED circuit on a breadboard", "Replace a laptop keyboard"],
    setup: "Mount the phone 15–20 cm above the bench, camera facing down, in bright even light.",
  },
  {
    id: "cooking",
    label: "Cooking",
    examples: ["Dice an onion safely", "Make a French omelette", "Debone a chicken thigh"],
    setup: "Mount the phone 40–60 cm above the cutting board or pan, camera facing down, away from steam.",
  },
  {
    id: "furniture",
    label: "Furniture & woodwork",
    examples: ["Assemble a flat-pack bookshelf", "Fix a wobbly chair leg", "Hang a floating shelf"],
    setup: "Mount the phone 50–80 cm above the work area so the whole panel or joint is in frame.",
  },
  {
    id: "home",
    label: "Home fixes",
    examples: ["Replace a kitchen tap cartridge", "Patch a small hole in drywall", "Unclog a sink trap"],
    setup: "Mount the phone 30–50 cm from the work area, pointing at your hands, in good light.",
  },
  {
    id: "bike",
    label: "Bikes",
    examples: ["Fix a flat bike tyre", "Adjust bike brakes", "Clean and lube a bike chain"],
    setup: "Mount the phone 40–60 cm above the wheel or part you're working on.",
  },
  {
    id: "crafts",
    label: "Crafts & making",
    examples: ["Solder a header onto a PCB", "Sew on a button", "Thread a sewing machine"],
    setup: "Mount the phone 20–30 cm above your hands, camera facing down.",
  },
];

export const DEFAULT_SETUP = "Mount the phone above your work, camera facing down, in good light. Turn the volume up.";

/**
 * Tasks we refuse to supervise: an AI miss here could seriously hurt someone.
 * The planner also refuses these; this is the fast first check.
 */
export const BLOCKED_TASKS =
  /\b(mains|breakers?|fuse ?box|consumer unit|live wires?|rewir\w*|(?:110|120|220|230|240) ?v(?:olts?)?|high[- ]voltage|gas (?:line|pipe|valve|leak)s?|boilers?|chainsaws?|firearms?|handguns?|rifles?|shotguns?|ammo|explosives?|airbags?|brake lines?)\b/i;
