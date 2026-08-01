import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const expectedRoles = new Set([
  "before",
  "after-bad-unexplained-removal",
  "after-clean-intended-change",
  "after-uncertain-occluded-evidence",
  "synthetic-spoken-intent",
]);

function fail(message) {
  throw new Error(`Fixture verification failed: ${message}`);
}

function parsePng(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) {
    fail("invalid PNG signature");
  }
  if (buffer.toString("ascii", 12, 16) !== "IHDR") {
    fail("PNG is missing its IHDR header");
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function parsePcmWav(buffer) {
  if (
    buffer.length < 44 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    fail("invalid RIFF/WAVE header");
  }

  let offset = 12;
  let format;
  let dataBytes;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkStart + chunkSize > buffer.length) fail(`truncated ${chunkId} chunk`);

    if (chunkId === "fmt ") {
      if (chunkSize < 16) fail("WAV fmt chunk is too short");
      format = {
        audioFormat: buffer.readUInt16LE(chunkStart),
        channels: buffer.readUInt16LE(chunkStart + 2),
        sampleRateHz: buffer.readUInt32LE(chunkStart + 4),
        bitsPerSample: buffer.readUInt16LE(chunkStart + 14),
      };
    } else if (chunkId === "data") {
      dataBytes = chunkSize;
    }
    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (!format || dataBytes === undefined) fail("WAV requires fmt and data chunks");
  if (format.audioFormat !== 1 || format.bitsPerSample !== 16) {
    fail("WAV must be 16-bit linear PCM");
  }
  const bytesPerSecond =
    format.sampleRateHz * format.channels * (format.bitsPerSample / 8);
  return { ...format, durationSeconds: dataBytes / bytesPerSecond };
}

async function main() {
  const requestedDirectory = process.argv[2];
  if (!requestedDirectory) {
    fail("pass the fixture directory as the first argument");
  }

  const directory = path.resolve(process.cwd(), requestedDirectory);
  const manifestPath = path.join(directory, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.schemaVersion !== 1) fail("unsupported manifest schema version");
  if (!Array.isArray(manifest.files) || manifest.files.length !== 5) {
    fail("manifest must contain exactly five media files");
  }

  const seenRoles = new Set();
  for (const entry of manifest.files) {
    if (!expectedRoles.has(entry.role) || seenRoles.has(entry.role)) {
      fail(`unexpected or duplicate role: ${entry.role}`);
    }
    seenRoles.add(entry.role);
    if (typeof entry.path !== "string" || path.basename(entry.path) !== entry.path) {
      fail(`unsafe filename: ${entry.path}`);
    }

    const filePath = path.join(directory, entry.path);
    const contents = await readFile(filePath);
    const digest = createHash("sha256").update(contents).digest("hex");
    if (digest !== entry.sha256) fail(`${entry.path} SHA-256 mismatch`);

    if (entry.mediaType === "image/png") {
      const dimensions = parsePng(contents);
      if (dimensions.width !== entry.width || dimensions.height !== entry.height) {
        fail(`${entry.path} dimensions do not match the manifest`);
      }
      if (
        dimensions.width < 1 ||
        dimensions.height < 1 ||
        dimensions.width > 8192 ||
        dimensions.height > 8192 ||
        dimensions.width * dimensions.height > 40_000_000
      ) {
        fail(`${entry.path} exceeds ScenePatch image bounds`);
      }
    } else if (entry.mediaType === "audio/wav") {
      const audio = parsePcmWav(contents);
      if (
        audio.channels !== entry.channels ||
        audio.sampleRateHz !== entry.sampleRateHz ||
        entry.codec !== "pcm_s16le"
      ) {
        fail(`${entry.path} audio format does not match the manifest`);
      }
      if (audio.durationSeconds <= 0 || audio.durationSeconds > 10) {
        fail(`${entry.path} must be longer than zero and at most ten seconds`);
      }
      if (Math.abs(audio.durationSeconds - entry.durationSeconds) > 0.001) {
        fail(`${entry.path} duration does not match the manifest`);
      }
    } else {
      fail(`${entry.path} has unsupported media type ${entry.mediaType}`);
    }
  }

  if (seenRoles.size !== expectedRoles.size) fail("fixture roles are incomplete");
  console.log(
    `Verified ${manifest.files.length} hashed media files in ${directory} (${manifest.publicUseStatus}).`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
