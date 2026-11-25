// SPDX-FileCopyrightText: 2026 Kick In Rad
//
// SPDX-License-Identifier: Apache-2.0

// breacan edit: an edit is built in memory and sent live; only its own pages may edit or save; save writes exactly the
// edited values into theme.toml, and the outputs pass --check after (tests/playground/ is the kit).
import { afterAll, expect, test } from "bun:test";
import { cpSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { join } from "node:path";
import { watchSources } from "../src/edit.mjs";
import { command, root, run, scratch } from "./helpers";

const dir = scratch("breacan-edit-");
for (const entry of ["design", "tokens", "VERSION", "breacan.config.mjs"]) cpSync(join(root, "tests/playground", entry), join(dir, entry), { recursive: true });
const port = 4800 + Math.floor(Math.random() * 1000);
const server = Bun.spawn([...command, "edit", "--port", String(port)], { cwd: dir, stdout: "pipe", stderr: "pipe" });
afterAll(() => server.kill());
const origin = `http://localhost:${port}`;
const ready = (async () => { for (const _ of Array(100)) { try { if ((await fetch(`${origin}/_breacan/live`)).ok) return; } catch {} await Bun.sleep(100); } throw new Error("breacan edit did not start"); })();
const post = (path: string, body: object, from = origin) => fetch(`${origin}${path}`, { method: "POST", headers: { Origin: from, "Content-Type": "application/json" }, body: JSON.stringify(body) });
const live = async () => (await fetch(`${origin}/_breacan/live`)).json();
const theme = readFileSync(join(dir, "design/theme.toml"), "utf8");

test("an edit reaches the live CSS and the kit's tokens without touching theme.toml", async () => {
  await ready;
  expect((await live()).css).toContain("--acme-palette-blue: light-dark(#2e7de9, #7aa2f7);");
  expect((await post("/_breacan/edit", { "palette.night.blue": "#ff0000" })).status).toBe(200);
  const now = await live();
  expect(now.css).toContain("--acme-palette-blue: light-dark(#2e7de9, #ff0000);");
  expect(now.css).toContain("--md-sys-color-primary: light-dark(#2e7de9, #ff0000);");
  expect(now.kit.modes.night.find((token: { path: string }) => token.path === "md.sys.color.primary").value).toBe("#ff0000");
  expect(readFileSync(join(dir, "design/theme.toml"), "utf8")).toBe(theme);
});

test("a page elsewhere cannot edit or save", async () => {
  await ready;
  expect((await post("/_breacan/edit", { "palette.night.blue": "#00ff00" }, "https://example.com")).status).toBe(403);
  expect((await post("/_breacan/save", {}, "https://example.com")).status).toBe(403);
});

// A raw request, so the test sets Host itself, as a DNS-rebinding page's browser would.
const raw = (path: string, host: string, body?: string) => new Promise<number>((done, fail) => {
  const request = body === undefined ? `GET ${path} HTTP/1.1\r\nHost: ${host}\r\n` : `POST ${path} HTTP/1.1\r\nHost: ${host}\r\nOrigin: http://${host}\r\nContent-Type: application/json\r\nContent-Length: ${body.length}\r\n`;
  const socket = connect(port, "127.0.0.1", () => socket.write(`${request}Connection: close\r\n\r\n${body ?? ""}`));
  let reply = "";
  socket.on("data", (chunk) => { reply += chunk; });
  socket.on("end", () => done(Number(reply.split(" ")[1])));
  socket.on("error", fail);
});

test("a page on a rebound name cannot edit or save, though its Host and Origin match", async () => {
  await ready;
  expect(await raw("/_breacan/edit", `rebind.example:${port}`, '{"palette.night.blue":"#00ff00"}')).toBe(403);
  expect(await raw("/_breacan/save", `rebind.example:${port}`, "{}")).toBe(403);
  expect(await raw("/_breacan/edit", `127.0.0.1:${port}`, "{}")).toBe(200);
});

test("a page on a rebound name cannot read the kit or the project's files", async () => {
  await ready;
  // The server listens on 127.0.0.1 alone, so it answers to no IPv6 name either.
  expect(await raw("/VERSION", `[::1]:${port}`)).toBe(403);
  for (const path of ["/VERSION", "/_breacan/live", "/_breacan/panel"]) {
    expect(await raw(path, `rebind.example:${port}`)).toBe(403);
    expect(await raw(path, `localhost:${port}`)).toBe(200);
  }
});

test("a scratch directory stays in the temp folder", () => {
  expect(() => scratch("../escape-")).toThrow("not a path");
});

test("a symlink cannot serve a file from outside the project", async () => {
  await ready;
  const outside = scratch("breacan-outside-");
  writeFileSync(join(outside, "secret.txt"), "outside");
  symlinkSync(join(outside, "secret.txt"), join(dir, "leak.txt"));
  expect((await fetch(`${origin}/leak.txt`)).status).toBe(404);
  expect((await fetch(`${origin}/VERSION`)).status).toBe(200);
});

// Everything the event stream sends for a while.
const listen = async (ms: number, during: () => unknown = () => {}) => {
  const reader = (await fetch(`${origin}/_breacan/events`)).body!.getReader();
  const decoder = new TextDecoder();
  let text = "";
  const reading = (async () => { for (let chunk; !(chunk = await reader.read()).done; ) text += decoder.decode(chunk.value); })().catch(() => {});
  await during();
  await Bun.sleep(ms);
  await reader.cancel();
  await reading;
  return text;
};

test("save writes exactly the edited values without reloading the pages, and --check passes after", async () => {
  await ready;
  await post("/_breacan/edit", { "faces.brand": ["Archivo", "serif"] });
  const events = await listen(1000, async () => expect((await post("/_breacan/save", {})).status).toBe(200));
  expect(events).toContain("event: live");
  expect(events).not.toContain("event: reload");
  const saved = readFileSync(join(dir, "design/theme.toml"), "utf8").split("\n");
  const changed = saved.filter((line, i) => line !== theme.split("\n")[i]);
  expect(changed).toEqual(['blue = "#ff0000"', 'brand = ["Archivo", "serif"]']);
  expect(run(dir, "check").exitCode).toBe(0);
});

test("an edit to theme.toml on disk reloads the pages, and so does a revert to the saved text", async () => {
  await ready;
  const file = join(dir, "design/theme.toml");
  const saved = readFileSync(file, "utf8");
  expect(await listen(1000, () => writeFileSync(file, saved.replace('blue = "#ff0000"', 'blue = "#00ff00"')))).toContain("event: reload");
  expect((await live()).css).toContain("#00ff00");
  expect(await listen(1000, () => writeFileSync(file, saved))).toContain("event: reload");
  expect((await live()).css).not.toContain("#00ff00");
});

test("a source folder that cannot be watched is reported, unless it is optional and absent", () => {
  const reported: string[] = [];
  const missing = join(dir, "nowhere");
  watchSources([{ dir: missing }, { dir: join(dir, "absent"), optional: true }], () => {}, (each) => reported.push(each));
  expect(reported).toEqual([missing]);
});

test("the panel page carries the kit's draft CSS and the panel's client", async () => {
  await ready;
  const page = await (await fetch(`${origin}/_breacan/panel`)).text();
  expect(page).toContain('<style id="kit-css">');
  expect(page).toContain("--acme-palette-ink");
  expect(page).toContain("data-tune-panel");
});

test("the event stream stays open past Bun's idle timeout", async () => {
  await ready;
  const reader = (await fetch(`${origin}/_breacan/events`)).body!.getReader();
  // Events from an earlier test may arrive meanwhile; only the stream ending, or failing, fails this.
  let ended: unknown = false;
  (async () => { while (!(await reader.read()).done); ended = "closed"; })().catch((error) => { ended = error; });
  await Bun.sleep(13_000);
  expect(ended).toBe(false);
  await reader.cancel();
}, 20_000);

// Acceptance 12: a colour changed through the editor's HTTP API is in the token file, alone, and in the playground.
const themeKit = scratch("breacan-edit-theme-");
for (const entry of ["design", "tokens", "VERSION", "breacan.config.mjs"]) cpSync(join(root, "tests/playground", entry), join(themeKit, entry), { recursive: true });
const plain = scratch("breacan-edit-plain-");
mkdirSync(join(plain, "tokens"));
writeFileSync(join(plain, "VERSION"), "1.0.0\n");
writeFileSync(join(plain, "breacan.config.mjs"), 'export default { targets: ["css", "playground"], kit: { name: "plain" }, css: { path: "out/kit.css" }, playground: { path: "docs/play" } };\n');
writeFileSync(join(plain, "tokens/colors.tokens.json"), '{\n  "color": {\n    "$type": "color",\n    "brand": { "$value": "#2e7de9" },\n    "accent":   {"$value":"#ff9e64", "$description": "kept"}\n  }\n}\n');

test.each([
  ["a theme.toml kit", themeKit, "edit", "design/theme.toml", "palette.night.blue"],
  ["a plain DTCG kit", plain, "edit", "tokens/colors.tokens.json", "color.brand"],
])("%s: one colour edit changes one value in its token file, and the playground carries it", async (_, cwd, verb, file, path) => {
  const at = 5800 + Math.floor(Math.random() * 1000);
  const child = Bun.spawn([...command, verb, "--port", String(at)], { cwd, stdout: "pipe", stderr: "pipe" });
  try {
    for (const _ of Array(100)) { try { if ((await fetch(`http://localhost:${at}/_breacan/live`)).ok) break; } catch {} await Bun.sleep(100); }
    const send = (route: string) => fetch(`http://localhost:${at}/_breacan/${route}`, { method: "POST", headers: { Origin: `http://localhost:${at}`, "Content-Type": "application/json" }, body: JSON.stringify(route === "edit" ? { [path]: "#12ab34" } : {}) });
    const before = readFileSync(join(cwd, file), "utf8").split("\n");
    expect((await send("edit")).status).toBe(200);
    expect((await send("save")).status).toBe(200);
    const after = readFileSync(join(cwd, file), "utf8").split("\n");
    expect(after).toHaveLength(before.length);
    expect(after.filter((line, i) => line !== before[i])).toEqual([expect.stringContaining("#12ab34")]);
    expect(readFileSync(join(cwd, "docs/play/index.html"), "utf8")).toContain("#12ab34");
  } finally { child.kill(); }
});
