import { z } from "zod";

import {
  ChangeClassificationSchema,
  MAX_CHANGE_RECORDS,
  type PatchDecision,
  type SceneChange,
} from "./types";

export const SCENEPATCH_TOOL_NAMES = [
  "record_change",
  "commit_patch",
  "block_commit",
] as const;

export const ScenePatchToolNameSchema = z.enum(SCENEPATCH_TOOL_NAMES);
export type ScenePatchToolName = z.infer<typeof ScenePatchToolNameSchema>;

export const RecordChangeArgumentsSchema = z
  .object({
    description: z.string().trim().min(1).max(280),
    classification: ChangeClassificationSchema,
  })
  .strict();

export const CommitPatchArgumentsSchema = z
  .object({
    summary: z.string().trim().min(1).max(500),
  })
  .strict();

export const BlockCommitArgumentsSchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export const ScenePatchToolCallSchema = z.discriminatedUnion("name", [
  z
    .object({
      name: z.literal("record_change"),
      arguments: RecordChangeArgumentsSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal("commit_patch"),
      arguments: CommitPatchArgumentsSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal("block_commit"),
      arguments: BlockCommitArgumentsSchema,
    })
    .strict(),
]);

export type ScenePatchToolCall = z.infer<typeof ScenePatchToolCallSchema>;

export const SCENEPATCH_TOOL_DECLARATIONS = [
  {
    type: "function",
    function: {
      name: "record_change",
      description:
        "Record one visible semantic difference between the BEFORE and AFTER scenes.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          description: {
            type: "string",
            description: "A short, concrete description of the visible change.",
          },
          classification: {
            type: "string",
            enum: ["intended", "unexplained", "uncertain"],
            description:
              "Whether the change follows the spoken intent, is outside it, or cannot be verified.",
          },
        },
        required: ["description", "classification"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "commit_patch",
      description:
        "Propose a commit only when every recorded scene change is intended.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          summary: {
            type: "string",
            description: "A concise summary of the intended physical patch.",
          },
        },
        required: ["summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "block_commit",
      description:
        "Block the commit when a change is unexplained, uncertain, or evidence is insufficient.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          reason: {
            type: "string",
            description: "A concrete reason the physical patch cannot be committed.",
          },
        },
        required: ["reason"],
      },
    },
  },
] as const;

export type ToolCallFailureCode =
  | "invalid_json"
  | "invalid_container"
  | "too_many_calls"
  | "unknown_tool"
  | "invalid_arguments"
  | "too_many_changes"
  | "duplicate_change"
  | "terminal_count"
  | "no_changes"
  | "repair_failed";

export interface ToolCallFailure {
  code: ToolCallFailureCode;
  message: string;
  issues?: readonly string[];
}

export type ToolCallParseResult =
  | { ok: true; calls: ScenePatchToolCall[] }
  | { ok: false; failure: ToolCallFailure };

export interface ValidToolExecution {
  valid: true;
  decision: PatchDecision;
  changes: SceneChange[];
  terminalTool: "commit_patch" | "block_commit";
  terminalMessage: string;
  overridden: boolean;
}

export interface InvalidToolExecution {
  valid: false;
  decision: "blocked";
  changes: [];
  terminalTool: null;
  terminalMessage: string;
  overridden: false;
  failure: ToolCallFailure;
}

export type ToolExecutionResult =
  | ValidToolExecution
  | InvalidToolExecution;

export interface ToolCallRepairRequest {
  attempt: 2;
  prompt: string;
  failure: ToolCallFailure;
}

export type ToolCallRepair = (
  request: ToolCallRepairRequest,
) => Promise<unknown>;

export interface RetriedToolExecution {
  execution: ToolExecutionResult;
  attempts: 1 | 2;
}

const ArgumentPayloadSchema = z.union([
  z.record(z.string(), z.unknown()),
  z.string().max(8_192),
]);

const RawFlatToolCallSchema = z
  .object({
    id: z.string().optional(),
    index: z.number().int().nonnegative().optional(),
    type: z.literal("function").optional(),
    name: z.string().min(1),
    arguments: ArgumentPayloadSchema,
  })
  .strict();

