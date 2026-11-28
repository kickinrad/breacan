// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// A website is the starting point: a fixture page is served on localhost, `breacan site` reads it into a snapshot,
// and builds read only the snapshot. The values it extracts are primitives marked `needs-review`; the colours it
// elects with confidence are palette names a theme's roles use.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const here = import.meta.dir;
const dirs: string[] = [];
let server: ReturnType<typeof Bun.serve>;
beforeAll(() => { server = Bun.serve({ port: 0, fetch: () => new Response(Bun.file(join(here, "index.html")), { headers: { "content-type": "text/html" } }) }); });
afterAll(() => { server.stop(true); for (const dir of dirs) rmSync(dir, { recursive: true, force: true }); });

const project = (url = `http://localhost:${server.port}/`) => {
  const dir = mkdtempSync(join(tmpdir(), "breacan-website-"));
  dirs.push(dir);
  mkdirSync(join(dir, "node_modules/@breacan"), { recursive: true });
  symlinkSync(join(here, "../../core"), join(dir, "node_modules/breacan"));
  symlinkSync(join(here, ".."), join(dir, "node_modules/@breacan/website"));
  writeFileSync(join(dir, "theme.toml"), 'name = "bakery"\n\n[roles]\n"color.accent.default" = "site-1"\n');
  writeFileSync(join(dir, "breacan.config.ts"), `import { defineConfig } from "breacan";\nimport website from "@breacan/website";\nexport default defineConfig({ addons: [website], options: { breacan: { path: "tokens.css" }, "@breacan/website": { url: ${JSON.stringify(url)} } } });\n`);
  return dir;
};
// Async: the page is served by this process.
const breacan = async (dir: string, ...args: string[]) => {
  const child = Bun.spawn(["bun", join(here, "../../core/bin/breacan.mjs"), ...args], { cwd: dir, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
  return { exitCode: await child.exited, stdout, stderr };
};

test("a build with no snapshot fails naming the file and the command, and writes nothing", async () => {
  const dir = project();
  const built = await breacan(dir, "build");
  expect(built.exitCode).toBe(1);
  expect(built.stderr).toContain("design/site.json is missing; run breacan site");
  expect(existsSync(join(dir, "design/site.json"))).toBe(false);
  expect(existsSync(join(dir, "tokens.css"))).toBe(false);
});

test("breacan site reads the page into a snapshot; builds read it, give the accent its primary, and check", async () => {
  const dir = project();
  const read = await breacan(dir, "site");
  expect(read.stderr).toBe("");
  const snapshot = JSON.parse(readFileSync(join(dir, "design/site.json"), "utf8"));
  expect(snapshot.url).toBe(`http://localhost:${server.port}/`);
  expect(snapshot.seeds[0]).toBe("#1f6f8b");
  expect(snapshot.colors).toContain("#d98e04");
  expect(snapshot.fonts).toContain("Georgia");
  expect((await breacan(dir, "build")).stderr).toBe("");
  expect(readFileSync(join(dir, "tokens.css"), "utf8")).toContain("--color-accent-default: #1f6f8b;");
  expect(await breacan(dir, "check")).toMatchObject({ exitCode: 0, stderr: "" });
});

test("the receipt holds the snapshot: an edit fails the check, naming it", async () => {
  const dir = project();
  await breacan(dir, "site");
  expect((await breacan(dir, "build")).stderr).toBe("");
  writeFileSync(join(dir, "design/site.json"), readFileSync(join(dir, "design/site.json"), "utf8").replace("#1f6f8b", "#101010"));
  expect((await breacan(dir, "check")).stderr).toContain("design/site.json");
});

test("a snapshot of another url fails, naming both; a non-http url and a misspelt option fail", async () => {
  const dir = project();
  await breacan(dir, "site");
  writeFileSync(join(dir, "breacan.config.ts"), readFileSync(join(dir, "breacan.config.ts"), "utf8").replace(`:${server.port}/`, ":1/"));
  const stale = await breacan(dir, "build");
  expect(stale.stderr).toContain(`holds http://localhost:${server.port}/, not http://localhost:1/; run breacan site`);
  expect((await breacan(project("file:///etc/passwd"), "build")).stderr).toContain('"url" must be an http or https address');
  const bad = project();
  writeFileSync(join(bad, "breacan.config.ts"), readFileSync(join(bad, "breacan.config.ts"), "utf8").replace("url:", "link:"));
  expect((await breacan(bad, "build")).stderr).toContain("the known options are url, snapshot");
});
