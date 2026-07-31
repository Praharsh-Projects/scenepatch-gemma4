import assert from "node:assert/strict";
import { test } from "vitest";
import { parseGemmaArguments, parseGemmaToolCalls } from "../tool-calls";

test("parses Gemma 4 native tool calls without evaluating values", () => {
  const raw = [
    '<|tool_call>call:record_change{description:<|"|>Blue marker is missing, not moved<|"|>,classification:<|"|>unexplained<|"|>}<tool_call|>',
    '<|tool_call>call:block_commit{reason:<|"|>The blue marker removal was not requested.<|"|>}<tool_call|>',
    "<|tool_response>",
  ].join("");

  assert.deepEqual(
    parseGemmaToolCalls(raw).map(({ name, arguments: args }) => ({
      name,
      arguments: args,
    })),
    [
      {
        name: "record_change",
        arguments: {
          description: "Blue marker is missing, not moved",
          classification: "unexplained",
        },
      },
      {
        name: "block_commit",
        arguments: {
          reason: "The blue marker removal was not requested.",
        },
      },
    ],
  );
});

test("accepts the Gemma browser tokenizer's trailing turn token", () => {
  const raw =
    '<|tool_call>call:record_change{classification:<|"|>intended<|"|>,description:<|"|>Marker moved<|"|>}<tool_call|>' +
    '<|tool_call>call:commit_patch{summary:<|"|>Marker moved.<|"|>}<turn|>';
  assert.equal(parseGemmaToolCalls(raw).length, 2);
});

test("accepts an eos token after a normally closed terminal call", () => {
  const raw =
    '<|tool_call>call:record_change{description:<|"|>Marker moved<|"|>,classification:<|"|>intended<|"|>}<tool_call|>' +
    '<|tool_call>call:commit_patch{summary:<|"|>Marker moved.<|"|>}<tool_call|><eos>';
  assert.equal(parseGemmaToolCalls(raw).length, 2);
});

test("casts only simple bare scalar values", () => {
  assert.deepEqual(parseGemmaArguments("count:2,valid:true,nothing:null,label:test"), {
    count: 2,
    valid: true,
    nothing: null,
    label: "test",
  });
});

test("rejects prose, incomplete calls, and trailing junk", () => {
  const valid =
    '<|tool_call>call:commit_patch{summary:<|"|>ok<|"|>}<tool_call|>';
  assert.deepEqual(parseGemmaToolCalls("I think this looks correct."), []);
  assert.deepEqual(parseGemmaToolCalls(`prose ${valid}`), []);
  assert.deepEqual(parseGemmaToolCalls(`${valid} prose`), []);
  assert.deepEqual(
    parseGemmaToolCalls(
      '<|tool_call>call:commit_patch{summary:<|"|>ok<|"|>junk}<tool_call|>',
    ),
    [],
  );
  assert.deepEqual(
    parseGemmaToolCalls("<|tool_call>call:commit_patch{summary:<|\"|>ok"),
    [],
  );
});

test("requires closed, comma-separated, unique arguments", () => {
  assert.throws(
    () => parseGemmaArguments('summary:<|"|>ok'),
    /not closed/,
  );
  assert.throws(
    () => parseGemmaArguments("count:1 valid:true"),
    /Malformed unquoted|comma-separated/,
  );
  assert.throws(
    () => parseGemmaArguments("count:1,count:2"),
    /Duplicate/,
  );
});

test("creates own __proto__ data rather than mutating the result prototype", () => {
  const parsed = parseGemmaArguments('__proto__:<|"|>data<|"|>');
  assert.equal(Object.getPrototypeOf(parsed), Object.prototype);
  assert.equal(Object.hasOwn(parsed, "__proto__"), true);
  assert.equal(parsed.__proto__, "data");
});
