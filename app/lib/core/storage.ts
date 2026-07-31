import { z } from "zod";

import {
  PATCH_EXPORT_FORMAT,
  PATCH_SCHEMA_VERSION,
  PatchDraftSchema,
  PatchExportSchema,
  StoredPatchMetadataSchema,
  type PatchDraft,
  type PatchExport,
  type RetainedPatchImages,
  type StoredPatch,
  type StoredPatchMetadata,
} from "./types";

const DEFAULT_DATABASE_NAME = "scenepatch";
const DATABASE_VERSION = 1;
const PATCH_STORE_NAME = "patches";
const CREATED_AT_INDEX = "by-created-at";
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export type ScenePatchStorageErrorCode =
  | "storage_unavailable"
  | "open_failed"
  | "write_failed"
  | "read_failed"
  | "duplicate_id"
  | "invalid_record"
  | "invalid_export";

export class ScenePatchStorageError extends Error {
  readonly code: ScenePatchStorageErrorCode;
  readonly cause?: unknown;

  constructor(
    code: ScenePatchStorageErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = "ScenePatchStorageError";
    this.code = code;
    this.cause = options?.cause;
  }
}

export type PatchConfirmation =
  | {
      confirmed: true;
      retainImages: false;
    }
  | {
      confirmed: true;
      retainImages: true;
      images: RetainedPatchImages;
    };

export interface PatchImportSummary {
  imported: number;
  skipped: number;
}

export interface ScenePatchRepositoryOptions {
  databaseName?: string;
  indexedDB?: IDBFactory;
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

function validateImages(value: unknown): RetainedPatchImages {
  if (typeof value !== "object" || value === null) {
    throw new ScenePatchStorageError(
      "invalid_record",
      "Retained images must include before and after image blobs.",
    );
  }

  const candidate = value as Record<string, unknown>;
  if (!isBlob(candidate.before) || !isBlob(candidate.after)) {
    throw new ScenePatchStorageError(
      "invalid_record",
      "Retained images must include before and after image blobs.",
    );
  }

  if (candidate.before.size === 0 || candidate.after.size === 0) {
    throw new ScenePatchStorageError(
      "invalid_record",
      "Empty images cannot be retained with a patch.",
    );
  }

  return { before: candidate.before, after: candidate.after };
}

function validateStoredPatch(value: unknown): StoredPatch {
  if (typeof value !== "object" || value === null) {
    throw new ScenePatchStorageError(
      "invalid_record",
      "A local patch record was not an object.",
    );
  }

  const { retainedImages, ...metadataValue } = value as Record<string, unknown>;
  const metadata = StoredPatchMetadataSchema.safeParse(metadataValue);
  if (!metadata.success) {
    throw new ScenePatchStorageError(
      "invalid_record",
      "A local patch record failed schema validation.",
      { cause: metadata.error },
    );
  }

  return retainedImages === undefined
    ? metadata.data
    : { ...metadata.data, retainedImages: validateImages(retainedImages) };
}

function metadataOnly(patch: StoredPatch): StoredPatchMetadata {
  const metadata: Record<string, unknown> = { ...patch };
  delete metadata.retainedImages;
  return StoredPatchMetadataSchema.parse(metadata);
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    })
    .join("; ");
}

export function serializePatchExport(
  patches: readonly StoredPatch[],
  exportedAt = new Date().toISOString(),
): string {
  let payload: PatchExport;
  try {
    payload = PatchExportSchema.parse({
      format: PATCH_EXPORT_FORMAT,
      version: PATCH_SCHEMA_VERSION,
      exportedAt,
      patches: patches.map((patch) => metadataOnly(validateStoredPatch(patch))),
    });
  } catch (error) {
    throw new ScenePatchStorageError(
      "invalid_record",
      "Patch history could not be exported because a record was invalid.",
      { cause: error },
    );
  }

  return JSON.stringify(payload, null, 2);
}

