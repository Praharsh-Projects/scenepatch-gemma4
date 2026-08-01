import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { assertSafeDistTarget } from "../scripts/clean-pages-dist.mjs";

test("the CLI cleans only its own repository-local dist directory", () => {
  const sandbox = mkdtempSync(path.join(tmpdir(), "scenepatch-dist-clean-"));
  try {
    const scripts = path.join(sandbox, "scripts");
    const dist = path.join(sandbox, "dist");
    const sibling = path.join(sandbox, "keep.txt");
    const sourceScript = fileURLToPath(
      new URL("../scripts/clean-pages-dist.mjs", import.meta.url),
    );
    const copiedScript = path.join(scripts, "clean-pages-dist.mjs");

    mkdirSync(scripts, { recursive: true });
    mkdirSync(path.join(dist, "assets"), { recursive: true });
    copyFileSync(sourceScript, copiedScript);
    writeFileSync(path.join(dist, "assets", "stale.js"), "stale");
    writeFileSync(sibling, "keep");

    const result = spawnSync(process.execPath, [copiedScript], {
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Removed:/);
    assert.equal(existsSync(dist), false);
    assert.equal(readFileSync(sibling, "utf8"), "keep");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("rejects filesystem roots and targets outside the direct dist child", () => {
  const repositoryRoot = path.join(tmpdir(), "scenepatch-guard-root");
  const filesystemRoot = path.parse(repositoryRoot).root;

  assert.throws(
    () => assertSafeDistTarget(filesystemRoot, path.join(filesystemRoot, "dist")),
    /filesystem root/,
  );
  assert.throws(
    () => assertSafeDistTarget(repositoryRoot, path.join(repositoryRoot, "dist-old")),
    /repository-local dist/,
  );
  assert.throws(
    () => assertSafeDistTarget(repositoryRoot, path.join(repositoryRoot, "dist", "nested")),
    /repository-local dist/,
  );
});
