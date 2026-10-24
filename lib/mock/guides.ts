import type { Guide } from "@/lib/schemas";

/**
 * Hand-checked guides. Used as mock-mode output and as pre-warmed cache entries for the
 * demo devices, so the live demo never depends on search quality.
 */

export const REDMI_NOTE_8_BATTERY: Guide = {
  title: "Redmi Note 8 battery replacement",
  device: "Xiaomi Redmi Note 8",
  sources: [
    { title: "iFixit: Xiaomi Redmi Note 8 repair", url: "https://www.ifixit.com/Device/Xiaomi_Redmi_Note_8" },
  ],
  steps: [
    {
      id: "s1",
      title: "Power off and remove the SIM tray",
      instruction: "Hold the power button and confirm power off. Eject the SIM tray with the SIM tool.",
      visualCheck: "Screen is black and the SIM tray lies on the mat next to the phone.",
      commonMistakes: [],
      severity: "low",
      safety: false,
    },
    {
      id: "s2",
      title: "Open the back cover",
      instruction:
        "Warm the back cover edges, then slide a plastic pick around the seam. Lift the cover from the bottom only a few centimetres: the fingerprint flex is still attached at the top.",
      visualCheck: "The back cover is lifted like a book hinge and the fingerprint flex cable is visible, still intact.",
      commonMistakes: [
        {
          type: "cover_pulled_with_flex",
          description: "Pulling the cover fully away before disconnecting the fingerprint flex tears the cable.",
          looksLike: "Back cover held far from the phone body with a thin ribbon cable stretched between them.",
        },
      ],
      severity: "medium",
      safety: false,
    },
    {
      id: "s3",
      title: "Remove the motherboard shield screws",
      instruction:
        "Remove the Phillips screws holding the motherboard shield. Lay them out on the mat in the same pattern as they came out: they are not all the same length.",
      visualCheck: "Screws are laid out in a pattern on the mat and the shield lifts off the top of the board.",
      commonMistakes: [
        {
          type: "screws_mixed",
          description: "Dropping all screws in one pile makes it easy to put a long screw in a short hole later.",
          looksLike: "Several screws together in a single pile or loose in a cup.",
        },
      ],
      severity: "medium",
      safety: false,
    },
    {
      id: "s4",
      title: "Disconnect the battery",
      instruction:
        "With a plastic spudger, pry the battery connector straight up off the board. Do this before touching any other connector.",
      visualCheck: "The battery connector is lifted off its socket and bent slightly away so it can't touch the board.",
      commonMistakes: [
        {
          type: "flex_before_battery",
          description: "Unplugging the display or another flex while the battery is connected can short the board.",
          looksLike: "A tool or fingers at a connector other than the battery's while the battery connector is still seated.",
        },
        {
          type: "metal_tool_on_battery",
          description: "Metal tweezers or a screwdriver on the battery connector can bridge the contacts.",
          looksLike: "A shiny metal tool tip touching the battery connector.",
        },
      ],
      severity: "high",
      safety: true,
    },
    {
      id: "s5",
      title: "Disconnect the display and charging flex",
      instruction: "Now that the battery is disconnected, pry up the display connector and the charging-board flex.",
      visualCheck: "Display and charging flex connectors are lifted off the board.",
      commonMistakes: [],
      severity: "medium",
      safety: false,
    },
    {
      id: "s6",
      title: "Swap the battery",
      instruction:
        "Pull the adhesive tabs slowly at a low angle to release the battery. Never pry under the battery with metal, never bend or puncture it.",
      visualCheck: "The old battery is out, flat and undamaged, and the new battery is seated in the frame.",
      commonMistakes: [
        {
          type: "prying_battery",
          description: "Levering a lithium battery with a metal tool can puncture it and start a fire.",
          looksLike: "A tool pushed under the battery, or the battery visibly bent.",
        },
      ],
      severity: "high",
      safety: true,
    },
    {
      id: "s7",
      title: "Refit the shield screws",
      instruction: "Put each screw back in the hole it came from. The long screw goes only in the marked corner.",
      visualCheck: "The shield is back on and every screw is seated flush.",
      commonMistakes: [
        {
          type: "long_screw_wrong_hole",
          description: "A long screw in a short hole can crack the board underneath.",
          looksLike: "The longest screw being driven into a hole other than the marked corner, or a screw head sitting high.",
        },
      ],
      severity: "high",
      safety: false,
    },
    {
      id: "s8",
      title: "Reconnect flexes, then the battery last",
      instruction: "Press the display and charging flex connectors home first. Reconnect the battery last, then close the cover.",
      visualCheck: "All connectors seated; the battery connector is the last one pressed down.",
      commonMistakes: [
        {
          type: "battery_reconnected_first",
          description: "Reconnecting the battery before the display can damage the display driver.",
          looksLike: "Battery connector pressed down while the display flex is still loose.",
        },
      ],
      severity: "medium",
      safety: true,
    },
  ],
};

