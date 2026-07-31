import { describe, expect, it } from "vitest";

import { createReplayToolCalls, REPLAY_MODEL_ID } from "../../replay";
import { executeToolCalls } from "../tools";

describe("public fixture replay", () => {
  it.each([
    ["blocked", "blocked"],
    ["uncertain", "blocked"],
    ["clean", "commit_proposed"],
  ] as const)("maps %s to the expected policy decision", (fixture, decision) => {
    const execution = executeToolCalls(createReplayToolCalls(fixture));
    expect(execution.valid).toBe(true);
    expect(execution.decision).toBe(decision);
  });

  it("uses a non-model identifier", () => {
    expect(REPLAY_MODEL_ID).toMatch(/^replay:/);
  });
});
