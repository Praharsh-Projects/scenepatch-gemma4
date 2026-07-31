import type { ParsedToolCall, RawToolValue } from "./protocol";

export const SCENEPATCH_TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "record_change",
      description:
        "Records one meaningful physical difference between the BEFORE and AFTER scenes.",
      parameters: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description:
              "Short, visually grounded description of what changed.",
          },
          classification: {
            type: "string",
            enum: ["intended", "unexplained", "uncertain"],
            description:
              "Whether the spoken intent authorizes the change, does not explain it, or the images are insufficient to tell.",
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
        "Proposes a clean patch only when every observed change is intended.",
      parameters: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "One-sentence summary of the authorized scene change.",
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
        "Blocks the patch when any change is unexplained or uncertain.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Concise reason a person must review or correct the scene.",
          },
        },
        required: ["reason"],
      },
    },
  },
] as const;

const TOOL_CALL_PATTERN =
  /<\|tool_call>call:([A-Za-z_][A-Za-z0-9_]*)\{([\s\S]*?)\}(?:<tool_call\|>|<turn\|>)/g;
const QUOTE_SENTINEL = '<|"|>';
const ALLOWED_BOUNDARY =
  /^(?:(?:\s+)|(?:<\|?end_of_turn\|?>)|(?:<turn\|>)|(?:<eos>)|(?:<\|tool_response>)|(?:<\|eot_id\|>)|(?:<\|im_end\|>))*$/;

function parseBareValue(value: string): RawToolValue {
  const trimmed = value.trim();
  if (!trimmed || /[\s:{}<>]/.test(trimmed)) {
    throw new SyntaxError("Malformed unquoted tool argument.");
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^['"]|['"]$/g, "");
}

/** Parse Gemma 4's compact function-call argument syntax without evaluating it. */
export function parseGemmaArguments(source: string): Record<string, RawToolValue> {
  const entries: Array<[string, RawToolValue]> = [];
  const keys = new Set<string>();
  let cursor = 0;
  let first = true;

  while (cursor < source.length) {
    while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
    if (cursor >= source.length) break;

    if (!first) {
      if (source[cursor] !== ",") {
        throw new SyntaxError("Tool arguments must be comma-separated.");
      }
      cursor += 1;
      while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
      if (cursor >= source.length) {
        throw new SyntaxError("Tool arguments cannot end with a comma.");
      }
    }

    const keyMatch = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(cursor));
    if (!keyMatch) throw new SyntaxError("Malformed tool argument name.");
    const key = keyMatch[0];
    if (keys.has(key)) throw new SyntaxError("Duplicate tool argument name.");
    keys.add(key);
    cursor += key.length;
    while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
    if (source[cursor] !== ":") {
      throw new SyntaxError("Tool argument name must be followed by a colon.");
    }
    cursor += 1;
    while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
    if (cursor >= source.length) {
      throw new SyntaxError("Tool argument value is missing.");
    }

    if (source.startsWith(QUOTE_SENTINEL, cursor)) {
      cursor += QUOTE_SENTINEL.length;
      const end = source.indexOf(QUOTE_SENTINEL, cursor);
      if (end === -1) {
        throw new SyntaxError("Quoted tool argument is not closed.");
      }
      entries.push([key, source.slice(cursor, end)]);
      cursor = end + QUOTE_SENTINEL.length;
    } else {
      let end = cursor;
      while (end < source.length && source[end] !== ",") end += 1;
      entries.push([key, parseBareValue(source.slice(cursor, end))]);
      cursor = end;
    }
    first = false;
  }

  return Object.fromEntries(entries);
}

/**
 * Extract tool calls from the raw decoded model output. This is deliberately a
 * syntax parser only; allowlisting, argument validation, and execution belong
 * to the deterministic application executor.
 */
export function parseGemmaToolCalls(rawOutput: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  let cursor = 0;
  TOOL_CALL_PATTERN.lastIndex = 0;
  try {
    for (const match of rawOutput.matchAll(TOOL_CALL_PATTERN)) {
      const index = match.index ?? 0;
      if (!ALLOWED_BOUNDARY.test(rawOutput.slice(cursor, index))) return [];
      calls.push({
        name: match[1],
        arguments: parseGemmaArguments(match[2]),
      });
      cursor = index + match[0].length;
    }
  } catch {
    return [];
  }
  if (calls.length === 0 || !ALLOWED_BOUNDARY.test(rawOutput.slice(cursor))) {
    return [];
  }
  return calls;
}
