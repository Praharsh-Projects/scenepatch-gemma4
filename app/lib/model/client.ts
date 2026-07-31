import {
  MODEL_SAMPLE_RATE,
  type AnalysisCompleteResponse,
  type AnalyzeSceneRequest,
  type CompatibilityResultResponse,
  type LoadProgressResponse,
  type ModelErrorResponse,
  type ModelReadyResponse,
  type ModelWorkerEvent,
  type ModelWorkerRequest,
  type SceneAnalysisResult,
} from "./protocol";
import { validateModelAudio } from "./audio";

type TerminalResponse =
  | CompatibilityResultResponse
  | ModelReadyResponse
  | AnalysisCompleteResponse;

interface PendingRequest {
  resolve: (response: TerminalResponse) => void;
  reject: (error: ModelRuntimeError) => void;
  timeout?: ReturnType<typeof setTimeout>;
}

const COMPATIBILITY_TIMEOUT_MS = 30_000;
const ANALYSIS_TIMEOUT_MS = 15 * 60_000;

export interface AnalyzeSceneInput {
  image: Blob | ArrayBuffer;
  imageMimeType?: string;
  audio: Float32Array;
  sampleRate: typeof MODEL_SAMPLE_RATE;
  correction?: string;
}

export type ModelEventListener = (event: ModelWorkerEvent) => void;

export class ModelRuntimeError extends Error {
  readonly code: ModelErrorResponse["error"]["code"];
  readonly recoverable: boolean;

  constructor(error: ModelErrorResponse["error"]) {
    super(error.message);
    this.name = "ModelRuntimeError";
    this.code = error.code;
    this.recoverable = error.recoverable;
  }
}

function newRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `model-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class GemmaWorkerClient {
  private worker: Worker;
  private readonly listeners = new Set<ModelEventListener>();
  private readonly pending = new Map<string, PendingRequest>();
  private terminated = false;
  private consecutiveWorkerFailures = 0;

  constructor() {
    this.worker = this.createWorker();
  }

  private createWorker(): Worker {
    const worker = new Worker(
      new URL("../../workers/gemma.worker.ts", import.meta.url),
      { type: "module", name: "scenepatch-gemma" },
    );
    worker.addEventListener("message", this.handleMessage);
    worker.addEventListener("error", this.handleWorkerError);
    return worker;
  }

  private detachWorker(worker: Worker): void {
    worker.removeEventListener("message", this.handleMessage);
    worker.removeEventListener("error", this.handleWorkerError);
  }

  subscribe(listener: ModelEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async checkCompatibility() {
    const response = await this.request<CompatibilityResultResponse>({
      type: "check-compatibility",
      requestId: newRequestId(),
    }, [], COMPATIBILITY_TIMEOUT_MS);
    return response.compatibility;
  }

  async load(): Promise<ModelReadyResponse> {
    return this.request<ModelReadyResponse>({
      type: "load-model",
      requestId: newRequestId(),
    });
  }

  async analyze(input: AnalyzeSceneInput): Promise<SceneAnalysisResult> {
    validateModelAudio(input.audio, input.sampleRate);
    const image =
      input.image instanceof Blob
        ? await input.image.arrayBuffer()
        : input.image.slice(0);
    if (image.byteLength === 0) throw new RangeError("The contact sheet is empty.");

    // Copy into tightly sized transferable buffers so the caller's media stays usable.
    const audio = Float32Array.from(input.audio);
    const request: AnalyzeSceneRequest = {
      type: "analyze-scene",
      requestId: newRequestId(),
      image,
      imageMimeType:
        input.imageMimeType ??
        (input.image instanceof Blob ? input.image.type : "image/jpeg"),
      audio,
      sampleRate: MODEL_SAMPLE_RATE,
      correction: input.correction,
    };
    const response = await this.request<AnalysisCompleteResponse>(
      request,
      [image, audio.buffer],
      ANALYSIS_TIMEOUT_MS,
    );
    return response.result;
  }

  terminate(): void {
    if (this.terminated) return;
    this.terminated = true;
    this.detachWorker(this.worker);
    this.worker.terminate();
    const error = new ModelRuntimeError({
      code: "WORKER_TERMINATED",
      message: "The Gemma worker was terminated.",
      recoverable: true,
    });
    for (const pending of this.pending.values()) {
      if (pending.timeout) clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
  }

  private request<T extends TerminalResponse>(
    request: ModelWorkerRequest,
    transfer: Transferable[] = [],
    timeoutMs?: number,
  ): Promise<T> {
    if (this.terminated) {
      return Promise.reject(
        new ModelRuntimeError({
          code: "WORKER_TERMINATED",
          message: "The Gemma worker has already been terminated.",
          recoverable: true,
        }),
      );
    }
    return new Promise<T>((resolve, reject) => {
      const pending: PendingRequest = {
        resolve: (response) => resolve(response as T),
        reject,
      };
      if (timeoutMs) {
        pending.timeout = setTimeout(() => {
          if (!this.pending.delete(request.requestId)) return;
          reject(
            new ModelRuntimeError({
              code:
                request.type === "analyze-scene"
                  ? "INFERENCE_TIMEOUT"
                  : "INFERENCE_FAILED",
              message:
                request.type === "analyze-scene"
                  ? "Gemma inference exceeded 15 minutes and was stopped safely."
                  : "The browser compatibility check timed out.",
              recoverable: true,
            }),
          );
          if (request.type === "analyze-scene") this.replaceWorker();
        }, timeoutMs);
      }
      this.pending.set(request.requestId, pending);
      this.worker.postMessage(request, transfer);
    });
  }

  private handleMessage = (event: MessageEvent<ModelWorkerEvent>): void => {
    const response = event.data;
    this.consecutiveWorkerFailures = 0;
    for (const listener of this.listeners) listener(response);
    if (response.type === "load-progress") return;

    const pending = this.pending.get(response.requestId);
    if (!pending) return;
    this.pending.delete(response.requestId);
    if (pending.timeout) clearTimeout(pending.timeout);
    if (response.type === "model-error") {
      pending.reject(new ModelRuntimeError(response.error));
    } else {
      pending.resolve(response);
    }
  };

  private handleWorkerError = (event: ErrorEvent): void => {
    const error = new ModelRuntimeError({
      code: "INFERENCE_FAILED",
      message: event.message || "The Gemma worker stopped unexpectedly.",
      recoverable: true,
    });
    for (const pending of this.pending.values()) {
      if (pending.timeout) clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
    this.consecutiveWorkerFailures += 1;
    if (!this.terminated && this.consecutiveWorkerFailures <= 1) {
      this.replaceWorker();
    } else {
      const failedWorker = this.worker;
      this.detachWorker(failedWorker);
      failedWorker.terminate();
      this.terminated = true;
    }
  };

  private replaceWorker(): void {
    const previous = this.worker;
    this.detachWorker(previous);
    previous.terminate();
    if (!this.terminated) this.worker = this.createWorker();
  }
}

export type { LoadProgressResponse };
