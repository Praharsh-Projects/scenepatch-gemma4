import {
  AutoProcessor,
  Gemma4ForConditionalGeneration,
  RawImage,
  Tensor,
  type Message,
  type ProgressInfo,
} from "@huggingface/transformers";
import { validateModelAudio } from "../lib/model/audio";
import { inspectModelCompatibility } from "../lib/model/compatibility";
import { SCENEPATCH_SYSTEM_PROMPT, SCENEPATCH_USER_PROMPT } from "../lib/model/prompt";
import {
  MAX_NEW_TOKENS,
  MODEL_Q4F16_FILES,
  MODEL_Q4F16_WEIGHT_BYTES,
  MODEL_DEVICE,
  MODEL_DTYPE,
  SCENEPATCH_MODEL_ID,
  SCENEPATCH_MODEL_IDENTIFIER,
  SCENEPATCH_MODEL_REVISION,
  type AnalyzeSceneRequest,
  type ModelErrorCode,
  type ModelLoadProgress,
  type SceneAnalysisResult,
  type ModelWorkerRequest,
  type ModelWorkerResponse,
} from "../lib/model/protocol";
import { parseGemmaToolCalls, SCENEPATCH_TOOL_SCHEMAS } from "../lib/model/tool-calls";

type Processor = Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
type Model = Awaited<ReturnType<typeof Gemma4ForConditionalGeneration.from_pretrained>>;

interface Runtime {
  processor: Processor;
  model: Model;
}

class WorkerRuntimeFailure extends Error {
  constructor(
    readonly code: ModelErrorCode,
    message: string,
    readonly recoverable = true,
  ) {
    super(message);
    this.name = "WorkerRuntimeFailure";
  }
}

const scope = self as unknown as {
  postMessage(message: ModelWorkerResponse): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<ModelWorkerRequest>) => void,
  ): void;
};

let runtime: Runtime | undefined;
let runtimePromise: Promise<Runtime> | undefined;
let requestQueue = Promise.resolve();
const q4f16BytesByFile = new Map<string, number>(
  MODEL_Q4F16_FILES.map((file) => [file.path, file.bytes]),
);
const loadedModelBytesByFile = new Map<string, number>();
let lastProcessorProgress = 0;

function pinnedModelPath(file: string | undefined): string | undefined {
  if (!file) return undefined;
  return MODEL_Q4F16_FILES.find(
    (candidate) =>
      file === candidate.path || file.endsWith(`/${candidate.path}`),
  )?.path;
}

function post(message: ModelWorkerResponse): void {
  scope.postMessage(message);
}

function progressDetail(
  phase: ModelLoadProgress["phase"],
  info: ProgressInfo,
): ModelLoadProgress {
  const reportedProgress = "progress" in info ? info.progress : undefined;
  const loadedBytes = "loaded" in info ? info.loaded : undefined;
  const totalBytes = "total" in info ? info.total : undefined;
  const file = "file" in info ? info.file : undefined;
  const status = info.status;
  let normalizedLoadedBytes = loadedBytes;
  let normalizedTotalBytes = totalBytes;
  let progress: number | undefined;

  if (phase === "model") {
    const modelPath = pinnedModelPath(file);
    if (modelPath) {
      const expected = q4f16BytesByFile.get(modelPath) ?? 0;
      if (status === "done") {
        loadedModelBytesByFile.set(modelPath, expected);
      } else if (typeof loadedBytes === "number") {
        loadedModelBytesByFile.set(
          modelPath,
          Math.min(expected, Math.max(loadedModelBytesByFile.get(modelPath) ?? 0, loadedBytes)),
        );
      }
    }
    normalizedLoadedBytes = [...loadedModelBytesByFile.values()].reduce(
      (sum, bytes) => sum + bytes,
      0,
    );
    normalizedTotalBytes = MODEL_Q4F16_WEIGHT_BYTES;
    progress = Math.min(1, normalizedLoadedBytes / normalizedTotalBytes);
  } else {
    const current =
      typeof loadedBytes === "number" &&
      typeof totalBytes === "number" &&
      totalBytes > 0
        ? loadedBytes / totalBytes
        : typeof reportedProgress === "number"
          ? reportedProgress > 1
            ? reportedProgress / 100
            : reportedProgress
          : lastProcessorProgress;
    lastProcessorProgress = Math.max(
      lastProcessorProgress,
      Math.min(1, Math.max(0, current)),
    );
    progress = lastProcessorProgress;
  }
  const message =
    status === "progress" || status === "progress_total"
      ? `${phase === "processor" ? "Preparing processor" : "Downloading Gemma 4"}${progress === undefined ? "" : ` · ${(progress * 100).toFixed(1)}%`}`
      : status === "done"
        ? `Cached ${file ?? "model asset"}`
        : status === "ready"
          ? "Gemma 4 is ready."
          : `${phase === "processor" ? "Processor" : "Model"}: ${status}`;
  return {
    phase,
    status,
    progress,
    loadedBytes: normalizedLoadedBytes,
    totalBytes: normalizedTotalBytes,
    file,
    message,
  };
}

