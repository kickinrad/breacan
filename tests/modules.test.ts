// The module shape { slot, name, reads, writes, run } and presets, from outside the engine.
import { expect, test } from "bun:test";
import { cpSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { read, root, run, scratch } from "./helpers";

// The playground fixture (a two-mode kit with notes) under a config of the test's own.
const kit = (config: string) => {
  const dir = scratch("modules-");
  for (const entry of ["design", "tokens", "VERSION"]) cpSync(join(root, "tests/playground", entry), join(dir, entry), { recursive: true });
  writeFileSync(join(dir, "breacan.config.mjs"), config);
  return dir;
};
const outputs = `dtcg: { path: "ports/tokens" }, "claude-design": { path: "ports/claude-design" }, playground: { path: "docs/play" }`;

test("an output module written outside the repo builds when the kit's config lists it", () => {
  const elsewhere = scratch("module-elsewhere-");
  const module = join(elsewhere, "count.mjs");
  writeFileSync(module, `export default {
  slot: "output", name: "count", reads: ["tokens"], writes: { path: "count.txt" },
  run: async ({ tokens, options }) => [{ path: options.path, content: tokens.length + "\\n" }],
};\n`);
  const dir = kit(`import count from ${JSON.stringify(module)};\nexport default { kit: { name: "acme" }, include: ["builtin:material"], modules: [count] };\n`);
  const result = run(dir, "build");
  expect(result.stderr.toString()).toBe("");
  expect(Number(read(dir, "count.txt"))).toBeGreaterThan(100);
  expect(run(dir, "check").exitCode).toBe(0);
});

test("the default preset builds every output, and without css builds all the others", () => {
  const full = kit(`export default { preset: "default", kit: { name: "acme" }, include: ["builtin:material"], ${outputs} };\n`);
  expect(run(full, "build").stderr.toString()).toBe("");
  const less = kit(`export default { preset: "default", without: ["css"], kit: { name: "acme" }, include: ["builtin:material"], ${outputs} };\n`);
  expect(run(less, "build").stderr.toString()).toBe("");
  expect(existsSync(join(full, "src/styles/tokens.css"))).toBe(true);
  expect(existsSync(join(less, "src/styles/tokens.css"))).toBe(false);
  for (const file of ["src/styles/beer.css", "DESIGN.md", "ports/tokens/acme.tokens.json", "ports/claude-design/project/README.md", "docs/play/index.html"]) {
    expect(existsSync(join(less, file)), file).toBe(true);
    expect(existsSync(join(full, file)), file).toBe(true);
  }
});

test("a module in a slot the engine does not run fails, naming the slot", () => {
  const dir = kit(`export default { modules: [{ slot: "nowhere", name: "odd", run: async () => [] }] };\n`);
  const result = run(dir, "build");
  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain('Module odd names slot "nowhere"');
});

test("an unknown preset fails, listing the presets", () => {
  const result = run(kit(`export default { preset: "nope" };\n`), "build");
  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain("Unknown preset nope (presets: default)");
});
