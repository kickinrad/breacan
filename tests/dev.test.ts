// kumiko dev: an edit is built in memory and sent live; only its own pages may edit or save; save writes exactly the
// edited values into theme.toml, and the outputs pass --check after (tests/playground/ is the kit).
import { afterAll, expect, test } from "bun:test";
import { cpSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { join } from "node:path";
import { watchSources } from "../src/dev.mjs";
import { command, root, run, scratch } from "./helpers";

const dir = scratch("kumiko-dev-");
for (const entry of ["design", "tokens", "VERSION", "kumiko.config.mjs"]) cpSync(join(root, "tests/playground", entry), join(dir, entry), { recursive: true });
const port = 4800 + Math.floor(Math.random() * 1000);
const server = Bun.spawn([...command, "dev", "--port", String(port)], { cwd: dir, stdout: "pipe", stderr: "pipe" });
afterAll(() => server.kill());
const origin = `http://localhost:${port}`;
const ready = (async () => { for (const _ of Array(100)) { try { if ((await fetch(`${origin}/_kumiko/live`)).ok) return; } catch {} await Bun.sleep(100); } throw new Error("kumiko dev did not start"); })();
const post = (path: string, body: object, from = origin) => fetch(`${origin}${path}`, { method: "POST", headers: { Origin: from, "Content-Type": "application/json" }, body: JSON.stringify(body) });
const live = async () => (await fetch(`${origin}/_kumiko/live`)).json();
const theme = readFileSync(join(dir, "design/theme.toml"), "utf8");

test("an edit reaches the live CSS and the kit's tokens without touching theme.toml", async () => {
  await ready;
  expect((await live()).css).toContain("--acme-palette-blue: light-dark(#2e7de9, #7aa2f7);");
  expect((await post("/_kumiko/edit", { "palette.night.blue": "#ff0000" })).status).toBe(200);
  const now = await live();
  expect(now.css).toContain("--acme-palette-blue: light-dark(#2e7de9, #ff0000);");
  expect(now.css).toContain("--md-sys-color-primary: light-dark(#2e7de9, #ff0000);");
  expect(now.kit.modes.night.find((token: { path: string }) => token.path === "md.sys.color.primary").value).toBe("#ff0000");
  expect(readFileSync(join(dir, "design/theme.toml"), "utf8")).toBe(theme);
  expect(await (await fetch(`${origin}/_kumiko/bridge.js`)).text()).toContain("kumiko:live");
});

test("a page elsewhere cannot edit or save", async () => {
  await ready;
  expect((await post("/_kumiko/edit", { "palette.night.blue": "#00ff00" }, "https://example.com")).status).toBe(403);
  expect((await post("/_kumiko/save", {}, "https://example.com")).status).toBe(403);
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
  expect(await raw("/_kumiko/edit", `rebind.example:${port}`, '{"palette.night.blue":"#00ff00"}')).toBe(403);
  expect(await raw("/_kumiko/save", `rebind.example:${port}`, "{}")).toBe(403);
  expect(await raw("/_kumiko/edit", `127.0.0.1:${port}`, "{}")).toBe(200);
});

test("a page on a rebound name cannot read the kit or the project's files", async () => {
  await ready;
  // The server listens on 127.0.0.1 alone, so it answers to no IPv6 name either.
  expect(await raw("/VERSION", `[::1]:${port}`)).toBe(403);
  for (const path of ["/VERSION", "/_kumiko/live", "/_kumiko/panel", "/_kumiko/bridge.js"]) {
    expect(await raw(path, `rebind.example:${port}`)).toBe(403);
    expect(await raw(path, `localhost:${port}`)).toBe(200);
  }
});

test("a scratch directory stays in the temp folder", () => {
  expect(() => scratch("../escape-")).toThrow("not a path");
});

test("a symlink cannot serve a file from outside the project", async () => {
  await ready;
  const outside = scratch("kumiko-outside-");
  writeFileSync(join(outside, "secret.txt"), "outside");
  symlinkSync(join(outside, "secret.txt"), join(dir, "leak.txt"));
  expect((await fetch(`${origin}/leak.txt`)).status).toBe(404);
  expect((await fetch(`${origin}/VERSION`)).status).toBe(200);
});

// Everything the event stream sends for a while.
const listen = async (ms: number, during: () => unknown = () => {}) => {
  const reader = (await fetch(`${origin}/_kumiko/events`)).body!.getReader();
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
  await post("/_kumiko/edit", { "faces.brand": ["Archivo", "serif"] });
  const events = await listen(1000, async () => expect((await post("/_kumiko/save", {})).status).toBe(200));
  expect(events).toContain("event: live");
  expect(events).not.toContain("event: reload");
  const saved = readFileSync(join(dir, "design/theme.toml"), "utf8").split("\n");
  const changed = saved.filter((line, i) => line !== theme.split("\n")[i]);
  expect(changed).toEqual(['blue = "#ff0000"', 'brand = ["Archivo", "serif"]']);
  expect(run(dir, "--check").exitCode).toBe(0);
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
  const page = await (await fetch(`${origin}/_kumiko/panel`)).text();
  expect(page).toContain('<style id="kit-css">');
  expect(page).toContain("--acme-palette-ink");
  expect(page).toContain("data-tune-panel");
});

test("the event stream stays open past Bun's idle timeout", async () => {
  await ready;
  const reader = (await fetch(`${origin}/_kumiko/events`)).body!.getReader();
  // Events from an earlier test may arrive meanwhile; only the stream ending, or failing, fails this.
  let ended: unknown = false;
  (async () => { while (!(await reader.read()).done); ended = "closed"; })().catch((error) => { ended = error; });
  await Bun.sleep(13_000);
  expect(ended).toBe(false);
  await reader.cancel();
}, 20_000);
