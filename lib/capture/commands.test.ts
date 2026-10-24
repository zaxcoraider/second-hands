import { describe, expect, it } from "vitest";
import { parseCommand } from "@/lib/capture/commands";

describe("parseCommand", () => {
  it.each([
    ["next step", "next"],
    ["skip it", "next"],
    ["okay done", "next"],
    ["go back", "back"],
    ["previous", "back"],
    ["can you repeat that", "repeat"],
    ["check me now", "check"],
    ["I'm right", "override"],
    ["no that's fine", "override"],
    ["pause", "pause"],
    ["hold on", "pause"],
    ["continue", "resume"],
  ])("%s → %s", (heard, cmd) => {
    expect(parseCommand(heard)).toBe(cmd);
  });

  it("ignores ordinary talk", () => {
    expect(parseCommand("this screw is tiny")).toBeNull();
    expect(parseCommand("hmm where did the tweezers go")).toBeNull();
  });
});
