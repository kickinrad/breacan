// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The receipt: each build records its inputs and outputs, and `breacan check` holds the tree to that record.
import { expect, test } from "bun:test";
import { appendFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { read, root, run, scratch } from "./helpers";

const kit = () => {
  const dir = scratch("receipt-");
  cpSync(join(root, "tests/kits/tokyo-mono"), dir, { recursive: true });
  expect(run(dir, "build").stderr.toString()).toBe("");
  return dir;
};
// The receipt as path-keyed maps, for reading and editing; `save` writes it back as the lists the engine writes.
const receipt = (dir: string) => {
  const raw = JSON.parse(read(dir, "breacan.receipt.json"));
  const map = (list: { path: string; sha256: string; header?: boolean }[], value: (entry: any) => unknown) => Object.fromEntries(list.map((entry) => [entry.path, value(entry)]));
  return { ...raw, inputs: map(raw.inputs, (entry) => entry.sha256), outputs: map(raw.outputs, ({ path, ...entry }) => entry) };
};
const save = (dir: string, held: any) => {
  const list = (map: Record<string, any>, value: (digest: any) => object) => Object.entries(map).map(([path, entry]) => ({ path, ...value(entry) }));
  writeFileSync(join(dir, "breacan.receipt.json"), JSON.stringify({ ...held, inputs: list(held.inputs, (sha256) => ({ sha256 })), outputs: list(held.outputs, (entry) => entry) }));
};
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const failure = (dir: string) => { const result = run(dir, "check"); expect(result.exitCode).toBe(1); return result.stderr.toString(); };

test("a build records every input it read and every file it wrote, and check passes on it", () => {
  const dir = kit();
  const held = receipt(dir);
  expect(Object.keys(held.inputs)).toEqual(expect.arrayContaining(["breacan.config.mjs", "VERSION", "design/theme.toml", "templates/ports/bat/tokyo-mono.tmTheme"]));
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
  save(dir, held);
  expect(run(dir, "check").exitCode).toBe(0);
});

test("an output that lost its generated header fails, even with a matching receipt", () => {
  const dir = kit();
  const file = "ports/mealie/tokyo-mono.css";
  const text = read(dir, file).split("\n").slice(1).join("\n");
  writeFileSync(join(dir, file), text);
  const held = receipt(dir);
  held.outputs[file].sha256 = sha(text);
  save(dir, held);
  expect(failure(dir)).toContain(`${file} has no generated header`);
});

test("with no receipt, check fails and says how to make one", () => {
  const dir = kit();
  rmSync(join(dir, "breacan.receipt.json"));
  expect(failure(dir)).toContain("breacan.receipt.json is missing; run breacan build");
});

test("a new file an include glob matches fails until the next build", () => {
  const dir = scratch("receipt-glob-");
  writeFileSync(join(dir, "VERSION"), "0.1.0\n");
  mkdirSync(join(dir, "vendor"));
  writeFileSync(join(dir, "vendor/a.tokens.json"), JSON.stringify({ a: { $type: "number", $value: 1 } }));
  writeFileSync(join(dir, "breacan.config.mjs"), 'export default { include: ["vendor/*.tokens.json"], modules: ["css"] };\n');
  expect(run(dir, "build").stderr.toString()).toBe("");
  expect(run(dir, "check").exitCode).toBe(0);
  writeFileSync(join(dir, "vendor/b.tokens.json"), JSON.stringify({ b: { $type: "number", $value: 2 } }));
  expect(failure(dir)).toContain("vendor/b.tokens.json is new since the last build");
});

test("a receipt that lost its outputs fails, rather than checking nothing", () => {
  const dir = kit();
  const held = receipt(dir);
  save(dir, { ...held, outputs: {} });
  expect(failure(dir)).toContain("is not in the receipt");
  writeFileSync(join(dir, "breacan.receipt.json"), JSON.stringify({ engine: "0.0.0" }));
  expect(failure(dir)).toContain("breacan.receipt.json is not a receipt this engine reads");
});

test("a receipt file holding null or false fails, rather than falling back", () => {
  const dir = kit();
  for (const value of ["null", "false"]) {
    writeFileSync(join(dir, "breacan.receipt.json"), value);
    expect(failure(dir)).toContain("breacan.receipt.json is not a receipt this engine reads");
  }
});

test("a theme's extended file outside the kit folder is an input", () => {
  const dir = scratch("receipt-reach-");
  mkdirSync(join(dir, "design"));
  mkdirSync(join(dir, "shared"));
  writeFileSync(join(dir, "VERSION"), "0.1.0\n");
  writeFileSync(join(dir, "shared/base.toml"), 'default = "light"\n\n[palette.light]\nink = "#101418"\n');
  writeFileSync(join(dir, "design/theme.toml"), 'name = "acme"\nextends = "../shared/base.toml"\n');
  writeFileSync(join(dir, "breacan.config.mjs"), 'export default { kit: { name: "acme" }, modules: ["css"] };\n');
  expect(run(dir, "build").stderr.toString()).toBe("");
  expect(Object.keys(receipt(dir).inputs)).toContain("shared/base.toml");
  appendFileSync(join(dir, "shared/base.toml"), "\n");
  expect(failure(dir)).toContain("shared/base.toml changed since the last build");
});
test("the receipt lists each file as { path, sha256 }, so a path beside a digest never reads as a secret", () => {
  const dir = kit();
  const raw = JSON.parse(read(dir, "breacan.receipt.json"));
  expect(Array.isArray(raw.inputs) && Array.isArray(raw.outputs)).toBe(true);
  expect(raw.outputs.find((entry: { path: string }) => entry.path === "ports/bat/tokyo-mono.tmTheme")).toMatchObject({ sha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
  // No line pairs a quoted path with a digest, the shape gitleaks' generic-api-key rule reads as a key.
  expect(read(dir, "breacan.receipt.json")).not.toMatch(/"[^"]*[./][^"]*": "[0-9a-f]{64}"/);
  const gitleaks = Bun.which("gitleaks");
  if (gitleaks) expect(Bun.spawnSync([gitleaks, "dir", "--no-banner", join(dir, "breacan.receipt.json")]).exitCode).toBe(0);
});
