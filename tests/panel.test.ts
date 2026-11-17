// The Kit panel's page in a DOM: a live update from the server redraws each control's status in place; an edit whose
// request fails says so, frees the panel, and stays queued until the server has it; Save sends the queue first and
// refuses while any of it is unsent.
import { afterAll, expect, test } from "bun:test";
import { Window } from "happy-dom";

const tokens = (palette: Record<string, string>) => [
  ...Object.entries(palette).map(([key, value]) => ({ path: `acme.palette.${key}`, value, type: "color" })),
  { path: "md.sys.color.surface", value: palette.ink, type: "color" },
  { path: "md.sys.color.on-surface", value: palette.paper, type: "color" },
  { path: "md.sys.color.primary", value: palette.signal, type: "color" },
  { path: "md.sys.color.on-primary", value: palette["on-signal"], type: "color" },
  { path: "acme.space.base", value: "8px", type: "dimension" },
];
const kit = (signal: string) => ({
  name: "acme",
  modes: { night: tokens({ ink: "#101010", paper: "#eeeeee", signal, "on-signal": "#ffffff" }) },
  tune: { faces: { brand: ["Archivo", "sans-serif"] }, tokens: ["acme.space.base"] },
  pairs: [{ fg: "md.sys.color.on-primary", bg: "md.sys.color.primary", min: 4.5 }],
});
const live = (signal: string) => ({ css: ":root {}", fonts: [], kit: kit(signal), contrast: [], edits: {} });

const window = new Window({ url: "http://127.0.0.1:4400/_kumiko/panel" });
window.document.body.innerHTML = '<style id="kit-css"></style><div id="app"></div>';
const listeners: Record<string, (event: { data: string }) => void> = {};
const posts: { path: string; body: object }[] = [];
let failPosts = false;
const stubbed = ["window", "document", "CSS", "location", "EventSource", "fetch"] as const;
const originals = Object.fromEntries(stubbed.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
afterAll(() => {
  for (const name of stubbed) {
    if (originals[name]) Object.defineProperty(globalThis, name, originals[name]);
    else delete (globalThis as Record<string, unknown>)[name];
  }
  window.close();
});
Object.assign(globalThis, {
  window,
  document: window.document,
  CSS: window.CSS,
  location: window.location,
  EventSource: class { addEventListener(name: string, listener: (event: { data: string }) => void) { listeners[name] = listener; } },
  fetch: async (path: string, init?: { body: string }) => {
    if (!init) return Response.json(live("#922906"));
    if (failPosts) throw new TypeError("Failed to fetch");
    posts.push({ path, body: JSON.parse(init.body) });
    return Response.json(path === "/_kumiko/save" ? { saved: [] } : { contrast: [] });
  },
});
await import("../src/web/panel.js");
await Bun.sleep(10);
const $ = (selector: string) => window.document.querySelector(selector);
const edit = async (path: string, value: string) => {
  const control = $(`[data-tune="${path}"]`) as unknown as { value: string; dispatchEvent: (event: unknown) => void };
  control.value = value;
  control.dispatchEvent(new window.Event("input", { bubbles: true }));
  await Bun.sleep(10);
};

test("a live update redraws each control's status in place", () => {
  expect($('[data-item="palette.night.signal"] .status')?.textContent).toContain(":1");
  expect($('[data-item="tokens.acme.space.base"] .status, [data-item="acme.space.base"] .status')).toBeNull();
  listeners.live({ data: JSON.stringify(live("#fd5416")) });
  expect($('[data-item="palette.night.signal"] .status')?.className).toContain("fail");
});

test("a failed edit says so, frees the panel, and the next edit carries its value", async () => {
  failPosts = true;
  await edit("palette.night.signal", "#111111");
  expect($('[role="alert"]')?.textContent).toContain("Not sent");
  failPosts = false;
  await edit("palette.night.ink", "#000000");
  expect(posts.at(-1)).toEqual({ path: "/_kumiko/edit", body: { "palette.night.signal": "#111111", "palette.night.ink": "#000000" } });
  expect($('[role="alert"]')).toBeNull();
});

const click = async (selector: string) => {
  ($(selector) as unknown as { click: () => void }).click();
  await Bun.sleep(10);
};

test("Save refuses while an edit is unsent, and sends the queue before saving", async () => {
  failPosts = true;
  await edit("palette.night.paper", "#dddddd");
  await click("[data-tune-save]");
  expect($('[role="alert"]')?.textContent).toBe("Not saved: 1 edit not sent");
  expect($("[data-changes]")?.textContent).toContain("unsaved change");
  failPosts = false;
  await click("[data-tune-save]");
  expect(posts.slice(-2)).toEqual([{ path: "/_kumiko/edit", body: { "palette.night.paper": "#dddddd" } }, { path: "/_kumiko/save", body: {} }]);
  expect($("[data-changes]")?.textContent).toContain("No changes");
});

test("a failed undo stays queued until the server has it", async () => {
  await edit("palette.night.signal", "#222222");
  failPosts = true;
  await click('[data-tune-undo="palette.night.signal"]');
  expect($('[role="alert"]')?.textContent).toContain("Not sent");
  failPosts = false;
  await edit("palette.night.ink", "#050505");
  expect(posts.at(-1)?.body).toEqual({ "palette.night.signal": null, "palette.night.ink": "#050505" });
});
