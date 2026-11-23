// The receipt: each build records its inputs and outputs, and `breacan check` holds the tree to that record.
import { expect, test } from "bun:test";
import { appendFileSync, cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { read, root, run, scratch } from "./helpers";

const kit = () => {
  const dir = scratch("receipt-");
  cpSync(join(root, "tests/kits/tokyo-mono"), dir, { recursive: true });
  expect(run(dir, "build").stderr.toString()).toBe("");
  return dir;
};
const receipt = (dir: string) => JSON.parse(read(dir, "breacan.receipt.json"));
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const failure = (dir: string) => { const result = run(dir, "check"); expect(result.exitCode).toBe(1); return result.stderr.toString(); };

test("a build records every input it read and every file it wrote, and check passes on it", () => {
  const dir = kit();
  const held = receipt(dir);
  expect(Object.keys(held.inputs)).toEqual(expect.arrayContaining(["kumiko.config.mjs", "VERSION", "design/theme.toml", "templates/ports/bat/tokyo-mono.tmTheme"]));
  expect(held.outputs["ports/bat/tokyo-mono.tmTheme"].sha256).toBe(sha(read(dir, "ports/bat/tokyo-mono.tmTheme")));
  expect(held.outputs["ports/mealie/tokyo-mono.css"].header).toBe(true);
  expect(run(dir, "check").exitCode).toBe(0);
});

test("a hand-edited output fails against the receipt, naming it", () => {
  const dir = kit();
  appendFileSync(join(dir, "ports/tmux/tokyo-mono.conf"), "# mine\n");
  expect(failure(dir)).toContain("ports/tmux/tokyo-mono.conf was edited by hand");
});

test("a changed or new input fails until the next build", () => {
  const dir = kit();
  appendFileSync(join(dir, "design/theme.toml"), "\n");
  expect(failure(dir)).toContain("design/theme.toml changed since the last build");
  run(dir, "build");
  writeFileSync(join(dir, "design/extra.toml"), "");
  expect(failure(dir)).toContain("design/extra.toml is new since the last build");
});

test("check holds the tree to the receipt, not to what this engine would write now", () => {
  const dir = kit();
  const file = "ports/tmux/tokyo-mono.conf";
  const text = `${read(dir, file)}# an older engine's byte\n`;
  writeFileSync(join(dir, file), text);
  const held = receipt(dir);
  held.outputs[file].sha256 = sha(text);
  writeFileSync(join(dir, "breacan.receipt.json"), JSON.stringify(held));
  expect(run(dir, "check").exitCode).toBe(0);
});

test("an output that lost its generated header fails, even with a matching receipt", () => {
  const dir = kit();
  const file = "ports/mealie/tokyo-mono.css";
  const text = read(dir, file).split("\n").slice(1).join("\n");
  writeFileSync(join(dir, file), text);
  const held = receipt(dir);
  held.outputs[file].sha256 = sha(text);
  writeFileSync(join(dir, "breacan.receipt.json"), JSON.stringify(held));
  expect(failure(dir)).toContain(`${file} has no generated header`);
});

test("with no receipt (a kit kumiko built), check compares every output to a fresh build", () => {
  const dir = kit();
  rmSync(join(dir, "breacan.receipt.json"));
  expect(run(dir, "--check").exitCode).toBe(0);
  appendFileSync(join(dir, "ports/tmux/tokyo-mono.conf"), "# mine\n");
  expect(failure(dir)).toContain("ports/tmux/tokyo-mono.conf is stale");
  expect(readFileSync(join(dir, "ports/tmux/tokyo-mono.conf"), "utf8")).toEndWith("# mine\n");
});
