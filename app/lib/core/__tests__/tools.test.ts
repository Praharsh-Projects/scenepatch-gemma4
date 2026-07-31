import { describe, expect, it } from "vitest";

import {
  MAX_CHANGE_RECORDS,
  SCENEPATCH_TOOL_DECLARATIONS,
  executeToolCalls,
  executeToolCallsWithRetry,
  parseToolCalls,
} from "../index";

function change(
  description: string,
  classification: "intended" | "unexplained" | "uncertain" = "intended",
) {
  return {
    name: "record_change",
    arguments: { description, classification },
  };
}

describe("ScenePatch tool declarations", () => {
  it("exposes exactly the three allowlisted tools", () => {
    expect(SCENEPATCH_TOOL_DECLARATIONS.map((tool) => tool.function.name)).toEqual(
      ["record_change", "commit_patch", "block_commit"],
    );
  });
});

describe("parseToolCalls", () => {
  it("normalizes flat and nested native function calls", () => {
    const result = parseToolCalls({
      tool_calls: [
        change("Red marker moved above the sketchbook"),
        {
          id: "terminal-1",
          type: "function",
          function: {
            name: "commit_patch",
            arguments: JSON.stringify({ summary: "Move the red marker" }),
          },
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.calls).toHaveLength(2);
      expect(result.calls[1]).toEqual({
        name: "commit_patch",
        arguments: { summary: "Move the red marker" },
      });
    }
  });

  it("accepts a strict JSON payload", () => {
    const result = parseToolCalls(
      JSON.stringify([
        change("Red marker moved"),
        { name: "commit_patch", arguments: { summary: "Move marker" } },
      ]),
    );

    expect(result.ok).toBe(true);
  });

  it("rejects unknown tools and extra arguments", () => {
    const unknown = parseToolCalls({
      name: "delete_scene",
      arguments: { target: "everything" },
    });
    expect(unknown).toMatchObject({
      ok: false,
      failure: { code: "unknown_tool" },
    });

    const extraArgument = parseToolCalls({
      name: "record_change",
      arguments: {
        description: "Marker moved",
        classification: "intended",
        execute: "arbitrary code",
      },
    });
    expect(extraArgument).toMatchObject({
      ok: false,
      failure: { code: "invalid_arguments" },
    });
  });

  it("rejects prose and malformed JSON instead of guessing", () => {
    expect(parseToolCalls("The scene looks safe.")).toMatchObject({
      ok: false,
      failure: { code: "invalid_json" },
    });
    expect(
      parseToolCalls({ name: "commit_patch", arguments: "{not-json}" }),
    ).toMatchObject({
      ok: false,
      failure: { code: "invalid_arguments" },
    });
  });
});

describe("executeToolCalls", () => {
  it("proposes a commit when all changes are intended", () => {
    const result = executeToolCalls([
      change("Red marker moved above the sketchbook"),
      {
        name: "commit_patch",
        arguments: { summary: "Move the red marker above the sketchbook" },
      },
    ]);

    expect(result).toMatchObject({
      valid: true,
      decision: "commit_proposed",
      terminalTool: "commit_patch",
      overridden: false,
    });
  });

  it.each(["unexplained", "uncertain"] as const)(
    "overrides a commit containing an %s change",
    (classification) => {
      const result = executeToolCalls([
        change("Red marker moved", "intended"),
        change("Blue marker is missing", classification),
        {
          name: "commit_patch",
          arguments: { summary: "Move red marker" },
        },
      ]);

      expect(result).toMatchObject({
        valid: true,
        decision: "blocked",
        terminalTool: "commit_patch",
        overridden: true,
      });
      expect(result.terminalMessage).toContain("Blue marker is missing");
    },
  );

  it("honors a valid explicit block", () => {
    const result = executeToolCalls([
      change("Blue marker is missing", "unexplained"),
      {
        name: "block_commit",
        arguments: { reason: "The blue marker disappeared unexpectedly" },
      },
    ]);

    expect(result).toMatchObject({
      valid: true,
      decision: "blocked",
      terminalTool: "block_commit",
      terminalMessage: "The blue marker disappeared unexpectedly",
      overridden: false,
    });
  });

  it("rejects duplicate normalized descriptions", () => {
    const result = executeToolCalls([
      change("Blue marker is missing."),
      change("  BLUE   marker is missing!  ", "unexplained"),
      {
        name: "block_commit",
        arguments: { reason: "Unexpected removal" },
      },
    ]);

    expect(result).toMatchObject({
      valid: false,
      decision: "blocked",
      failure: { code: "duplicate_change" },
    });
  });

  it("requires exactly one terminal call", () => {
    const none = executeToolCalls([change("Marker moved")]);
    expect(none).toMatchObject({
      valid: false,
      decision: "blocked",
      failure: { code: "terminal_count" },
    });

    const two = executeToolCalls([
      change("Marker moved"),
      { name: "commit_patch", arguments: { summary: "Move marker" } },
      { name: "block_commit", arguments: { reason: "Not sure" } },
    ]);
    expect(two).toMatchObject({
      valid: false,
      decision: "blocked",
      failure: { code: "terminal_count" },
    });
  });

  it("rejects more than six change records", () => {
    const calls = Array.from({ length: MAX_CHANGE_RECORDS + 1 }, (_, index) =>
      change(`Change ${index}`),
    );
    const result = executeToolCalls(calls);

    expect(result).toMatchObject({
      valid: false,
      decision: "blocked",
      failure: { code: "too_many_changes" },
    });
  });

  it("fails closed when no semantic change was recorded", () => {
    const result = executeToolCalls({
      name: "commit_patch",
      arguments: { summary: "Everything is fine" },
    });

    expect(result).toMatchObject({
      valid: false,
      decision: "blocked",
      failure: { code: "no_changes" },
    });
  });
});

describe("executeToolCallsWithRetry", () => {
  it("does not spend the retry when the initial output is valid", async () => {
    let repairCalls = 0;
    const result = await executeToolCallsWithRetry(
      [
        change("Red marker moved"),
        { name: "commit_patch", arguments: { summary: "Move marker" } },
      ],
      async () => {
        repairCalls += 1;
        return [];
      },
    );

    expect(result.attempts).toBe(1);
    expect(result.execution.decision).toBe("commit_proposed");
    expect(repairCalls).toBe(0);
  });

  it("makes one constrained repair attempt", async () => {
    let repairCalls = 0;
    const result = await executeToolCallsWithRetry(
      "not tool-call JSON",
      async ({ attempt, prompt, failure }) => {
        repairCalls += 1;
        expect(attempt).toBe(2);
        expect(failure.code).toBe("invalid_json");
        expect(prompt).toContain("exactly one terminal function");
        return [
          change("Blue marker is missing", "unexplained"),
          {
            name: "block_commit",
            arguments: { reason: "Blue marker disappeared" },
          },
        ];
      },
    );

    expect(result.attempts).toBe(2);
    expect(result.execution).toMatchObject({
      valid: true,
      decision: "blocked",
      terminalTool: "block_commit",
    });
    expect(repairCalls).toBe(1);
  });

  it("fails closed after a broken or rejected repair", async () => {
    const malformed = await executeToolCallsWithRetry([], async () => []);
    expect(malformed).toMatchObject({
      attempts: 2,
      execution: { valid: false, decision: "blocked" },
    });

    const thrown = await executeToolCallsWithRetry([], async () => {
      throw new Error("model worker stopped");
    });
    expect(thrown).toMatchObject({
      attempts: 2,
      execution: {
        valid: false,
        decision: "blocked",
        failure: { code: "repair_failed" },
      },
    });
  });
});
