export const SCENEPATCH_MODEL_ID =
  "onnx-community/gemma-4-E2B-it-ONNX" as const;
export const SCENEPATCH_MODEL_REVISION =
  "9f4bef82ea6e296bc69f8a2f5939f73af81b07a6" as const;
export const SCENEPATCH_MODEL_IDENTIFIER =
  `${SCENEPATCH_MODEL_ID}@${SCENEPATCH_MODEL_REVISION}` as const;

/** Exact q4f16 ONNX files at the pinned revision (verified 31 July 2026). */
export const MODEL_Q4F16_FILES = [
  { path: "onnx/audio_encoder_q4f16.onnx", bytes: 260_446 },
  { path: "onnx/audio_encoder_q4f16.onnx_data", bytes: 171_258_112 },
  { path: "onnx/decoder_model_merged_q4f16.onnx", bytes: 673_231 },
  { path: "onnx/decoder_model_merged_q4f16.onnx_data", bytes: 1_519_700_992 },
  { path: "onnx/embed_tokens_q4f16.onnx", bytes: 5_621 },
  { path: "onnx/embed_tokens_q4f16.onnx_data", bytes: 1_590_689_792 },
  { path: "onnx/vision_encoder_q4f16.onnx", bytes: 189_124 },
  { path: "onnx/vision_encoder_q4f16.onnx_data", bytes: 99_189_440 },
] as const;

// Processor files and cache metadata add a small amount to the first-run
// transfer. Keep this explicit total stable for release evidence and tests.
export const MODEL_Q4F16_WEIGHT_BYTES = 3_381_966_758;
// Compatibility preflight reserves extra browser quota beyond the weight files.
export const MODEL_STORAGE_RESERVE_BYTES = 3_650_000_000;
