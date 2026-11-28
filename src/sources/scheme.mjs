// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// A Base16 or Base24 scheme (tinted-theming's YAML) as a kit's colours. base00 to base07 are the neutral ramp, the
// accents fill Material's accent roles, and the sixteen ANSI colours map as tinted-theming's shell templates map
// them. A scheme gives its own variant (light or dark); the other scheme stays the base's unless a second file
// gives it. Everything else comes from the base.
// An iTerm2 `.itermcolors` file is read too: ANSI 0 to 15 are the ANSI colours, ANSI 1 to 6 the accents, the background and
// foreground base00 and base05, the selection base02, and the steps between them are mixed (iTerm2 has no ramp).
// Options: files (one or two scheme paths, at most one per variant).
import { readFileSync } from "node:fs";
import YAML from "yaml";
import { bestOn, luminance, mix, textSafe } from "../../packages/core/src/color.mjs";

const HEX = /^#?[0-9a-fA-F]{6}$/;
// tinted-theming's base16-shell order; Base24 has its own bright colours.
const ANSI16 = ["00", "08", "0B", "0A", "0D", "0E", "0C", "05", "03", "08", "0B", "0A", "0D", "0E", "0C", "07"];
const ANSI24 = { 9: "12", 10: "14", 11: "13", 12: "16", 13: "17", 14: "15" };

// A `.itermcolors` plist as a scheme: its colours are dicts of 0 to 1 sRGB components keyed by name.
// shortcut: the cursor colour and a colour space other than sRGB are ignored, until a role needs the cursor.
const readIterm = (file) => {
  let text;
  try { text = readFileSync(file, "utf8"); } catch (error) { throw new Error(`scheme: cannot read ${file} (${error.message})`); }
  const colours = {};
  for (const [, name, body] of text.matchAll(/<key>([^<]+) Color<\/key>\s*<dict>([\s\S]*?)<\/dict>/g)) {
    const parts = Object.fromEntries([...body.matchAll(/<key>(Red|Green|Blue) Component<\/key>\s*<real>([^<]+)<\/real>/g)].map(([, c, v]) => [c, Number(v)]));
    if (!["Red", "Green", "Blue"].every((c) => Number.isFinite(parts[c]))) throw new Error(`scheme: ${file} has an unreadable colour for ${name}`);
    colours[name] = `#${["Red", "Green", "Blue"].map((c) => Math.round(parts[c] * 255).toString(16).padStart(2, "0")).join("")}`;
  }
  for (const name of ["Background", "Foreground", "Selection", ...Array.from({ length: 16 }, (_, i) => `Ansi ${i}`)]) {
    if (!colours[name]) throw new Error(`scheme: ${file} has no colour for ${name}`);
  }
  const [bg, fg] = [colours.Background, colours.Foreground];
  const ansi = Array.from({ length: 16 }, (_, i) => colours[`Ansi ${i}`]);
  const hex = {
    "00": bg, "01": mix(bg, fg, 8), "02": colours.Selection, "03": mix(bg, fg, 40), "04": mix(bg, fg, 65), "05": fg,
    "06": mix(bg, fg, 85), "07": mix(bg, fg, 95), "08": ansi[1], "0B": ansi[2], "0A": ansi[3], "0D": ansi[4], "0E": ansi[5], "0C": ansi[6],
  };
  return { variant: luminance(bg) > 0.18 ? "light" : "dark", system: "base16", hex, ansi, name: file };
};

const read = (file) => {
  if (file.endsWith(".itermcolors")) return readIterm(file);
  let scheme;
  try { scheme = YAML.parse(readFileSync(file, "utf8")); } catch (error) { throw new Error(`scheme: cannot read ${file} (${error.message})`); }
  const system = scheme?.system ?? "base16";
  if (!["base16", "base24"].includes(system)) throw new Error(`scheme: ${file} is a ${system} scheme; Breacán reads base16 and base24`);
  const palette = scheme.palette ?? {};
  const slots = system === "base24" ? 24 : 16;
  const names = Array.from({ length: slots }, (_, i) => `base${i.toString(16).toUpperCase().padStart(2, "0")}`);
  const hex = {};
  for (const name of names) {
    const value = palette[name] ?? palette[name.replace(/[A-F]$/, (c) => c.toLowerCase())];
    if (typeof value !== "string" || !HEX.test(value)) throw new Error(`scheme: ${file} has no colour for ${name}`);
    hex[name.slice(4).toUpperCase()] = `#${value.replace("#", "").toLowerCase()}`;
  }
  if (!["light", "dark"].includes(scheme.variant)) throw new Error(`scheme: ${file} names no variant (light or dark)`);
  return { variant: scheme.variant, system, hex, name: scheme.name };
};

// One scheme's colour roles and its palette and ANSI tokens, as a token tree.
const tree = ({ system, hex, ansi: given }) => {
  const b = (slot) => hex[slot];
  const surface = b("00");
  const text = b("05");
  const roles = {
    surface, background: surface, "surface-dim": surface, "surface-bright": b("02"),
    "surface-container-lowest": b(system === "base24" ? "11" : "00"), "surface-container-low": b(system === "base24" ? "10" : "01"),
    "surface-container": b("01"), "surface-container-high": b("01"), "surface-container-highest": b("02"), "surface-variant": b("02"),
    "on-surface": text, "on-background": text, "on-surface-variant": textSafe(b("04"), text, [b("00"), b("01"), b("02")]).value,
    outline: b("03"), "outline-variant": b("02"), "inverse-surface": text, "inverse-on-surface": surface,
  };
  for (const [role, slot] of Object.entries({ primary: "0D", secondary: "0C", tertiary: "0E", error: "08" })) {
    const accent = textSafe(b(slot), text, [surface, b("01")]).value;
    const container = mix(surface, b(slot), 20);
    Object.assign(roles, {
      [role]: accent, [`on-${role}`]: bestOn(accent, [surface, text, "#ffffff", "#000000"])[0],
      [`${role}-container`]: container, [`on-${role}-container`]: textSafe(b(slot), text, [container]).value,
    });
  }
  roles["surface-tint"] = roles.primary;
  const colour = (value) => ({ $type: "color", $value: value });
  const ansi = Object.fromEntries(ANSI16.map((slot, i) => [String(i), colour(given?.[i] ?? b(system === "base24" && ANSI24[i] ? ANSI24[i] : slot))]));
  return {
    md: { sys: { color: Object.fromEntries(Object.entries(roles).map(([role, value]) => [role, colour(value)])) } },
    scheme: { palette: Object.fromEntries(Object.entries(hex).map(([slot, value]) => [`base${slot}`, colour(value)])), ansi },
  };
};

export default {
  slot: "source",
  name: "scheme",
  reads: [],
  writes: {},
  async run({ options }) {
    const files = options.files;
    if (!Array.isArray(files) || !files.length || files.length > 2 || files.some((file) => typeof file !== "string")) throw new Error('scheme option "files" must list one or two scheme files');
    const schemes = files.map(read);
    if (schemes.length === 2 && schemes[0].variant === schemes[1].variant) throw new Error(`scheme: both files are ${schemes[0].variant} schemes; give one light and one dark`);
    const trees = Object.fromEntries(schemes.map((scheme) => [scheme.variant, tree(scheme)]));
    // With one file, the other scheme keeps the base's colours and shares the scheme's palette and ANSI tokens.
    for (const variant of ["light", "dark"]) trees[variant] ??= { scheme: Object.values(trees)[0].scheme };
    return trees;
  },
};
