// The dial on the type foundation, from outside the engine: fixture kit D (walkthrough D) built at each level on
// iOS, with the fixture Apple language. tests/dial/kit-d.golden.json holds each level's resolved type roles;
// `BREACAN_DIAL_GOLDEN=write bun test tests/dial.test.ts` rewrites it, and the PR says why it moved.
import { expect, test } from "bun:test";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { read, root, run, scratch } from "./helpers";
import { STYLES } from "../src/type.mjs";
import { LEVELS } from "../src/dial.mjs";

const GOLDEN = join(root, "tests/dial/kit-d.golden.json");
const kit = (level: string) => {
  const dir = scratch(`dial-${level}-`);
  cpSync(join(root, "tests/dial/kit-d"), dir, { recursive: true });
  const config = join(dir, "breacan.config.mjs");
  writeFileSync(config, readFileSync(config, "utf8").replace('dial: "branded"', `dial: "${level}"`));
  return dir;
};
// Each type role's resolved values on iOS: the base file with the platform's differences over it.
const typeRoles = (dir: string) => {
  const file = (suffix: string) => JSON.parse(read(dir, `ports/tokens/kit-d${suffix}.tokens.json`)).md?.sys?.typescale ?? {};
  const [base, ios] = [file(""), file(".ios")];
  return Object.fromEntries(STYLES.map((role: string) => [role, Object.fromEntries(["font", "size", "line-height", "weight", "tracking"]
    .map((part) => [part, (ios[role]?.[part] ?? base[role][part]).$value]))]));
};

test("type differs by level on fixture kit D: Native and Tinted take SF Pro, Branded and Signature keep the brand's", () => {
  const resolved: Record<string, unknown> = {};
  for (const level of LEVELS) {
    const dir = kit(level);
    const result = run(dir, "build");
    expect(result.stderr.toString(), level).toBe("");
    expect(run(dir, "check").exitCode, level).toBe(0);
    resolved[level] = typeRoles(dir);
  }
  if (process.env.BREACAN_DIAL_GOLDEN === "write") writeFileSync(GOLDEN, `${JSON.stringify(resolved, null, 2)}\n`);
  expect(resolved).toEqual(JSON.parse(readFileSync(GOLDEN, "utf8")));
  const body = (level: string) => (resolved[level] as Record<string, Record<string, unknown>>)["body-large"];
  expect(body("native").font).toEqual(["SF Pro", "-apple-system", "system-ui", "sans-serif"]);
  expect(body("tinted")).toEqual(body("native"));
  expect(body("branded").font).toEqual(["Inter", "sans-serif"]);
  expect(body("branded").size).toEqual({ value: 18, unit: "px" });
  expect(body("signature")).toEqual(body("branded"));
});

test("a dial level the dial does not know fails the build, naming the levels", () => {
  const result = run(kit("loud"), "build");
  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain("platforms.ios.dial must be one of native, tinted, branded, signature");
});
