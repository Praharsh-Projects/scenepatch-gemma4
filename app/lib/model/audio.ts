import {
  MAX_AUDIO_SAMPLES,
  MAX_AUDIO_SECONDS,
  MODEL_SAMPLE_RATE,
} from "./protocol";

export function validateModelAudio(
  samples: Float32Array,
  sampleRate: number,
): void {
  if (!(samples instanceof Float32Array)) {
    throw new TypeError("Audio must be mono Float32 PCM samples.");
  }
  if (sampleRate !== MODEL_SAMPLE_RATE) {
    throw new RangeError(`Audio must be ${MODEL_SAMPLE_RATE} Hz.`);
  }
  if (samples.length === 0) {
    throw new RangeError("Audio must contain at least one sample.");
  }
  if (samples.length > MAX_AUDIO_SAMPLES) {
    throw new RangeError(`Audio must be ${MAX_AUDIO_SECONDS} seconds or shorter.`);
  }
  for (let index = 0; index < samples.length; index += 1) {
    if (!Number.isFinite(samples[index])) {
      throw new RangeError("Audio samples must contain only finite values.");
    }
  }
}
