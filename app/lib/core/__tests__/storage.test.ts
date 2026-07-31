import { indexedDB } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";

import {
  PATCH_EXPORT_FORMAT,
  PATCH_SCHEMA_VERSION,
  SCENEPATCH_MODEL_ID,
  ScenePatchRepository,
  createPatchDraft,
  parsePatchExport,
  serializePatchExport,
  sha256Bytes,
  type PatchDraft,
} from "../index";

const repositories: ScenePatchRepository[] = [];

function repository(): ScenePatchRepository {
  const instance = new ScenePatchRepository({
    databaseName: `scenepatch-test-${crypto.randomUUID()}`,
    indexedDB,
  });
  repositories.push(instance);
  return instance;
}

function draft(overrides: Partial<PatchDraft> = {}): PatchDraft {
  return createPatchDraft({
    id: crypto.randomUUID(),
    createdAt: "2026-07-31T12:00:00.000Z",
    modelId: SCENEPATCH_MODEL_ID,
    intentSummary: "Move the red marker above the sketchbook",
    thumbnailHashes: {
      before: `sha256:${"a".repeat(64)}`,
      after: `sha256:${"b".repeat(64)}`,
    },
    changes: [
      {
        description: "Red marker moved above the sketchbook",
        classification: "intended",
      },
    ],
    decision: "commit_proposed",
    terminalMessage: "Move red marker above the sketchbook",
    inferenceMs: 4_250,
    ...overrides,
  });
}

afterEach(async () => {
  await Promise.all(repositories.splice(0).map((instance) => instance.close()));
});

describe("ScenePatchRepository", () => {
  it("stores only through the explicit confirmation API", async () => {
    const store = repository();
    const patch = draft();

    const saved = await store.saveConfirmed(patch, {
      confirmed: true,
      retainImages: false,
    });

    expect(saved).toMatchObject({
      ...patch,
      schemaVersion: PATCH_SCHEMA_VERSION,
    });
    expect(saved.confirmedAt).toMatch(/Z$/);
    expect(saved).not.toHaveProperty("retainedImages");
    await expect(store.get(patch.id)).resolves.toEqual(saved);
    await expect(store.list()).resolves.toEqual([saved]);
  });

  it("retains images only when confirmation explicitly requests it", async () => {
    const store = repository();
    const before = new Blob(["before"], { type: "image/webp" });
    const after = new Blob(["after"], { type: "image/webp" });

    const saved = await store.saveConfirmed(draft(), {
      confirmed: true,
      retainImages: true,
      images: { before, after },
    });

    expect(saved.retainedImages?.before.size).toBe(before.size);
    expect(saved.retainedImages?.after.size).toBe(after.size);
  });

  it("rejects blocked, empty, or non-intended drafts even through confirmation", async () => {
    const store = repository();

    await expect(
      store.saveConfirmed(draft({ decision: "blocked" }), {
        confirmed: true,
        retainImages: false,
      }),
    ).rejects.toMatchObject({ code: "write_failed" });
    await expect(
      store.saveConfirmed(draft({ changes: [] }), {
        confirmed: true,
        retainImages: false,
      }),
    ).rejects.toMatchObject({ code: "write_failed" });
    await expect(
      store.saveConfirmed(
        draft({
          changes: [
            {
              description: "Blue marker is missing",
              classification: "unexplained",
            },
          ],
        }),
        { confirmed: true, retainImages: false },
      ),
    ).rejects.toMatchObject({ code: "write_failed" });
    await expect(store.list()).resolves.toEqual([]);
  });

  it("rejects duplicate patch ids and supports removal", async () => {
    const store = repository();
    const patch = draft();
    await store.saveConfirmed(patch, {
      confirmed: true,
      retainImages: false,
    });

    await expect(
      store.saveConfirmed(patch, { confirmed: true, retainImages: false }),
    ).rejects.toMatchObject({
      code: "duplicate_id",
    });

    await store.remove(patch.id);
    await expect(store.get(patch.id)).resolves.toBeUndefined();
  });

  it("exports metadata without retained private images", async () => {
    const store = repository();
    await store.saveConfirmed(draft(), {
      confirmed: true,
      retainImages: true,
      images: {
        before: new Blob(["before"]),
        after: new Blob(["after"]),
      },
    });

    const exported = parsePatchExport(await store.exportJson());
    expect(exported.format).toBe(PATCH_EXPORT_FORMAT);
    expect(exported.patches).toHaveLength(1);
    expect(exported.patches[0]).not.toHaveProperty("retainedImages");
  });

  it("imports atomically and skips ids already in local history", async () => {
    const source = repository();
    const target = repository();
    const first = await source.saveConfirmed(draft(), {
      confirmed: true,
      retainImages: false,
    });
    const second = await source.saveConfirmed(
      draft({
        id: crypto.randomUUID(),
        createdAt: "2026-07-31T13:00:00.000Z",
        terminalMessage: "Second patch",
      }),
      { confirmed: true, retainImages: false },
    );

    await target.saveConfirmed(draft({ id: first.id }), {
      confirmed: true,
      retainImages: false,
    });

    const result = await target.importJson(await source.exportJson());
    expect(result).toEqual({ imported: 1, skipped: 1 });
    await expect(target.get(second.id)).resolves.toMatchObject({ id: second.id });
  });
});