export const LED_BREADBOARD: Guide = {
  title: "LED circuit on a breadboard",
  device: "Breadboard starter kit",
  sources: [
    { title: "SparkFun: How to use a breadboard", url: "https://learn.sparkfun.com/tutorials/how-to-use-a-breadboard" },
  ],
  steps: [
    {
      id: "s1",
      title: "Unplug the battery pack",
      instruction: "Make sure the battery pack is disconnected from the breadboard rails before placing parts.",
      visualCheck: "Battery pack wires are not plugged into the breadboard.",
      commonMistakes: [],
      severity: "low",
      safety: false,
    },
    {
      id: "s2",
      title: "Place the LED",
      instruction: "Push the LED into the board across two rows. The long leg (anode) goes toward the + rail.",
      visualCheck: "The LED sits across two rows, longer leg on the side facing the red + rail.",
      commonMistakes: [
        {
          type: "led_reversed",
          description: "A reversed LED won't light, and it confuses the rest of the build.",
          looksLike: "The shorter LED leg (or the flat edge of the LED rim) on the side facing the + rail.",
        },
      ],
      severity: "medium",
      safety: false,
    },
    {
      id: "s3",
      title: "Add the 220 Ω resistor",
      instruction: "Connect the resistor from the LED's long-leg row to the + rail.",
      visualCheck: "A resistor (striped body) bridges the LED anode row and the + rail.",
      commonMistakes: [
        {
          type: "missing_resistor",
          description: "Without a resistor the LED takes too much current and burns out.",
          looksLike: "A plain jumper wire going straight from the LED row to the + rail, with no striped resistor.",
        },
      ],
      severity: "high",
      safety: false,
    },
    {
      id: "s4",
      title: "Wire the LED to ground",
      instruction: "Run a jumper from the LED's short-leg row to the − rail.",
      visualCheck: "A jumper connects the LED cathode row to the blue − rail.",
      commonMistakes: [],
      severity: "low",
      safety: false,
    },
    {
      id: "s5",
      title: "Connect the battery pack",
      instruction: "Plug red into + and black into −. The LED should light.",
      visualCheck: "Battery pack plugged into the rails and the LED is lit.",
      commonMistakes: [
        {
          type: "battery_reversed",
          description: "Swapped battery wires mean the LED stays dark.",
          looksLike: "Red wire in the blue − rail or black wire in the red + rail.",
        },
      ],
      severity: "medium",
      safety: false,
    },
  ],
};

export const CURATED_GUIDES: { match: RegExp; guide: Guide }[] = [
  { match: /redmi\s*note\s*8/i, guide: REDMI_NOTE_8_BATTERY },
  { match: /led|breadboard/i, guide: LED_BREADBOARD },
];

export function findCuratedGuide(task: string): Guide | undefined {
  return CURATED_GUIDES.find((c) => c.match.test(task))?.guide;
}
