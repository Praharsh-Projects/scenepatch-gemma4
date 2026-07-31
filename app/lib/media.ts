import type { Sha256Digest } from "./core";

export const CONTACT_SHEET_WIDTH = 1024;
export const CONTACT_SHEET_HEIGHT = 512;
export const AUDIO_SAMPLE_RATE = 16_000;
export const MAX_AUDIO_SECONDS = 10;
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 8_192;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const THUMBNAIL_SIZE = 256;

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type FixtureVariant = "blocked" | "clean" | "uncertain";

export interface ContactSheetResult {
  blob: Blob;
  dataUrl: string;
  thumbnailHashes: {
    before: Sha256Digest;
    after: Sha256Digest;
  };
  width: number;
  height: number;
}

export function validateImageBlob(blob: Blob): void {
  if (!ACCEPTED_IMAGE_TYPES.has(blob.type)) {
    throw new TypeError("Images must be PNG, JPEG, or WebP files.");
  }
  if (blob.size === 0) {
    throw new RangeError("The selected image is empty.");
  }
  if (blob.size > MAX_IMAGE_BYTES) {
    throw new RangeError("Keep each image at or below 20 MB.");
  }
}

export function validateImageDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new RangeError("The selected image has invalid dimensions.");
  }
  if (
    width > MAX_IMAGE_EDGE ||
    height > MAX_IMAGE_EDGE ||
    width * height > MAX_IMAGE_PIXELS
  ) {
    throw new RangeError(
      "Keep each image within 8192 px per edge and 40 megapixels.",
    );
  }
}

function fileToImage(file: Blob): Promise<HTMLImageElement> {
  validateImageBlob(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      try {
        validateImageDimensions(image.naturalWidth || image.width, image.naturalHeight || image.height);
        resolve(image);
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected image could not be decoded."));
    };
    image.src = url;
  });
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  const offsetX = x + (width - renderedWidth) / 2;
  const offsetY = y + (height - renderedHeight) / 2;
  context.drawImage(image, offsetX, offsetY, renderedWidth, renderedHeight);
}