describe("history import and export validation", () => {
  it("round-trips valid patch metadata", () => {
    const patch = {
      ...draft(),
      decision: "commit_proposed" as const,
      schemaVersion: PATCH_SCHEMA_VERSION,
      confirmedAt: "2026-07-31T12:01:00.000Z",
    };

    const serialized = serializePatchExport(
      [patch],
      "2026-07-31T12:02:00.000Z",
    );
    expect(parsePatchExport(serialized)).toEqual({
      format: PATCH_EXPORT_FORMAT,
      version: PATCH_SCHEMA_VERSION,
      exportedAt: "2026-07-31T12:02:00.000Z",
      patches: [patch],
    });
  });

  it("rejects duplicate ids and unknown export fields", () => {
    const patch = {
      ...draft(),
      decision: "commit_proposed" as const,
      schemaVersion: PATCH_SCHEMA_VERSION,
      confirmedAt: "2026-07-31T12:01:00.000Z",
    };
    const duplicateIds = JSON.stringify({
      format: PATCH_EXPORT_FORMAT,
      version: PATCH_SCHEMA_VERSION,
      exportedAt: "2026-07-31T12:02:00.000Z",
      patches: [patch, patch],
    });
    expect(() => parsePatchExport(duplicateIds)).toThrow(
      /duplicate patch id/i,
    );

    const unknownField = JSON.stringify({
      format: PATCH_EXPORT_FORMAT,
      version: PATCH_SCHEMA_VERSION,
      exportedAt: "2026-07-31T12:02:00.000Z",
      patches: [],
      execute: "anything",
    });
    expect(() => parsePatchExport(unknownField)).toThrow(
      /schema validation/i,
    );
  });

  it("rejects imported blocked or unsafe patch metadata", () => {
    const basePatch = {
      ...draft(),
      schemaVersion: PATCH_SCHEMA_VERSION,
      confirmedAt: "2026-07-31T12:01:00.000Z",
    };
    const unsafe = JSON.stringify({
      format: PATCH_EXPORT_FORMAT,
      version: PATCH_SCHEMA_VERSION,
      exportedAt: "2026-07-31T12:02:00.000Z",
      patches: [
        {
          ...basePatch,
          decision: "blocked",
          changes: [
            {
              description: "Blue marker is missing",
              classification: "unexplained",
            },
          ],
        },
      ],
    });

    expect(() => parsePatchExport(unsafe)).toThrow(/schema validation/i);
  });

  it("hashes thumbnail bytes with a tagged SHA-256 digest", async () => {
    await expect(sha256Bytes(new TextEncoder().encode("ScenePatch"))).resolves.toMatch(
      /^sha256:[0-9a-f]{64}$/,
    );
  });
});
