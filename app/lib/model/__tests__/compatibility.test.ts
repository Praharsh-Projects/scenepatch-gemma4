import assert from "node:assert/strict";
import { test } from "vitest";
import {
  inspectModelCompatibility,
  inspectPinnedModelCache,
} from "../compatibility";
import {
  MODEL_Q4F16_FILES,
  MODEL_Q4F16_WEIGHT_BYTES,
  MODEL_STORAGE_RESERVE_BYTES,
  SCENEPATCH_MODEL_ID,
  SCENEPATCH_MODEL_REVISION,
} from "../protocol";

function completeCacheStorage() {
  const files = new Map(
    MODEL_Q4F16_FILES.map((file) => [
      `https://huggingface.co/${SCENEPATCH_MODEL_ID}/resolve/${SCENEPATCH_MODEL_REVISION}/${file.path}`,
      new Response(null, {
        headers: { "content-length": String(file.bytes) },
      }),
    ]),
  );
  return {
    open: async () => ({
      match: async (request: string) => files.get(request),
    }),
  };
}

test("fails closed when WebGPU is unavailable", async () => {
  const result = await inspectModelCompatibility({
    secureContext: true,
    workerAvailable: true,
    navigator: {
      userAgent: "Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36",
      storage: {
        estimate: async () => ({ quota: 10_000_000_000, usage: 0 }),
      },
    },
  });

  assert.equal(result.supported, false);
  assert.equal(
    result.checks.find((check) => check.id === "webgpu")?.status,
    "fail",
  );
});

test("passes a Chromium WebGPU adapter with f16 and adequate storage", async () => {
  const result = await inspectModelCompatibility({
    secureContext: true,
    workerAvailable: true,
    navigator: {
      userAgent: "Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36",
      gpu: {
        requestAdapter: async () => ({
          features: { has: (feature) => feature === "shader-f16" },
          info: { description: "Test adapter" },
        }),
      },
      storage: {
        estimate: async () => ({
          quota: MODEL_STORAGE_RESERVE_BYTES * 2,
          usage: 0,
        }),
        persisted: async () => true,
      },
    },
  });

  assert.equal(result.supported, true);
  assert.equal(result.adapter?.shaderF16, true);
  assert.equal(result.storage?.persisted, true);
});

test("verifies every exact pinned q4f16 cache response", async () => {
  const cache = await inspectPinnedModelCache(completeCacheStorage());
  assert.deepEqual(cache, {
    state: "complete",
    verifiedBytes: MODEL_Q4F16_WEIGHT_BYTES,
    matchedFiles: MODEL_Q4F16_FILES.length,
    totalFiles: MODEL_Q4F16_FILES.length,
  });
});

test("does not require another full model reserve after a verified cache", async () => {
  const result = await inspectModelCompatibility({
    secureContext: true,
    workerAvailable: true,
    cacheStorage: completeCacheStorage(),
    navigator: {
      userAgent: "Mozilla/5.0 Chrome/150.0.0.0 Safari/537.36",
      gpu: {
        requestAdapter: async () => ({
          features: { has: (feature) => feature === "shader-f16" },
        }),
      },
      storage: {
        estimate: async () => ({ quota: 4_000_000_000, usage: 3_500_000_000 }),
      },
    },
  });

  assert.equal(result.cache.state, "complete");
  assert.equal(result.storage?.requiredBytes, 0);
  assert.equal(result.supported, true);
});

test("treats a size mismatch as only a partial cache", async () => {
  const first = MODEL_Q4F16_FILES[0];
  const cache = await inspectPinnedModelCache({
    open: async () => ({
      match: async () =>
        new Response(null, { headers: { "content-length": String(first.bytes - 1) } }),
    }),
  });
  assert.equal(cache.state, "partial");
  assert.equal(cache.verifiedBytes, 0);
});
