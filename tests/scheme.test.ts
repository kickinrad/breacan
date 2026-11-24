// Walkthrough C: a Base16 or Base24 scheme becomes a whole kit; the base fills the rest.
import { expect, test } from "bun:test";
import { cpSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { read, root, run, scratch } from "./helpers";
import { contrast } from "../src/color.mjs";

// Tokyo Mono's own Base24 schemes, as its repo builds them.
const kit = (files: string[]) => {
  const dir = scratch("scheme-");
  cpSync(join(root, "tests/schemes"), join(dir, "schemes"), { recursive: true });
  writeFileSync(join(dir, "VERSION"), "0.1.0\n");
  writeFileSync(join(dir, "breacan.config.mjs"), `export default { preset: "default", kit: { name: "tokyo" }, modules: ["scheme"],
  scheme: { files: ${JSON.stringify(files)} }, dtcg: { path: "ports/tokens" }, "claude-design": { path: "ports/claude-design" }, playground: { path: "docs/playground" } };\n`);
  return dir;
};
const tokens = (dir: string, mode = "") => JSON.parse(read(dir, `ports/tokens/tokyo${mode}.tokens.json`));
const hex = (tree: Record<string, any>, path: string) => path.split(".").reduce((node, key) => node?.[key], tree)?.$value?.hex;

test("the Tokyo Base24 schemes build a whole kit: neutrals from base00 to base07, accents, ANSI, every role in both modes", () => {
  const dir = kit(["schemes/tokyo-mono-night.yaml", "schemes/tokyo-mono-day.yaml"]);
  const result = run(dir, "build");
  expect(result.stderr.toString()).toBe("");
  const light = tokens(dir);
  const dark = { ...light, md: { sys: { color: { ...light.md.sys.color, ...tokens(dir, ".dark").md.sys.color } } }, scheme: { ...light.scheme, ...tokens(dir, ".dark").scheme } };
  expect(hex(light, "md.sys.color.surface")).toBe("#ffffff");
  expect(hex(dark, "md.sys.color.surface")).toBe("#292929");
  expect(hex(dark, "md.sys.color.on-surface")).toBe("#d6d6d6");
  expect(hex(dark, "md.sys.color.primary")).toBe("#7aa2f7");
  expect(hex(dark, "scheme.ansi.1")).toBe("#f79178");
  expect(hex(dark, "scheme.ansi.15")).toBe("#ffffff");
  for (const tree of [light, dark]) {
    for (const role of ["primary", "secondary", "tertiary", "error"]) {
      expect(contrast(hex(tree, `md.sys.color.on-${role}`), hex(tree, `md.sys.color.${role}`)), role).toBeGreaterThanOrEqual(4.5);
      expect(contrast(hex(tree, `md.sys.color.${role}`), hex(tree, "md.sys.color.surface")), `${role} on surface`).toBeGreaterThanOrEqual(4.5);
    }
  }
  expect(run(dir, "check").exitCode).toBe(0);
});

test("one dark scheme gives the dark mode; light keeps the base's colours", () => {
  const dir = kit(["schemes/tokyo-mono-night.yaml"]);
  expect(run(dir, "build").stderr.toString()).toBe("");
  expect(hex(tokens(dir), "md.sys.color.surface")).toBe("#fcfcfc");
  expect(hex(tokens(dir, ".dark"), "md.sys.color.surface")).toBe("#292929");
});

test("two schemes of one variant, and a scheme missing a slot, fail, naming why", () => {
  expect(run(kit(["schemes/tokyo-mono-night.yaml", "schemes/tokyo-mono-night.yaml"]), "build").stderr.toString()).toContain("both files are dark schemes");
  const dir = kit(["schemes/broken.yaml"]);
  writeFileSync(join(dir, "schemes/broken.yaml"), 'system: "base16"\nvariant: "dark"\npalette:\n  base00: "#000000"\n');
  expect(run(dir, "build").stderr.toString()).toContain("has no colour for base01");
});
