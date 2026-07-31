import {
  MODEL_Q4F16_FILES,
  MODEL_Q4F16_WEIGHT_BYTES,
  MODEL_STORAGE_RESERVE_BYTES,
  SCENEPATCH_MODEL_ID,
  SCENEPATCH_MODEL_IDENTIFIER,
  SCENEPATCH_MODEL_REVISION,
} from "../model-info";

export {
  MODEL_Q4F16_FILES,
  MODEL_Q4F16_WEIGHT_BYTES,
  MODEL_STORAGE_RESERVE_BYTES,
  SCENEPATCH_MODEL_ID,
  SCENEPATCH_MODEL_IDENTIFIER,
  SCENEPATCH_MODEL_REVISION,
};
export const MODEL_DTYPE = "q4f16" as const;
export const MODEL_DEVICE = "webgpu" as const;
export const MODEL_SAMPLE_RATE = 16_000 as const;
export const MAX_AUDIO_SECONDS = 10;
export const MAX_AUDIO_SAMPLES = MODEL_SAMPLE_RATE * MAX_AUDIO_SECONDS;
export const MAX_NEW_TOKENS = 128;

export type ModelToolName =
  | "record_change"
  | "commit_patch"
  | "block_commit";

export type RawToolValue = string | number | boolean | null;

/** A syntactically parsed call. The caller must still allowlist and validate it. */
export interface ParsedToolCall {
  name: string;
  arguments: Record<string, RawToolValue>;
}

export interface CompatibilityCheck {
  id:
    | "secure-context"
    | "chromium"
    | "worker"
    | "webgpu"
    | "adapter"
    | "shader-f16"
    | "model-cache"
    | "storage";
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface ModelCacheStatus {
  state: "none" | "partial" | "complete" | "unknown";
  verifiedBytes: number;
  matchedFiles: number;
  totalFiles: number;
}

export interface ModelCompatibility {
  supported: boolean;
  checks: CompatibilityCheck[];
  cache: ModelCacheStatus;
  storage?: {
    quotaBytes?: number;
    usageBytes?: number;
    availableBytes?: number;
    persisted?: boolean;
    requiredBytes: number;
  };
  adapter?: {
    description?: string;
    shaderF16: boolean;
  };
}

export interface ModelLoadProgress {
  phase: "preflight" | "processor" | "model" | "ready";
  status: string;
  progress?: number;
  loadedBytes?: number;
  totalBytes?: number;
  file?: string;
  message: string;
}

export interface CheckCompatibilityRequest {
  type: "check-compatibility";
  requestId: string;
}

export interface LoadModelRequest {
  type: "load-model";
  requestId: string;
}

export interface AnalyzeSceneRequest {
  type: "analyze-scene";
  requestId: string;
  /** One already-labeled BEFORE/AFTER contact sheet. */
  image: ArrayBuffer;
  imageMimeType: string;
  /** Mono PCM samples, transferred to the worker. */
  audio: Float32Array;
  sampleRate: typeof MODEL_SAMPLE_RATE;
  /** Optional executor feedback for the single fail-closed correction attempt. */
  correction?: string;
}

export type ModelWorkerRequest =
  | CheckCompatibilityRequest
  | LoadModelRequest
  | AnalyzeSceneRequest;

export interface CompatibilityResultResponse {
  type: "compatibility-result";
  requestId: string;
  compatibility: ModelCompatibility;
}

export interface LoadProgressResponse {
  type: "load-progress";
  requestId: string;
  progress: ModelLoadProgress;
}

export interface ModelReadyResponse {
  type: "model-ready";
  requestId: string;
  modelId: typeof SCENEPATCH_MODEL_IDENTIFIER;
}

export interface SceneAnalysisResult {
  rawOutput: string;
  toolCalls: ParsedToolCall[];
  inferenceMs: number;
  modelId: typeof SCENEPATCH_MODEL_IDENTIFIER;
}

export interface AnalysisCompleteResponse {
  type: "analysis-complete";
  requestId: string;
  result: SceneAnalysisResult;
}

export type ModelErrorCode =
  | "UNSUPPORTED_BROWSER"
  | "MODEL_LOAD_FAILED"
  | "INVALID_IMAGE"
  | "INVALID_AUDIO"
  | "INFERENCE_FAILED"
  | "INFERENCE_TIMEOUT"
  | "WORKER_TERMINATED"
  | "UNKNOWN_REQUEST";

export interface ModelErrorResponse {
  type: "model-error";
  requestId: string;
  error: {
    code: ModelErrorCode;
    message: string;
    recoverable: boolean;
  };
}

export type ModelWorkerResponse =
  | CompatibilityResultResponse
  | LoadProgressResponse
  | ModelReadyResponse
  | AnalysisCompleteResponse
  | ModelErrorResponse;

export type ModelWorkerEvent = ModelWorkerResponse;