export function parsePatchExport(serialized: string): PatchExport {
  if (new TextEncoder().encode(serialized).byteLength > MAX_IMPORT_BYTES) {
    throw new ScenePatchStorageError(
      "invalid_export",
      "The ScenePatch import is larger than 10 MB.",
    );
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new ScenePatchStorageError(
      "invalid_export",
      "The ScenePatch import is not valid JSON.",
      { cause: error },
    );
  }

  const parsed = PatchExportSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new ScenePatchStorageError(
      "invalid_export",
      `The ScenePatch import failed schema validation: ${formatZodIssues(parsed.error)}`,
      { cause: parsed.error },
    );
  }

  const ids = new Set<string>();
  for (const patch of parsed.data.patches) {
    if (ids.has(patch.id)) {
      throw new ScenePatchStorageError(
        "invalid_export",
        `The ScenePatch import contains duplicate patch id ${patch.id}.`,
      );
    }
    ids.add(patch.id);
  }

  return parsed.data;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

function isConstraintError(error: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "ConstraintError") ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: unknown }).name === "ConstraintError")
  );
}

export class ScenePatchRepository {
  private readonly databaseName: string;
  private readonly suppliedFactory?: IDBFactory;
  private openPromise?: Promise<IDBDatabase>;

  constructor(options: ScenePatchRepositoryOptions = {}) {
    this.databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME;
    this.suppliedFactory = options.indexedDB;
  }

  private factory(): IDBFactory {
    const factory = this.suppliedFactory ?? globalThis.indexedDB;
    if (!factory) {
      throw new ScenePatchStorageError(
        "storage_unavailable",
        "IndexedDB is unavailable in this browser context.",
      );
    }
    return factory;
  }