function emitProgress(
  requestId: string,
  phase: ModelLoadProgress["phase"],
  info: ProgressInfo,
): void {
  // Transformers.js emits an aggregate event followed by an individual-file
  // event. Processor aggregate events are useful; model progress is rebuilt
  // from the eight exact q4f16 files so it cannot jump backward between files.
  if (phase === "processor" && info.status === "progress") return;
  if (phase === "model" && info.status === "progress_total") return;
  if (
    phase === "model" &&
    (info.status === "progress" || info.status === "done") &&
    !pinnedModelPath("file" in info ? info.file : undefined)
  ) {
    return;
  }
  post({
    type: "load-progress",
    requestId,
    progress: progressDetail(phase, info),
  });
}

async function ensureRuntime(requestId: string): Promise<Runtime> {
  if (runtime) return runtime;
  if (!runtimePromise) {
    runtimePromise = (async () => {
      post({
        type: "load-progress",
        requestId,
        progress: {
          phase: "preflight",
          status: "checking",
          message: "Checking WebGPU and local storage…",
        },
      });
      const compatibility = await inspectModelCompatibility({ workerAvailable: true });
      if (!compatibility.supported) {
        const failures = compatibility.checks
          .filter((check) => check.status === "fail")
          .map((check) => check.detail)
          .join(" ");
        throw new WorkerRuntimeFailure(
          "UNSUPPORTED_BROWSER",
          failures || "This browser cannot run the selected Gemma 4 model.",
        );
      }

      const processor = await AutoProcessor.from_pretrained(SCENEPATCH_MODEL_ID, {
        revision: SCENEPATCH_MODEL_REVISION,
        progress_callback: (info: ProgressInfo) =>
          emitProgress(requestId, "processor", info),
      });
      const model = await Gemma4ForConditionalGeneration.from_pretrained(
        SCENEPATCH_MODEL_ID,
        {
          dtype: MODEL_DTYPE,
          device: MODEL_DEVICE,
          revision: SCENEPATCH_MODEL_REVISION,
          progress_callback: (info: ProgressInfo) =>
            emitProgress(requestId, "model", info),
        },
      );
      return { processor, model };
    })();
  }

  try {
    runtime = await runtimePromise;
    post({
      type: "load-progress",
      requestId,
      progress: {
        phase: "ready",
        status: "ready",
        progress: 1,
        message: "Gemma 4 E2B is loaded and ready in this tab.",
      },
    });
    return runtime;
  } catch (error) {
    runtimePromise = undefined;
    if (error instanceof WorkerRuntimeFailure) throw error;
    throw new WorkerRuntimeFailure(
      "MODEL_LOAD_FAILED",
      error instanceof Error ? error.message : "Gemma 4 could not be loaded.",
    );
  }
}

