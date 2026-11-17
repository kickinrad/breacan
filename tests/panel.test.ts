// The Kit panel's page in a DOM: a live update from the server redraws each control's status in place, and an edit
// whose request fails says so, frees the panel for the next edit, and carries the unsent value with it.
import { expect, test } from "bun:test";
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
const posts: object[] = [];
let failPosts = false;
Object.assign(globalThis, {
  window,
  document: window.document,
  CSS: window.CSS,
  location: window.location,
  EventSource: class { addEventListener(name: string, listener: (event: { data: string }) => void) { listeners[name] = listener; } },
  fetch: async (path: string, init?: { body: string }) => {
    if (!init) return Response.json(live("#922906"));
    if (failPosts) throw new TypeError("Failed to fetch");
    posts.push(JSON.parse(init.body));
    return Response.json({ contrast: [] });
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
  expect(posts.at(-1)).toEqual({ "palette.night.signal": "#111111", "palette.night.ink": "#000000" });
  expect($('[role="alert"]')).toBeNull();
});
