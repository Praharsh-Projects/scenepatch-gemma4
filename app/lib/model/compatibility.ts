import {
  MODEL_Q4F16_FILES,
  MODEL_Q4F16_WEIGHT_BYTES,
  MODEL_STORAGE_RESERVE_BYTES,
  SCENEPATCH_MODEL_ID,
  SCENEPATCH_MODEL_REVISION,
  type CompatibilityCheck,
  type ModelCacheStatus,
  type ModelCompatibility,
} from "./protocol";

interface GpuAdapterLike {
  features: { has(feature: string): boolean };
  info?: { description?: string; device?: string };
}

interface NavigatorWithModelCapabilities {
  userAgent?: string;
  gpu?: {
    requestAdapter(options?: {
      powerPreference?: "low-power" | "high-performance";
    }): Promise<GpuAdapterLike | null>;
  };
  storage?: {
    estimate(): Promise<{ quota?: number; usage?: number }>;
    persisted?(): Promise<boolean>;
    persist?(): Promise<boolean>;
  };
}

interface CacheLike {
  match(request: string, options?: { ignoreSearch?: boolean }): Promise<Response | undefined>;
}

interface CacheStorageLike {
  open(name: string): Promise<CacheLike>;
}

export interface CompatibilityOptions {
  /** A worker calls this with true because its existence already proves support. */
  workerAvailable?: boolean;
  navigator?: NavigatorWithModelCapabilities;
  secureContext?: boolean;
  cacheStorage?: CacheStorageLike;
}

const MODEL_CACHE_NAME = "transformers-cache";
const MODEL_CACHE_OVERHEAD_BYTES =
  MODEL_STORAGE_RESERVE_BYTES - MODEL_Q4F16_WEIGHT_BYTES;

function pinnedFileUrl(path: string): string {
  return `https://huggingface.co/${SCENEPATCH_MODEL_ID}/resolve/${encodeURIComponent(SCENEPATCH_MODEL_REVISION)}/${path}`;
}

/** Verify exact q4f16 responses without reading multi-gigabyte bodies. */
export async function inspectPinnedModelCache(
  suppliedCacheStorage?: CacheStorageLike,
): Promise<ModelCacheStatus> {
  const cacheStorage =
    suppliedCacheStorage ??
    (globalThis as typeof globalThis & { caches?: CacheStorageLike }).caches;
  const empty = {
    state: "unknown" as const,
    verifiedBytes: 0,
    matchedFiles: 0,
    totalFiles: MODEL_Q4F16_FILES.length,
  };
  if (!cacheStorage) return empty;

  try {
    const cache = await cacheStorage.open(MODEL_CACHE_NAME);
    let verifiedBytes = 0;
    let matchedFiles = 0;
    for (const file of MODEL_Q4F16_FILES) {
      const response = await cache.match(pinnedFileUrl(file.path), {
        ignoreSearch: true,
      });
      if (!response) continue;
      matchedFiles += 1;
      const reportedBytes = Number(response.headers.get("content-length"));
      if (Number.isFinite(reportedBytes) && reportedBytes === file.bytes) {
        verifiedBytes += file.bytes;
      }
    }

    const complete =
      matchedFiles === MODEL_Q4F16_FILES.length &&
      verifiedBytes === MODEL_Q4F16_WEIGHT_BYTES;
    return {
      state: complete ? "complete" : matchedFiles === 0 ? "none" : "partial",
      verifiedBytes,
      matchedFiles,
      totalFiles: MODEL_Q4F16_FILES.length,
    };
  } catch {
    return empty;
  }
}

function makeCheck(
  id: CompatibilityCheck["id"],
  label: string,
  status: CompatibilityCheck["status"],
  detail: string,
): CompatibilityCheck {
  return { id, label, status, detail };
}

