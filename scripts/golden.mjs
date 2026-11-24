// Rebuild a frozen kit in a scratch copy and print its golden manifest (output path → sha256) for tests/kits/.
// Usage: bun scripts/golden.mjs <kit directory> > tests/kits/<kit>.golden.json. Review the diff: a changed digest is a
// changed output and the PR says why.
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const source = resolve(process.argv[2] ?? "");
const dir = mkdtempSync(join(tmpdir(), "golden-"));
try {
  cpSync(source, dir, { recursive: true });
  const result = Bun.spawnSync(["bun", resolve(import.meta.dir, "../bin/breacan.mjs"), "build"], { cwd: dir, stderr: "inherit" });
  if (result.exitCode !== 0) process.exit(result.exitCode);
  const { outputs } = JSON.parse(readFileSync(join(dir, "breacan.receipt.json"), "utf8"));
  const manifest = Object.fromEntries(outputs.map(({ path, sha256 }) => [path, sha256]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  console.log(JSON.stringify(manifest, null, 2));
} finally { rmSync(dir, { recursive: true, force: true }); }
