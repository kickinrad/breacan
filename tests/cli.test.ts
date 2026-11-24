// The breacan verbs, and the old kumiko spellings, which fail naming their replacement.
import { expect, test } from "bun:test";
import { appendFileSync, copyFileSync, cpSync, renameSync } from "node:fs";
import { join } from "node:path";
import { command, root, run, scratch } from "./helpers";
import pkg from "../package.json";

const project = () => {
  const dir = scratch("cli-");
  cpSync(join(root, "tests/fixture"), dir, { recursive: true });
  return dir;
};

test("--version prints the 0.x package version", () => {
  const result = run(scratch("cli-version-"), "--version");
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString().trim()).toBe(pkg.version);
  expect(pkg.version).toMatch(/^0\./);
});

test("build and check are verbs", () => {
  const dir = project();
  expect(run(dir, "build").exitCode).toBe(0);
  expect(run(dir, "check").exitCode).toBe(0);
  appendFileSync(join(dir, "src/styles/tokens.css"), "/* hand edit */\n");
  expect(run(dir, "check").exitCode).toBe(1);
  expect(run(dir, "build").exitCode).toBe(0);
  expect(run(dir, "check").exitCode).toBe(0);
});

test("a missing breacan.config.mjs fails by name", () => {
  const dir = project();
  renameSync(join(dir, "breacan.config.mjs"), join(dir, "elsewhere.mjs"));
  const result = run(dir, "check");
  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain("No breacan.config.mjs");
});

const failsNaming = (dir: string, args: string[], replacement: string) => {
  const result = run(dir, ...args);
  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain(replacement);
};

test("the kumiko spellings fail naming their replacement", () => {
  const dir = project();
  failsNaming(dir, [], "breacan build");
  failsNaming(dir, ["--check"], "breacan check");
  failsNaming(dir, ["dev"], "breacan edit");
  renameSync(join(dir, "breacan.config.mjs"), join(dir, "kumiko.config.mjs"));
  failsNaming(dir, ["build"], "kumiko.config.mjs is now breacan.config.mjs");
});

test("a binary named kumiko fails naming breacan", () => {
  const dir = project();
  const copy = join(dir, "kumiko");
  copyFileSync(Bun.which(command[0]) ?? command[0], copy);
  const result = Bun.spawnSync([copy, ...command.slice(1), "build"], { cwd: dir, stderr: "pipe" });
  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain("kumiko is now breacan");
});

test("a stray argument after a verb fails, naming it", () => {
  const result = run(project(), "build", "extra");
  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain("breacan: unknown extra");
});