/** Inspect prerequisites without downloading model weights or requesting a GPU device. */
export async function inspectModelCompatibility(
  options: CompatibilityOptions = {},
): Promise<ModelCompatibility> {
  const checks: CompatibilityCheck[] = [];
  const cache = await inspectPinnedModelCache(options.cacheStorage);
  const nav =
    options.navigator ??
    (typeof navigator === "undefined"
      ? undefined
      : (navigator as unknown as NavigatorWithModelCapabilities));
  const secure =
    options.secureContext ??
    (typeof isSecureContext === "boolean" ? isSecureContext : false);
  const workerAvailable =
    options.workerAvailable ?? typeof globalThis.Worker !== "undefined";

  checks.push(
    makeCheck(
      "secure-context",
      "Secure context",
      secure ? "pass" : "fail",
      secure
        ? "HTTPS or localhost is active."
        : "WebGPU requires HTTPS or localhost.",
    ),
  );

  checks.push(
    makeCheck(
      "model-cache",
      "Pinned model cache",
      cache.state === "complete" ? "pass" : "warn",
      cache.state === "complete"
        ? "All eight pinned q4f16 files are verified in the browser cache."
        : cache.state === "partial"
          ? `${cache.matchedFiles} of ${cache.totalFiles} pinned q4f16 files are present; loading will resume from cached files.`
          : cache.state === "none"
            ? "The pinned q4f16 files are not cached yet; the first load needs a network connection."
            : "Browser cache contents could not be verified.",
    ),
  );

  const userAgent = nav?.userAgent ?? "";
  const chromium = /(Chrome|Chromium|Edg)\//.test(userAgent) && !/OPR\//.test(userAgent);
  checks.push(
    makeCheck(
      "chromium",
      "Current Chromium browser",
      chromium ? "pass" : "fail",
      chromium
        ? "A Chromium-family browser is active."
        : "Use a current desktop Chrome or Edge build for this WebGPU demo.",
    ),
  );

  checks.push(
    makeCheck(
      "worker",
      "Dedicated workers",
      workerAvailable ? "pass" : "fail",
      workerAvailable
        ? "Model work can run off the interface thread."
        : "Dedicated workers are unavailable.",
    ),
  );

  if (!nav?.gpu) {
    checks.push(
      makeCheck(
        "webgpu",
        "WebGPU",
        "fail",
        "navigator.gpu is unavailable. Enable WebGPU or update Chrome.",
      ),
    );
    return {
      supported: false,
      checks,
      cache,
      storage: {
        requiredBytes:
          cache.state === "complete" ? 0 : MODEL_STORAGE_RESERVE_BYTES,
      },
    };
  }
  checks.push(makeCheck("webgpu", "WebGPU", "pass", "navigator.gpu is available."));

  let adapter: GpuAdapterLike | null = null;
  try {
    adapter = await nav.gpu.requestAdapter({ powerPreference: "high-performance" });
  } catch {
    // The explicit adapter check below communicates the actionable failure.
  }
  checks.push(
    makeCheck(
      "adapter",
      "GPU adapter",
      adapter ? "pass" : "fail",
      adapter ? "A WebGPU adapter is available." : "No compatible GPU adapter was found.",
    ),
  );

  const shaderF16 = adapter?.features.has("shader-f16") ?? false;
  checks.push(
    makeCheck(
      "shader-f16",
      "16-bit GPU shaders",
      shaderF16 ? "pass" : "fail",
      shaderF16
        ? "shader-f16 is supported for q4f16 inference."
        : "This GPU does not expose shader-f16, which q4f16 inference requires.",
    ),
  );

  let storage: ModelCompatibility["storage"] = {
    requiredBytes:
      cache.state === "complete"
        ? 0
        : Math.min(
            MODEL_STORAGE_RESERVE_BYTES,
            MODEL_Q4F16_WEIGHT_BYTES - cache.verifiedBytes +
              MODEL_CACHE_OVERHEAD_BYTES,
          ),
  };
  if (nav.storage) {
    try {
      const [estimate, persisted] = await Promise.all([
        nav.storage.estimate(),
        nav.storage.persisted?.() ?? Promise.resolve(false),
      ]);
      const availableBytes =
        estimate.quota === undefined
          ? undefined
          : Math.max(0, estimate.quota - (estimate.usage ?? 0));
      storage = {
        quotaBytes: estimate.quota,
        usageBytes: estimate.usage,
        availableBytes,
        persisted,
        requiredBytes: storage.requiredBytes,
      };
      const insufficient =
        availableBytes !== undefined &&
        availableBytes < storage.requiredBytes;
      checks.push(
        makeCheck(
          "storage",
          "Model storage",
          insufficient ? "fail" : availableBytes === undefined ? "warn" : "pass",
          insufficient
            ? `The browser reports less than ${(storage.requiredBytes / 1_000_000_000).toFixed(2)} GB available for the remaining model cache.`
            : availableBytes === undefined
              ? "The browser did not report a storage quota; loading may still fail."
              : `${(availableBytes / 1_000_000_000).toFixed(1)} GB is available to this origin.`,
        ),
      );
    } catch {
      checks.push(
        makeCheck(
          "storage",
          "Model storage",
          "warn",
          "Storage quota could not be measured; loading may still fail.",
        ),
      );
    }
  } else {
    checks.push(
      makeCheck(
        "storage",
        "Model storage",
        "warn",
        "Browser storage estimation is unavailable.",
      ),
    );
  }

  return {
    supported: !checks.some((check) => check.status === "fail"),
    checks,
    cache,
    storage,
    adapter: adapter
      ? {
          description: adapter.info?.description ?? adapter.info?.device,
          shaderF16,
        }
      : undefined,
  };
}

/** Ask the browser to make its model cache less likely to be evicted. */
export async function requestPersistentModelStorage(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const storage = (navigator as unknown as NavigatorWithModelCapabilities).storage;
  if (!storage?.persist) return false;
  return storage.persist();
}
