// The breacan verbs, and the kumiko spellings that stay until every consumer has moved.
import { expect, test } from "bun:test";
import { appendFileSync, cpSync, renameSync } from "node:fs";
import { join } from "node:path";
import { root, run, scratch } from "./helpers";
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

test("build and check are verbs; no verb builds and --check checks", () => {
  const dir = project();
  expect(run(dir, "build").exitCode).toBe(0);
  expect(run(dir, "check").exitCode).toBe(0);
  expect(run(dir, "--check").exitCode).toBe(0);
  appendFileSync(join(dir, "src/styles/tokens.css"), "/* hand edit */\n");
  expect(run(dir, "check").exitCode).toBe(1);
  expect(run(dir, "--check").exitCode).toBe(1);
  expect(run(dir).exitCode).toBe(0);
  expect(run(dir, "check").exitCode).toBe(0);
});

test("breacan.config.mjs is read, and kumiko.config.mjs while consumers move", () => {
  const dir = project();
  expect(run(dir, "build").exitCode).toBe(0);
  renameSync(join(dir, "kumiko.config.mjs"), join(dir, "breacan.config.mjs"));
  expect(run(dir, "check").exitCode).toBe(0);
  renameSync(join(dir, "breacan.config.mjs"), join(dir, "elsewhere.mjs"));
  const result = run(dir, "check");
  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain("No breacan.config.mjs");
});

test("a stray argument after a verb fails, naming it", () => {
  const result = run(project(), "build", "extra");
  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain("breacan: unknown extra");
});