const RawNestedToolCallSchema = z
  .object({
    id: z.string().optional(),
    index: z.number().int().nonnegative().optional(),
    type: z.literal("function").optional(),
    function: z
      .object({
        name: z.string().min(1),
        arguments: ArgumentPayloadSchema,
      })
      .strict(),
  })
  .strict();

function failure(
  code: ToolCallFailureCode,
  message: string,
  issues?: readonly string[],
): ToolCallParseResult {
  return { ok: false, failure: { code, message, issues } };
}

function issueMessages(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });
}

function decodeJsonString(value: string): unknown {
  return JSON.parse(value) as unknown;
}

function unwrapCallContainer(value: unknown): unknown[] | null {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (Array.isArray(record.tool_calls)) {
    return record.tool_calls;
  }

  if ("name" in record || "function" in record) {
    return [record];
  }

  return null;
}

function normalizeArguments(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return decodeJsonString(value);
  } catch {
    return Symbol.for("scenepatch.invalid-json-arguments");
  }
}

function normalizeRawCall(value: unknown):
  | { ok: true; call: { name: string; arguments: unknown } }
  | { ok: false; issues: string[] } {
  const flat = RawFlatToolCallSchema.safeParse(value);
  if (flat.success) {
    return {
      ok: true,
      call: {
        name: flat.data.name,
        arguments: normalizeArguments(flat.data.arguments),
      },
    };
  }

  const nested = RawNestedToolCallSchema.safeParse(value);
  if (nested.success) {
    return {
      ok: true,
      call: {
        name: nested.data.function.name,
        arguments: normalizeArguments(nested.data.function.arguments),
      },
    };
  }

  return {
    ok: false,
    issues: [
      ...issueMessages(flat.error),
      ...issueMessages(nested.error),
    ],
  };
}

export function parseToolCalls(input: unknown): ToolCallParseResult {
  let decoded = input;
  if (typeof input === "string") {
    if (input.length > 65_536) {
      return failure(
        "invalid_json",
        "The model tool-call payload is too large.",
      );
    }

    try {
      decoded = decodeJsonString(input);
    } catch {
      return failure(
        "invalid_json",
        "The model response was not a valid JSON tool-call payload.",
      );
    }
  }

  const rawCalls = unwrapCallContainer(decoded);
  if (!rawCalls || rawCalls.length === 0) {
    return failure(
      "invalid_container",
      "The model response did not contain any tool calls.",
    );
  }

  if (rawCalls.length > MAX_CHANGE_RECORDS + 1) {
    return failure(
      "too_many_calls",
      `At most ${MAX_CHANGE_RECORDS + 1} tool calls are accepted.`,
    );
  }

  const calls: ScenePatchToolCall[] = [];
  for (const raw of rawCalls) {
    const normalized = normalizeRawCall(raw);
    if (!normalized.ok) {
      return failure(
        "invalid_container",
        "A tool call had an unsupported shape.",
        normalized.issues,
      );
    }

    const toolName = ScenePatchToolNameSchema.safeParse(normalized.call.name);
    if (!toolName.success) {
      return failure(
        "unknown_tool",
        "The model requested a tool that ScenePatch does not allow.",
      );
    }

    const candidate = {
      name: toolName.data,
      arguments: normalized.call.arguments,
    };
    const parsed = ScenePatchToolCallSchema.safeParse(candidate);
    if (!parsed.success) {
      return failure(
        "invalid_arguments",
        `The arguments for ${toolName.data} were invalid.`,
        issueMessages(parsed.error),
      );
    }

    calls.push(parsed.data);
  }

  return { ok: true, calls };
}

function invalidExecution(failure: ToolCallFailure): InvalidToolExecution {
  return {
    valid: false,
    decision: "blocked",
    changes: [],
    terminalTool: null,
    terminalMessage: failure.message,
    overridden: false,
    failure,
  };
}

function normalizeDescription(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/u, "")
    .toLocaleLowerCase("en-US");
}

