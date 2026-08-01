import { existsSync, realpathSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");

export function assertSafeDistTarget(repositoryRoot, targetDirectory) {
  const resolvedRoot = path.resolve(repositoryRoot);
  const resolvedTarget = path.resolve(targetDirectory);

  if (resolvedRoot === path.parse(resolvedRoot).root) {
    throw new Error("Refusing to clean dist from a filesystem root.");
  }
  if (
    path.basename(resolvedTarget) !== "dist" ||
    path.dirname(resolvedTarget) !== resolvedRoot
  ) {
    throw new Error("Refusing to clean anything except the repository-local dist directory.");
  }

  return resolvedTarget;
}

export function cleanPagesDist() {
  const target = assertSafeDistTarget(
    REPOSITORY_ROOT,
    path.resolve(REPOSITORY_ROOT, "dist"),
  );
  const existed = existsSync(target);
  rmSync(target, { recursive: true, force: true });
  return { existed, target };
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(SCRIPT_PATH)
) {
  const { existed, target } = cleanPagesDist();
  console.log(`${existed ? "Removed" : "Confirmed absent"}: ${target}`);
}
