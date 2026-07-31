import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CONTACT_SHEET_HEIGHT,
  CONTACT_SHEET_WIDTH,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_EDGE,
  createContactSheet,
  validateImageBlob,
  validateImageDimensions,
} from "../media";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("UI media bounds", () => {
  it("accepts only bounded PNG, JPEG, and WebP images", () => {
    expect(() => validateImageBlob(new Blob(["ok"], { type: "image/png" }))).not.toThrow();
    expect(() => validateImageBlob(new Blob([], { type: "image/jpeg" }))).toThrow(/empty/i);
    expect(() => validateImageBlob(new Blob(["gif"], { type: "image/gif" }))).toThrow(/PNG, JPEG, or WebP/i);

    const oversized = new Blob([new Uint8Array(MAX_IMAGE_BYTES + 1)], {
      type: "image/webp",
    });
    expect(() => validateImageBlob(oversized)).toThrow(/20 MB/i);
  });

  it("rejects invalid, oversized, and excessive-pixel dimensions", () => {
    expect(() => validateImageDimensions(640, 512)).not.toThrow();
    expect(() => validateImageDimensions(0, 512)).toThrow(/invalid dimensions/i);
    expect(() => validateImageDimensions(MAX_IMAGE_EDGE + 1, 512)).toThrow(/8192 px/i);
    expect(() => validateImageDimensions(8_000, 8_000)).toThrow(/40 megapixels/i);
  });
});

describe("contact-sheet generation", () => {
  it("renders one 1024x512 sheet and hashes normalized per-scene thumbnails", async () => {
    const textCalls: string[] = [];

    class MockImage {
      width = 640;
      height = 512;
      naturalWidth = 640;
      naturalHeight = 512;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    class MockCanvas {
      width = 0;
      height = 0;
      private readonly context = {
        fillStyle: "",
        strokeStyle: "",
        globalAlpha: 1,
        lineWidth: 1,
        font: "",
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        fillText: vi.fn((text: string) => textCalls.push(text)),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      };

      getContext() {
        return this.context;
      }

      toBlob(callback: BlobCallback, type = "image/png") {
        callback(new Blob([`${this.width}x${this.height}`], { type }));
      }

      toDataURL() {
        return "data:image/webp;base64,bW9jaw==";
      }
    }

    vi.stubGlobal("Image", MockImage);
    vi.stubGlobal("document", {
      createElement: (name: string) => {
        if (name !== "canvas") throw new Error(`Unexpected element: ${name}`);
        return new MockCanvas();
      },
    });

    const result = await createContactSheet(
      new Blob(["before"], { type: "image/png" }),
      new Blob(["after"], { type: "image/webp" }),
    );

    expect(result.width).toBe(CONTACT_SHEET_WIDTH);
    expect(result.height).toBe(CONTACT_SHEET_HEIGHT);
    expect(result.blob.type).toBe("image/webp");
    expect(result.dataUrl).toMatch(/^data:image\/webp/);
    expect(result.thumbnailHashes.before).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(result.thumbnailHashes.after).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(textCalls).toEqual(["BEFORE · BASE", "AFTER · WORKTREE"]);
  });
});
