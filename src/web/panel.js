// The Tune panel's page, served by breacan edit at /_kumiko/panel. It reads the kit from the server, sends every edit to
// it, and the server builds the edit and sends the result here. Inputs stay put while the rest redraws, so an open colour picker stays open.
import { controls, tuneView, valueOf } from "./tune.js";
import { contrast } from "../color.mjs";

// A mode's colour scheme by its surface, nearer black or white (as the playground decides it).
const scheme = (tokens) => {
  const surface = tokens.find((token) => token.path === "md.sys.color.surface")?.value;
  if (!surface) return "light"; // a kit with no Material roles
  return contrast(surface, "#000000") > contrast(surface, "#ffffff") ? "light" : "dark"; // lint: own black and white, the ends a scheme is measured against
};

const app = document.getElementById("app");
const kitCss = document.getElementById("kit-css");
const state = { edits: {}, live: true, problem: "" };
let kit;
let mode;

const loadFonts = (hrefs) => { for (const href of hrefs) if (!document.querySelector(`link[href="${CSS.escape(href)}"]`)) document.head.append(Object.assign(document.createElement("link"), { rel: "stylesheet", href })); };
const draw = () => {
  const names = Object.keys(kit.modes);
  const switcher = names.length > 1 ? `<div class="modes" role="group" aria-label="Mode">${names.map((each) => `<button data-mode="${each}" aria-pressed="${each === mode}">${each[0].toUpperCase()}${each.slice(1)}</button>`).join("")}</div>` : "";
  app.innerHTML = tuneView(kit, mode, state, switcher);
};
// Redraws the change row and each control's status, leaving the inputs alone.
const refresh = () => {
  const panel = document.querySelector("[data-tune-panel]");
  if (!panel) return draw();
  const fresh = Object.assign(document.createElement("div"), { innerHTML: tuneView(kit, mode, state) }).firstElementChild;
  panel.querySelector("[data-changes]").replaceWith(fresh.querySelector("[data-changes]"));
  panel.querySelector("[role=alert]")?.remove();
  const alert = fresh.querySelector("[role=alert]");
  if (alert) panel.querySelector("[data-changes]").after(alert);
  for (const item of fresh.querySelectorAll("[data-item]")) {
    const shown = panel.querySelector(`[data-item="${CSS.escape(item.dataset.item)}"]`);
    if (!shown) continue;
    // A colour shows its contrast status; a length or time has none, and an edit can add or clear it.
    const was = shown.querySelector(".status");
    const now = item.querySelector(".status");
    if (was && now) was.replaceWith(now);
    else if (now) shown.querySelector("label").after(now);
    else was?.remove();
    shown.querySelector("[data-tune-undo]").hidden = !(item.dataset.item in state.edits);
  }
};
const apply = (live) => {
  const first = !kit;
  kit = live.kit;
  kitCss.textContent = live.css;
  loadFonts(live.fonts);
  if (first) {
    mode = Object.keys(kit.modes)[0];
    document.documentElement.dataset.theme = scheme(kit.modes[mode]);
    return draw();
  }
  refresh();
};

const post = async (path, body) => (await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
// Values the server has not yet confirmed, and the request carrying them.
let queued = {};
let sending;
const unsent = () => Object.keys(queued).length;
// Sends the queued values; one request at a time, the latest values winning. A value leaves the queue only once the
// server has it, so a failed request leaves it for the next edit or Save to carry.
const flush = async () => {
  try {
    while (unsent()) {
      const body = queued;
      const result = await post("/_kumiko/edit", body);
      for (const [path, value] of Object.entries(body)) if (queued[path] === value) delete queued[path];
      state.problem = result.error ?? "";
    }
  } catch (error) {
    // The server is gone or answered with something other than JSON.
    state.problem = `Not sent: ${error.message}`;
  }
  refresh();
};
const send = (change) => {
  for (const [path, value] of Object.entries(change)) if (value === null) delete state.edits[path]; else state.edits[path] = value;
  queued = { ...queued, ...change };
  // Cleared on the promise itself: a flush with nothing to send finishes before this line could assign it.
  return (sending ??= flush().finally(() => { sending = undefined; }));
};

document.addEventListener("input", (event) => {
  const control = event.target.closest("[data-tune]");
  if (!control) return;
  const item = controls(kit, mode, state.edits).flatMap((group) => group.items).find((each) => each.path === control.dataset.tune);
  const value = valueOf(item, control.value);
  if (item.unit) control.closest(".tune").querySelector("output").textContent = value;
  const saved = item.unit ? `${item.saved}${item.unit}` : valueOf(item, item.saved);
  send({ [item.path]: JSON.stringify(value) === JSON.stringify(saved) ? null : value });
});
document.addEventListener("click", async (event) => {
  const modeButton = event.target.closest("[data-mode]");
  if (modeButton) {
    mode = modeButton.dataset.mode;
    document.documentElement.dataset.theme = scheme(kit.modes[mode]);
    return draw();
  }
  const undo = event.target.closest("[data-tune-undo]");
  if (undo || event.target.closest("[data-tune-reset]")) {
    await send(Object.fromEntries((undo ? [undo.dataset.tuneUndo] : Object.keys(state.edits)).map((path) => [path, null])));
    return draw();
  }
  if (event.target.closest("[data-tune-save]")) {
    try {
      // Save writes what the server holds, so every edit must reach it first.
      await sending;
      if (unsent()) await send({});
      if (unsent()) {
        state.problem = `Not saved: ${unsent()} edit${unsent() === 1 ? "" : "s"} not sent`;
        return draw();
      }
      const result = await post("/_kumiko/save", {});
      state.problem = result.error ?? "";
      if (!result.error) state.edits = {};
    } catch (error) {
      state.problem = `Not saved: ${error.message}`;
    }
    return draw();
  }
});

fetch("/_kumiko/live").then((response) => response.json()).then((live) => {
  apply(live);
  const events = new EventSource("/_kumiko/events");
  events.addEventListener("live", (event) => apply(JSON.parse(event.data)));
  events.addEventListener("reload", () => location.reload());
  events.addEventListener("problem", (event) => { state.problem = JSON.parse(event.data).message; refresh(); });
});