export function executeToolCalls(input: unknown): ToolExecutionResult {
  const parsed = parseToolCalls(input);
  if (!parsed.ok) {
    return invalidExecution(parsed.failure);
  }

  const changes = parsed.calls.filter(
    (call): call is Extract<ScenePatchToolCall, { name: "record_change" }> =>
      call.name === "record_change",
  );
  if (changes.length > MAX_CHANGE_RECORDS) {
    return invalidExecution({
      code: "too_many_changes",
      message: `At most ${MAX_CHANGE_RECORDS} scene changes may be recorded.`,
    });
  }

  const terminalCalls = parsed.calls.filter(
    (
      call,
    ): call is Extract<
      ScenePatchToolCall,
      { name: "commit_patch" | "block_commit" }
    > => call.name === "commit_patch" || call.name === "block_commit",
  );
  if (terminalCalls.length !== 1) {
    return invalidExecution({
      code: "terminal_count",
      message: "Exactly one commit_patch or block_commit call is required.",
    });
  }

  if (changes.length === 0) {
    return invalidExecution({
      code: "no_changes",
      message: "No semantic scene changes were recorded; the commit is blocked.",
    });
  }

  const seenDescriptions = new Set<string>();
  for (const change of changes) {
    const normalized = normalizeDescription(change.arguments.description);
    if (seenDescriptions.has(normalized)) {
      return invalidExecution({
        code: "duplicate_change",
        message: "Duplicate scene-change records are not accepted.",
      });
    }
    seenDescriptions.add(normalized);
  }

  const sceneChanges: SceneChange[] = changes.map((change) => ({
    description: change.arguments.description,
    classification: change.arguments.classification,
  }));
  const terminal = terminalCalls[0];

  if (terminal.name === "block_commit") {
    return {
      valid: true,
      decision: "blocked",
      changes: sceneChanges,
      terminalTool: "block_commit",
      terminalMessage: terminal.arguments.reason,
      overridden: false,
    };
  }

  const unsafeChanges = sceneChanges.filter(
    (change) => change.classification !== "intended",
  );
  if (unsafeChanges.length > 0) {
    const labels = unsafeChanges.map((change) => change.description).join("; ");
    return {
      valid: true,
      decision: "blocked",
      changes: sceneChanges,
      terminalTool: "commit_patch",
      terminalMessage: `Commit overridden: ${labels}`,
      overridden: true,
    };
  }

  return {
    valid: true,
    decision: "commit_proposed",
    changes: sceneChanges,
    terminalTool: "commit_patch",
    terminalMessage: terminal.arguments.summary,
    overridden: false,
  };
}

export function createToolRepairPrompt(failure: ToolCallFailure): string {
  return [
    `Your previous ScenePatch tool-call response failed validation (${failure.code}).`,
    "Return native function calls only. Do not include prose or markdown.",
    `Call record_change between 1 and ${MAX_CHANGE_RECORDS} times with a unique concrete description and classification intended, unexplained, or uncertain.`,
    "Then call exactly one terminal function: commit_patch only if every change is intended; otherwise block_commit.",
    "Use no tools or arguments outside the supplied declarations.",
  ].join(" ");
}

export async function executeToolCallsWithRetry(
  initialInput: unknown,
  repair: ToolCallRepair,
): Promise<RetriedToolExecution> {
  const initial = executeToolCalls(initialInput);
  if (initial.valid) {
    return { execution: initial, attempts: 1 };
  }

  let repairedInput: unknown;
  try {
    repairedInput = await repair({
      attempt: 2,
      prompt: createToolRepairPrompt(initial.failure),
      failure: initial.failure,
    });
  } catch (error) {
    return {
      attempts: 2,
      execution: invalidExecution({
        code: "repair_failed",
        message: "The single tool-call repair attempt failed; the commit is blocked.",
        issues: error instanceof Error ? [error.message] : undefined,
      }),
    };
  }

  return {
    execution: executeToolCalls(repairedInput),
    attempts: 2,
  };
}
