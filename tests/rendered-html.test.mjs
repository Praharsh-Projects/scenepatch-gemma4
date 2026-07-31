import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the finished ScenePatch product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>ScenePatch · Git for physical creative setups<\/title>/i);
  assert.match(html, /Commit the change you meant/);
  assert.match(html, /Block the one you didn/);
  assert.match(html, /Prepare Gemma 4 locally/);
  assert.match(html, /Local Frontier Innovation/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("publishes product-specific metadata without starter markers", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /name="description" content="A local-first semantic change-control tool/i);
  assert.match(html, /manifest\.webmanifest/i);
  assert.match(html, /og\.png/i);
  assert.match(html, /onnx-community\/gemma-4-E2B-it-ONNX/i);
  assert.doesNotMatch(html, /Starter Project|development preview/i);
});
