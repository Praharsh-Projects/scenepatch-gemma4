import assert from "node:assert/strict";
import { test } from "vitest";
import { validateModelAudio } from "../audio";
import { MAX_AUDIO_SAMPLES, MODEL_SAMPLE_RATE } from "../protocol";

test("accepts finite mono PCM at the exact model sample rate", () => {
  assert.doesNotThrow(() =>
    validateModelAudio(new Float32Array(MODEL_SAMPLE_RATE), MODEL_SAMPLE_RATE),
  );
});

test("rejects wrong sample rates, empty audio, and overlong audio", () => {
  assert.throws(() => validateModelAudio(new Float32Array(1), 44_100));
  assert.throws(() => validateModelAudio(new Float32Array(), MODEL_SAMPLE_RATE));
  assert.throws(() =>
    validateModelAudio(
      new Float32Array(MAX_AUDIO_SAMPLES + 1),
      MODEL_SAMPLE_RATE,
    ),
  );
});

test("rejects non-finite samples", () => {
  assert.throws(() =>
    validateModelAudio(new Float32Array([0, Number.NaN]), MODEL_SAMPLE_RATE),
  );
});
