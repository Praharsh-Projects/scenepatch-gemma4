import { z } from "zod";

export {
  SCENEPATCH_MODEL_ID,
  SCENEPATCH_MODEL_IDENTIFIER,
  SCENEPATCH_MODEL_REVISION,
} from "../model-info";
export const PATCH_SCHEMA_VERSION = 1 as const;
export const PATCH_EXPORT_FORMAT = "scenepatch-history" as const;
export const MAX_CHANGE_RECORDS = 6;

export const CHANGE_CLASSIFICATIONS = [
  "intended",
  "unexplained",
  "uncertain",
] as const;

export const ChangeClassificationSchema = z.enum(CHANGE_CLASSIFICATIONS);
export type ChangeClassification = z.infer<
  typeof ChangeClassificationSchema
>;

export const SceneChangeSchema = z
  .object({
    description: z.string().trim().min(1).max(280),
    classification: ChangeClassificationSchema,
  })
  .strict();
export type SceneChange = z.infer<typeof SceneChangeSchema>;

export const PatchDecisionSchema = z.enum(["commit_proposed", "blocked"]);
export type PatchDecision = z.infer<typeof PatchDecisionSchema>;

export const Sha256DigestSchema = z
  .string()
  .regex(/^sha256:[0-9a-f]{64}$/);
export type Sha256Digest = z.infer<typeof Sha256DigestSchema>;

export const ThumbnailHashesSchema = z
  .object({
    before: Sha256DigestSchema,
    after: Sha256DigestSchema,
  })
  .strict();
export type ThumbnailHashes = z.infer<typeof ThumbnailHashesSchema>;

const IsoDateSchema = z.string().datetime({ offset: true });

export const PatchDraftSchema = z
  .object({
    id: z.string().uuid(),
    createdAt: IsoDateSchema,
    modelId: z.string().trim().min(1).max(200),
    intentSummary: z.string().trim().min(1).max(1_000),
    thumbnailHashes: ThumbnailHashesSchema,
    changes: z.array(SceneChangeSchema).max(MAX_CHANGE_RECORDS),
    decision: PatchDecisionSchema,
    terminalMessage: z.string().trim().min(1).max(1_000),
    inferenceMs: z.number().finite().nonnegative().max(86_400_000),
  })
  .strict();
export type PatchDraft = z.infer<typeof PatchDraftSchema>;

export const StoredPatchMetadataSchema = PatchDraftSchema.extend({
  schemaVersion: z.literal(PATCH_SCHEMA_VERSION),
  confirmedAt: IsoDateSchema,
  decision: z.literal("commit_proposed"),
  changes: z.array(SceneChangeSchema).min(1).max(MAX_CHANGE_RECORDS),
})
  .strict()
  .superRefine((patch, context) => {
    if (patch.changes.some((change) => change.classification !== "intended")) {
      context.addIssue({
        code: "custom",
        path: ["changes"],
        message: "Confirmed patches may contain only intended changes.",
      });
    }
  });
export type StoredPatchMetadata = z.infer<
  typeof StoredPatchMetadataSchema
>;

export interface RetainedPatchImages {
  before: Blob;
  after: Blob;
}

export interface StoredPatch extends StoredPatchMetadata {
  retainedImages?: RetainedPatchImages;
}

export const PatchExportSchema = z
  .object({
    format: z.literal(PATCH_EXPORT_FORMAT),
    version: z.literal(PATCH_SCHEMA_VERSION),
    exportedAt: IsoDateSchema,
    patches: z.array(StoredPatchMetadataSchema).max(1_000),
  })
  .strict();
export type PatchExport = z.infer<typeof PatchExportSchema>;

export type CreatePatchDraftInput = Omit<PatchDraft, "id" | "createdAt"> &
  Partial<Pick<PatchDraft, "id" | "createdAt">>;

export function createPatchDraft(input: CreatePatchDraftInput): PatchDraft {
  const randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  if (!input.id && !randomUUID) {
    throw new Error("Secure random UUID generation is unavailable.");
  }

  return PatchDraftSchema.parse({
    ...input,
    id: input.id ?? randomUUID?.(),
    createdAt: input.createdAt ?? new Date().toISOString(),
  });
}

export async function sha256Bytes(
  value: Blob | ArrayBuffer | ArrayBufferView,
): Promise<Sha256Digest> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto SHA-256 is unavailable.");
  }

  let bytes: BufferSource;
  if (value instanceof Blob) {
    bytes = await value.arrayBuffer();
  } else if (value instanceof ArrayBuffer) {
    bytes = value;
  } else {
    const source = new Uint8Array(
      value.buffer,
      value.byteOffset,
      value.byteLength,
    );
    bytes = Uint8Array.from(source).buffer;
  }

  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return Sha256DigestSchema.parse(`sha256:${hex}`);
}