  private open(): Promise<IDBDatabase> {
    if (this.openPromise) {
      return this.openPromise;
    }

    this.openPromise = new Promise<IDBDatabase>((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try {
        request = this.factory().open(this.databaseName, DATABASE_VERSION);
      } catch (error) {
        reject(
          error instanceof ScenePatchStorageError
            ? error
            : new ScenePatchStorageError(
                "open_failed",
                "ScenePatch could not open local history.",
                { cause: error },
              ),
        );
        return;
      }

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(PATCH_STORE_NAME)) {
          const store = database.createObjectStore(PATCH_STORE_NAME, {
            keyPath: "id",
          });
          store.createIndex(CREATED_AT_INDEX, "createdAt", { unique: false });
        }
      };
      request.onerror = () => {
        reject(
          new ScenePatchStorageError(
            "open_failed",
            "ScenePatch could not open local history.",
            { cause: request.error },
          ),
        );
      };
      request.onblocked = () => {
        reject(
          new ScenePatchStorageError(
            "open_failed",
            "ScenePatch history is open in another tab with an older version.",
          ),
        );
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          this.openPromise = undefined;
        };
        resolve(database);
      };
    });

    this.openPromise.catch(() => {
      this.openPromise = undefined;
    });
    return this.openPromise;
  }

  async saveConfirmed(
    draftInput: PatchDraft,
    confirmation: PatchConfirmation,
  ): Promise<StoredPatch> {
    const draft = PatchDraftSchema.parse(draftInput);
    if (confirmation.confirmed !== true) {
      throw new ScenePatchStorageError(
        "write_failed",
        "A patch must be explicitly confirmed before it can be saved.",
      );
    }
    if (
      draft.decision !== "commit_proposed" ||
      draft.changes.length === 0 ||
      draft.changes.some((change) => change.classification !== "intended")
    ) {
      throw new ScenePatchStorageError(
        "write_failed",
        "Only a clean commit proposal with intended changes can be confirmed.",
      );
    }

    const retainedImages = confirmation.retainImages
      ? validateImages(confirmation.images)
      : undefined;
    const record: StoredPatch = validateStoredPatch({
      ...draft,
      schemaVersion: PATCH_SCHEMA_VERSION,
      confirmedAt: new Date().toISOString(),
      ...(retainedImages ? { retainedImages } : {}),
    });

    const database = await this.open();
    const transaction = database.transaction(PATCH_STORE_NAME, "readwrite");
    const completion = transactionComplete(transaction);
    const request = transaction.objectStore(PATCH_STORE_NAME).add(record);

    try {
      await Promise.all([requestResult(request), completion]);
    } catch (error) {
      if (isConstraintError(error)) {
        throw new ScenePatchStorageError(
          "duplicate_id",
          `Patch ${record.id} already exists in local history.`,
          { cause: error },
        );
      }
      throw new ScenePatchStorageError(
        "write_failed",
        "ScenePatch could not save the confirmed patch locally.",
        { cause: error },
      );
    }

    return record;
  }

  async list(): Promise<StoredPatch[]> {
    const database = await this.open();
    const transaction = database.transaction(PATCH_STORE_NAME, "readonly");
    const completion = transactionComplete(transaction);
    const request = transaction.objectStore(PATCH_STORE_NAME).getAll();

    try {
      const [records] = await Promise.all([requestResult(request), completion]);
      return records
        .map((record) => validateStoredPatch(record))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    } catch (error) {
      if (error instanceof ScenePatchStorageError) {
        throw error;
      }
      throw new ScenePatchStorageError(
        "read_failed",
        "ScenePatch could not read local patch history.",
        { cause: error },
      );
    }
  }

  async get(id: string): Promise<StoredPatch | undefined> {
    const patchId = z.string().uuid().parse(id);
    const database = await this.open();
    const transaction = database.transaction(PATCH_STORE_NAME, "readonly");
    const completion = transactionComplete(transaction);
    const request = transaction.objectStore(PATCH_STORE_NAME).get(patchId);

    try {
      const [record] = await Promise.all([requestResult(request), completion]);
      return record === undefined ? undefined : validateStoredPatch(record);
    } catch (error) {
      if (error instanceof ScenePatchStorageError) {
        throw error;
      }
      throw new ScenePatchStorageError(
        "read_failed",
        `ScenePatch could not read patch ${patchId}.`,
        { cause: error },
      );
    }
  }

  async remove(id: string): Promise<void> {
    const patchId = z.string().uuid().parse(id);
    const database = await this.open();
    const transaction = database.transaction(PATCH_STORE_NAME, "readwrite");
    const completion = transactionComplete(transaction);
    const request = transaction.objectStore(PATCH_STORE_NAME).delete(patchId);

    try {
      await Promise.all([requestResult(request), completion]);
    } catch (error) {
      throw new ScenePatchStorageError(
        "write_failed",
        `ScenePatch could not remove patch ${patchId}.`,
        { cause: error },
      );
    }
  }

  async exportJson(): Promise<string> {
    return serializePatchExport(await this.list());
  }

  async importJson(serialized: string): Promise<PatchImportSummary> {
    const payload = parsePatchExport(serialized);
    const database = await this.open();

    const existingTransaction = database.transaction(
      PATCH_STORE_NAME,
      "readonly",
    );
    const existingCompletion = transactionComplete(existingTransaction);
    const keyRequest = existingTransaction
      .objectStore(PATCH_STORE_NAME)
      .getAllKeys();

    let existingKeys: IDBValidKey[];
    try {
      [existingKeys] = await Promise.all([
        requestResult(keyRequest),
        existingCompletion,
      ]);
    } catch (error) {
      throw new ScenePatchStorageError(
        "read_failed",
        "ScenePatch could not inspect local history before import.",
        { cause: error },
      );
    }

    const existingIds = new Set(existingKeys.map(String));
    const recordsToImport = payload.patches.filter(
      (patch) => !existingIds.has(patch.id),
    );
    const skipped = payload.patches.length - recordsToImport.length;

    if (recordsToImport.length === 0) {
      return { imported: 0, skipped };
    }

    const transaction = database.transaction(PATCH_STORE_NAME, "readwrite");
    const completion = transactionComplete(transaction);
    const store = transaction.objectStore(PATCH_STORE_NAME);
    const requests = recordsToImport.map((record) =>
      requestResult(store.add(StoredPatchMetadataSchema.parse(record))),
    );

    try {
      await Promise.all([...requests, completion]);
    } catch (error) {
      throw new ScenePatchStorageError(
        "write_failed",
        "ScenePatch could not import patch history atomically.",
        { cause: error },
      );
    }

    return { imported: recordsToImport.length, skipped };
  }

  async close(): Promise<void> {
    const openPromise = this.openPromise;
    this.openPromise = undefined;
    if (openPromise) {
      (await openPromise).close();
    }
  }
}

export const scenePatchRepository = new ScenePatchRepository();
