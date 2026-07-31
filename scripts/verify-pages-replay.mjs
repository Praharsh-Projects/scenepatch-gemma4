import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile("dist/client/index.html", "utf8");
const serviceWorker = await readFile("dist/client/sw.js", "utf8");

assert.match(html, /Public fixture replay[^<]*not live inference/i);
assert.match(html, /Live browser inference disabled for release/i);
assert.match(html, /official-model notebook is the executable Gemma path/i);
assert.match(html, /Pages UI is not live inference/i);
assert.match(serviceWorker, /scenepatch-shell-[0-9a-f]{12}/);
assert.doesNotMatch(serviceWorker, /gemma\.worker-|ort-wasm-/);
for (const shellAsset of [
  "./index.rsc",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
]) {
  assert.ok(serviceWorker.includes(shellAsset), `${shellAsset} is not precached`);
}

console.log("Verified the GitHub Pages artifact is an explicit scripted replay.");