async function digestBlob(blob: Blob): Promise<Sha256Digest> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  const hex = Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return `sha256:${hex}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Canvas export failed."))),
      type,
      quality,
    );
  });
}

async function thumbnailHash(image: HTMLImageElement): Promise<Sha256Digest> {
  const canvas = document.createElement("canvas");
  canvas.width = THUMBNAIL_SIZE;
  canvas.height = THUMBNAIL_SIZE;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas rendering is unavailable in this browser.");
  context.fillStyle = "#101412";
  context.fillRect(0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  drawCover(
    context,
    image,
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    0,
    0,
    THUMBNAIL_SIZE,
    THUMBNAIL_SIZE,
  );
  return digestBlob(await canvasToBlob(canvas, "image/webp", 0.82));
}

export async function createContactSheet(
  before: Blob,
  after: Blob,
): Promise<ContactSheetResult> {
  const [beforeImage, afterImage] = await Promise.all([
    fileToImage(before),
    fileToImage(after),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = CONTACT_SHEET_WIDTH;
  canvas.height = CONTACT_SHEET_HEIGHT;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas rendering is unavailable in this browser.");

  context.fillStyle = "#101412";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawCover(context, beforeImage, beforeImage.width, beforeImage.height, 0, 0, 512, 512);
  drawCover(context, afterImage, afterImage.width, afterImage.height, 512, 0, 512, 512);

  context.fillStyle = "rgba(10, 14, 12, 0.88)";
  context.fillRect(0, 0, 512, 58);
  context.fillRect(512, 0, 512, 58);
  context.fillStyle = "#d8ff63";
  context.font = "700 22px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.fillText("BEFORE · BASE", 24, 37);
  context.fillStyle = "#8ad9ff";
  context.fillText("AFTER · WORKTREE", 536, 37);
  context.strokeStyle = "#ffffff";
  context.globalAlpha = 0.4;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(512, 0);
  context.lineTo(512, 512);
  context.stroke();
  context.globalAlpha = 1;

  const [blob, beforeThumbnailHash, afterThumbnailHash] = await Promise.all([
    canvasToBlob(canvas, "image/webp", 0.9),
    thumbnailHash(beforeImage),
    thumbnailHash(afterImage),
  ]);

  return {
    blob,
    dataUrl: canvas.toDataURL("image/webp", 0.9),
    thumbnailHashes: {
      before: beforeThumbnailHash,
      after: afterThumbnailHash,
    },
    width: CONTACT_SHEET_WIDTH,
    height: CONTACT_SHEET_HEIGHT,
  };
}

export async function decodeAudioToMono16k(blob: Blob): Promise<Float32Array> {
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) throw new Error("Audio decoding is unavailable.");
  const context = new AudioContextConstructor({ sampleRate: AUDIO_SAMPLE_RATE });
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    if (decoded.duration > MAX_AUDIO_SECONDS + 0.15) {
      throw new Error(`Keep the spoken intent under ${MAX_AUDIO_SECONDS} seconds.`);
    }
    const sampleCount = Math.min(
      Math.ceil(decoded.duration * AUDIO_SAMPLE_RATE),
      AUDIO_SAMPLE_RATE * MAX_AUDIO_SECONDS,
    );
    const mono = new Float32Array(sampleCount);
    for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
      const source = decoded.getChannelData(channel);
      const ratio = decoded.sampleRate / AUDIO_SAMPLE_RATE;
      for (let index = 0; index < sampleCount; index += 1) {
        const sourceIndex = Math.min(source.length - 1, Math.floor(index * ratio));
        mono[index] += source[sourceIndex] / decoded.numberOfChannels;
      }
    }
    return mono;
  } finally {
    await context.close();
  }
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawMarker(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  rotation = 0,
  scale = 1,
) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.scale(scale, scale);
  context.shadowColor = "rgba(20, 28, 24, .25)";
  context.shadowBlur = 12;
  context.shadowOffsetY = 7;
  roundedRect(context, -12, -74, 24, 148, 10);
  context.fillStyle = color;
  context.fill();
  context.shadowColor = "transparent";
  context.fillStyle = "#151a17";
  context.fillRect(-12, -74, 24, 19);
  context.fillStyle = "rgba(255,255,255,.65)";
  context.fillRect(-4, -48, 4, 72);
  context.restore();
}

function drawArtDesk(canvas: HTMLCanvasElement, variant: "before" | FixtureVariant) {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas rendering is unavailable.");
  context.fillStyle = "#d9cbb4";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(58, 45, 31, .08)";
  context.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 32) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 32) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  context.save();
  context.shadowColor = "rgba(20, 28, 24, .23)";
  context.shadowBlur = 22;
  context.shadowOffsetY = 12;
  roundedRect(context, 156, 150, 300, 260, 12);
  context.fillStyle = "#fffdf6";
  context.fill();
  context.restore();
  context.strokeStyle = "#202621";
  context.lineWidth = 4;
  context.strokeRect(169, 168, 274, 224);
  context.strokeStyle = "rgba(32, 38, 33, .16)";
  context.lineWidth = 2;
  for (let y = 198; y < 380; y += 30) {
    context.beginPath();
    context.moveTo(190, y);
    context.lineTo(420, y);
    context.stroke();
  }

  context.save();
  context.translate(302, 58);
  context.rotate(-0.05);
  context.fillStyle = "#ffd84f";
  context.shadowColor = "rgba(20, 28, 24, .18)";
  context.shadowBlur = 10;
  context.shadowOffsetY = 6;
  context.fillRect(-65, -47, 130, 94);
  context.fillStyle = "rgba(255,255,255,.42)";
  context.fillRect(-51, -31, 102, 4);
  context.restore();

  if (variant === "before") {
    drawMarker(context, 106, 286, "#f04f4f", -0.02, 1.12);
  } else {
    drawMarker(context, 304, 125, "#f04f4f", Math.PI / 2, 1.12);
  }
  if (variant !== "blocked") {
    drawMarker(context, 494, 290, "#2868f0", 0.04, 1.32);
  }
  if (variant === "uncertain") {
    context.fillStyle = "rgba(238, 232, 215, .94)";
    context.fillRect(384, 132, 240, 320);
    context.fillStyle = "#202621";
    context.font = "700 18px ui-monospace, monospace";
    context.fillText("OCCLUDED", 450, 300);
  }
}

function canvasToFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Fixture generation failed."));
      resolve(new File([blob], name, { type: "image/png" }));
    }, "image/png");
  });
}

export async function createSyntheticArtDeskFixture(variant: FixtureVariant) {
  const beforeCanvas = document.createElement("canvas");
  const afterCanvas = document.createElement("canvas");
  beforeCanvas.width = afterCanvas.width = 640;
  beforeCanvas.height = afterCanvas.height = 512;
  drawArtDesk(beforeCanvas, "before");
  drawArtDesk(afterCanvas, variant);
  return {
    before: await canvasToFile(beforeCanvas, "scenepatch-before.png"),
    after: await canvasToFile(afterCanvas, `scenepatch-after-${variant}.png`),
  };
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const order = Math.min(Math.floor(Math.log(bytes) / Math.log(1000)), units.length - 1);
  return `${(bytes / 1000 ** order).toFixed(order > 2 ? 1 : 0)} ${units[order]}`;
}
