import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const outputRoot = path.resolve("dist/client");
const serviceWorkerPath = path.join(outputRoot, "sw.js");
const assetRoot = path.join(outputRoot, "assets");

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(directory, entry.name), relative)));
    } else if (entry.isFile() && !entry.name.endsWith(".map")) {
      files.push(`./assets/${relative}`);
    }
  }
  return files;
}

// Pages is the explicit fixture-replay fallback. Keep the experimental Gemma
// worker and 22 MB ONNX Runtime binary available for source inspection, but do
// not force anonymous replay visitors to precache model-runtime assets.
const assets = (await listFiles(assetRoot))
  .filter(
    (asset) =>
      !asset.includes("/gemma.worker-") &&
      !asset.includes("/ort-wasm-"),
  )
  .sort();
if (assets.length === 0) {
  throw new Error("The Pages build did not emit any static assets to precache.");
}

const source = await readFile(serviceWorkerPath, "utf8");
const shellFiles = [
  "index.html",
  "index.rsc",
  "manifest.webmanifest",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
];
const marker = "const PRECACHE_URLS = [];";
const cacheMarker = 'const CACHE_NAME = "scenepatch-shell-dev";';
if (!source.includes(marker)) {
  throw new Error("The service-worker precache marker is missing.");
}
if (!source.includes(cacheMarker)) {
  throw new Error("The service-worker cache-name marker is missing.");
}

const releaseHash = createHash("sha256").update(source).update(assets.join("\n"));
for (const shellFile of shellFiles) {
  releaseHash.update(shellFile);
  releaseHash.update(await readFile(path.join(outputRoot, shellFile)));
}
const releaseDigest = releaseHash.digest("hex").slice(0, 12);

await writeFile(
  serviceWorkerPath,
  source
    .replace(
      cacheMarker,
      `const CACHE_NAME = "scenepatch-shell-${releaseDigest}";`,
    )
    .replace(marker, `const PRECACHE_URLS = ${JSON.stringify(assets, null, 2)};`),
);
console.log(`ScenePatch service worker precaches ${assets.length} hashed assets.`);
