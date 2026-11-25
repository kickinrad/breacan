// Walkthrough B: a website becomes a kit, from a local fixture page served on localhost (acceptance 11). The values
// it extracts are primitives marked `needs-review`; confident matches fill roles and the base fills the rest.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { command, read, root, scratch } from "./helpers";

let server: ReturnType<typeof Bun.serve>;
beforeAll(() => { server = Bun.serve({ port: 0, fetch: () => new Response(Bun.file(join(root, "tests/site/index.html")), { headers: { "content-type": "text/html" } }) }); });
afterAll(() => server.stop(true));

// The binary runs async here: the page is served by this process.
const build = async (dir: string, ...args: string[]) => {
  const child = Bun.spawn([...command, "build", ...args], { cwd: dir, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  return { stdout, stderr, exitCode: child.exitCode };
};
const kit = (site: object) => {
  const dir = scratch("site-");
  writeFileSync(join(dir, "VERSION"), "0.1.0\n");
  writeFileSync(join(dir, "breacan.config.mjs"), `export default { preset: "default", kit: { name: "harbour" }, modules: ["site", "rules"], site: ${JSON.stringify(site)},
  dtcg: { path: "ports/tokens" }, "claude-design": { path: "ports/claude-design" }, playground: { path: "docs/playground" } };\n`);
  return dir;
};
const get = (tree: Record<string, any>, path: string) => path.split(".").reduce((node, key) => node?.[key], tree);

test("a website builds a whole kit: its values are primitives marked needs-review, its elected colours and fonts fill roles", async () => {
  const port = server.port;
  const dir = kit({ url: `http://localhost:${port}/` });
  const result = await build(dir);
  expect(result.stderr).toBe("");
  expect(result.exitCode).toBe(0);
  const tokens = JSON.parse(read(dir, "ports/tokens/harbour.tokens.json"));
  const flagged: string[] = JSON.parse(read(dir, "breacan.rules.json")).review;
  // Colours, the corner radii and spacing the page uses, and its font.
  expect(get(tokens, "site.color.1.$value.hex")).toMatch(/^#[0-9a-f]{6}$/);
  expect(Object.keys(tokens.site.color).length).toBeGreaterThanOrEqual(3);
  for (const path of ["site.color.1", "site.font.1", "site.radius.4", "site.radius.8", "site.radius.12", "site.space.8", "site.space.16", "site.space.32"]) expect(flagged, path).toContain(path);
  expect(get(tokens, "site.radius.12.$value")).toEqual({ value: 12, unit: "px" });
  expect(get(tokens, "site.font.1.$value")).toBe("Georgia");
  // Confident matches fill roles: the font is the body face, and the page's call-to-action blue seeds the primary.
  expect(get(tokens, "md.ref.typeface.plain.$value")).toBe("Georgia");
  const primary = get(tokens, "md.sys.color.primary.$value.hex");
  expect(primary).toMatch(/^#[0-9a-f]{6}$/);
  expect(primary).not.toBe(get(JSON.parse(read(dir, "ports/tokens/harbour.dark.tokens.json")), "md.sys.color.primary.$value.hex") ?? "");
  // Roles are not flagged; the build names what needs a person's eyes.
  expect(flagged.some((path) => path.startsWith("md."))).toBe(false);
  expect(result.stdout).toMatch(/^\d+ tokens need review \(flagged by an import\): site\.color\.1/);
  // The page is read once, into a snapshot the receipt holds: with the server stopped, a build gives the same bytes
  // and a check passes; only --refresh goes back to the page.
  server.stop(true);
  const files = ["ports/tokens/harbour.tokens.json", "ports/tokens/harbour.dark.tokens.json", "src/styles/tokens.css", "breacan.receipt.json"];
  const before = files.map((file) => read(dir, file));
  expect(JSON.parse(read(dir, "design/site.json")).url).toBe(`http://localhost:${port}/`);
  expect((await build(dir)).stderr).toBe("");
  expect(files.map((file) => read(dir, file))).toEqual(before);
  expect(Bun.spawnSync([...command, "check"], { cwd: dir }).exitCode).toBe(0);
  expect(JSON.parse(read(dir, "breacan.receipt.json")).inputs.map((input: { path: string }) => input.path)).toContain("design/site.json");
  expect((await build(dir, "--refresh")).stderr).toContain("net::ERR_CONNECTION_REFUSED");
  expect(files.map((file) => read(dir, file))).toEqual(before);
}, 60_000);

test("a bad url, or an unknown engine, fails naming the option", async () => {
  expect((await build(kit({ url: "harbour.example" }))).stderr).toContain('site option "url"');
  expect((await build(kit({ url: "http://localhost:1/", engine: "paint" }))).stderr).toContain('option "engine" must be leonardo or material');
}, 60_000);