async function analyzeScene(
  request: AnalyzeSceneRequest,
): Promise<SceneAnalysisResult> {
  if (!request.imageMimeType.startsWith("image/") || request.image.byteLength === 0) {
    throw new WorkerRuntimeFailure(
      "INVALID_IMAGE",
      "The model requires a non-empty labeled image contact sheet.",
    );
  }
  try {
    validateModelAudio(request.audio, request.sampleRate);
  } catch (error) {
    throw new WorkerRuntimeFailure(
      "INVALID_AUDIO",
      error instanceof Error ? error.message : "The audio input is invalid.",
    );
  }

  const { processor, model } = await ensureRuntime(request.requestId);
  let image: RawImage;
  try {
    image = await RawImage.fromBlob(
      new Blob([request.image], { type: request.imageMimeType }),
    );
  } catch (error) {
    throw new WorkerRuntimeFailure(
      "INVALID_IMAGE",
      error instanceof Error ? error.message : "The contact sheet could not be decoded.",
    );
  }
  if (image.width !== 1024 || image.height !== 512) {
    throw new WorkerRuntimeFailure(
      "INVALID_IMAGE",
      `Expected a 1024×512 labeled contact sheet; received ${image.width}×${image.height}.`,
    );
  }

  const correction = request.correction?.trim().slice(0, 1_500);
  const userPrompt = correction
    ? `${SCENEPATCH_USER_PROMPT}\nAdditional required check: ${correction}`
    : SCENEPATCH_USER_PROMPT;
  const messages: Message[] = [
    { role: "system", content: SCENEPATCH_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "image" },
        { type: "audio" },
        { type: "text", text: userPrompt },
      ],
    },
  ];
  const prompt = processor.apply_chat_template(messages, {
    tools: SCENEPATCH_TOOL_SCHEMAS as unknown as object[],
    add_generation_prompt: true,
    tokenize: false,
    enable_thinking: false,
  } as Parameters<Processor["apply_chat_template"]>[1] & {
    enable_thinking: boolean;
  }) as unknown as string;

  const startedAt = performance.now();
  try {
    const inputs = await processor(prompt, image, request.audio, {
      add_special_tokens: false,
    });
    const inputLength = inputs.input_ids?.dims?.at(-1);
    if (typeof inputLength !== "number") {
      throw new Error("The processor did not produce input token dimensions.");
    }
    const generated = await model.generate({
      ...inputs,
      max_new_tokens: MAX_NEW_TOKENS,
      do_sample: false,
    });
    if (!(generated instanceof Tensor)) {
      throw new Error("Gemma returned an unexpected generation result.");
    }
    const newTokens = generated.slice(
      null,
      [inputLength, null] as unknown as number[],
    );
    const decoded = processor.batch_decode(newTokens, {
      skip_special_tokens: false,
    });
    const rawOutput = Array.isArray(decoded) ? decoded[0] : String(decoded);
    return {
      rawOutput,
      toolCalls: parseGemmaToolCalls(rawOutput),
      inferenceMs: Math.round((performance.now() - startedAt) * 10) / 10,
      modelId: SCENEPATCH_MODEL_IDENTIFIER,
    };
  } catch (error) {
    throw new WorkerRuntimeFailure(
      "INFERENCE_FAILED",
      error instanceof Error ? error.message : "Gemma 4 inference failed.",
    );
  }
}

async function handleRequest(request: ModelWorkerRequest): Promise<void> {
  try {
    switch (request.type) {
      case "check-compatibility": {
        const compatibility = await inspectModelCompatibility({ workerAvailable: true });
        post({ type: "compatibility-result", requestId: request.requestId, compatibility });
        return;
      }
      case "load-model":
        await ensureRuntime(request.requestId);
        post({
          type: "model-ready",
          requestId: request.requestId,
          modelId: SCENEPATCH_MODEL_IDENTIFIER,
        });
        return;
      case "analyze-scene":
        post({
          type: "analysis-complete",
          requestId: request.requestId,
          result: await analyzeScene(request),
        });
        return;
      default: {
        throw new WorkerRuntimeFailure("UNKNOWN_REQUEST", "Unknown model worker request.");
      }
    }
  } catch (error) {
    const failure =
      error instanceof WorkerRuntimeFailure
        ? error
        : new WorkerRuntimeFailure(
            "INFERENCE_FAILED",
            error instanceof Error ? error.message : "The model worker failed.",
          );
    post({
      type: "model-error",
      requestId: request.requestId,
      error: {
        code: failure.code,
        message: failure.message,
        recoverable: failure.recoverable,
      },
    });
  }
}

scope.addEventListener("message", (event) => {
  // ONNX sessions are shared and generation is stateful; keep worker requests
  // strictly ordered even if the UI dispatches two actions close together.
  requestQueue = requestQueue
    .catch(() => undefined)
    .then(() => handleRequest(event.data));
});
