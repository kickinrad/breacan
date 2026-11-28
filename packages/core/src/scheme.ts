// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The scheme base: a theme's colours from a seed colour or from a scheme file. A seed goes through Material's
// tonal-spot scheme (@material/material-color-utilities, Apache-2.0). A file is a Base16 or Base24 scheme
// (tinted-theming's YAML) or an iTerm2 `.itermcolors` plist: base00 to base07 are the neutral ramp, the accents
// fill the roles, and the sixteen ANSI colours map as tinted-theming's shell templates map them. A file scheme also
// writes its palette and ANSI colours as `scheme.palette.*` and `scheme.ansi.*`. Everything else comes from the
// base it starts from, `neutral`.
import { Hct, SchemeTonalSpot, argbFromHex, hexFromArgb } from "@material/material-color-utilities";
import { defineAddon, defineBase, type BaseContext, type TokenTree } from "./addon.ts";
import { bestOn, luminance, mix, srgb, textSafe } from "./color.mjs";

const HEX = /^#?[0-9a-fA-F]{6}$/;
// tinted-theming's base16-shell order; Base24 has its own bright colours.
const ANSI16 = ["00", "08", "0B", "0A", "0D", "0E", "0C", "05", "03", "08", "0B", "0A", "0D", "0E", "0C", "07"];
const ANSI24: Record<number, string> = { 9: "12", 10: "14", 11: "13", 12: "16", 13: "17", 14: "15" };

interface Scheme { variant: "light" | "dark"; system: "base16" | "base24"; hex: Record<string, string>; ansi?: string[] }
const fail = (file: string, message: string): never => { throw new Error(`scheme: ${file} ${message}`); };

// A `.itermcolors` plist as a scheme: its colours are dicts of 0 to 1 sRGB components keyed by name.
// shortcut: the cursor colour and a colour space other than sRGB are ignored, until a role needs the cursor.
const readIterm = (file: string, text: string): Scheme => {
  const colours: Record<string, string> = {};
  for (const [, name, body] of text.matchAll(/<key>([^<]+) Color<\/key>\s*<dict>([\s\S]*?)<\/dict>/g)) {
    const parts = Object.fromEntries([...body.matchAll(/<key>(Red|Green|Blue) Component<\/key>\s*<real>([^<]+)<\/real>/g)].map(([, c, v]) => [c, Number(v)]));
    if (!["Red", "Green", "Blue"].every((c) => Number.isFinite(parts[c]))) fail(file, `has an unreadable colour for ${name}`);
    colours[name] = `#${["Red", "Green", "Blue"].map((c) => Math.round(parts[c] * 255).toString(16).padStart(2, "0")).join("")}`;
  }
  for (const name of ["Background", "Foreground", "Selection", ...Array.from({ length: 16 }, (_, i) => `Ansi ${i}`)]) {
    if (!colours[name]) fail(file, `has no colour for ${name}`);
  }
  const [bg, fg] = [colours.Background, colours.Foreground];
  const ansi = Array.from({ length: 16 }, (_, i) => colours[`Ansi ${i}`]);
  const hex = {
    "00": bg, "01": mix(bg, fg, 8), "02": colours.Selection, "03": mix(bg, fg, 40), "04": mix(bg, fg, 65), "05": fg,
    "06": mix(bg, fg, 85), "07": mix(bg, fg, 95), "08": ansi[1], "0B": ansi[2], "0A": ansi[3], "0D": ansi[4], "0E": ansi[5], "0C": ansi[6],
  };
  return { variant: luminance(bg) > 0.18 ? "light" : "dark", system: "base16", hex, ansi };
};

const readScheme = (file: string, text: string): Scheme => {
  if (file.endsWith(".itermcolors")) return readIterm(file, text);
  let scheme: any;
  try { scheme = Bun.YAML.parse(text); } catch (error) { throw new Error(`scheme: cannot read ${file} (${(error as Error).message})`, { cause: error }); }
  const system = scheme?.system ?? "base16";
  if (!["base16", "base24"].includes(system)) fail(file, `is a ${system} scheme; Breacán reads base16 and base24`);
  const palette = scheme.palette ?? {};
  const names = Array.from({ length: system === "base24" ? 24 : 16 }, (_, i) => `base${i.toString(16).toUpperCase().padStart(2, "0")}`);
  const hex: Record<string, string> = {};
  for (const name of names) {
    const value = palette[name] ?? palette[name.replace(/[A-F]$/, (c) => c.toLowerCase())];
    if (typeof value !== "string" || !HEX.test(value)) fail(file, `has no colour for ${name}`);
    hex[name.slice(4).toUpperCase()] = `#${value.replace("#", "").toLowerCase()}`;
  }
  if (!["light", "dark"].includes(scheme.variant)) fail(file, "names no variant (light or dark)");
  return { variant: scheme.variant, system, hex };
};

const colour = (hex: string) => ({ $value: srgb(hex) });
const roles = (surface: string, text: string, accent: string, onAccent: string): TokenTree => ({
  color: { $type: "color", surface: { default: colour(surface) }, text: { default: colour(text) }, accent: { default: colour(accent) }, "on-accent": { default: colour(onAccent) } },
});

// The roles from a file's neutral ramp and its blue accent, which the old scheme source made Material's primary.
const fromFile = ({ system, hex, ansi: given }: Scheme): TokenTree => {
  const surface = hex["00"];
  const text = hex["05"];
  const accent = textSafe(hex["0D"], text, [surface, hex["01"]]).value;
  const ansi = Object.fromEntries(ANSI16.map((slot, i) => [String(i), colour(given?.[i] ?? hex[system === "base24" && ANSI24[i] ? ANSI24[i] : slot])]));
  return {
    ...roles(surface, text, accent, bestOn(accent, [surface, text, "#ffffff", "#000000"])[0]),
    scheme: {
      $type: "color",
      palette: Object.fromEntries(Object.entries(hex).map(([slot, value]) => [`base${slot}`, colour(value)])),
      ansi,
    },
  };
};

const fromSeed = (seed: string, dark: boolean): TokenTree => {
  if (!HEX.test(seed)) throw new Error(`scheme: seed must be a hex like #3b5bdb, not ${JSON.stringify(seed)}`);
  const scheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(seed.startsWith("#") ? seed : `#${seed}`)), dark, 0);
  const hex = (argb: number) => hexFromArgb(argb);
  return roles(hex(scheme.surface), hex(scheme.onSurface), hex(scheme.primary), hex(scheme.onPrimary));
};

const options = {
  seed: { type: "string", description: "A hex colour, such as #3b5bdb, that Material's tonal-spot scheme grows the colours from." },
  file: { type: "string", description: "A Base16, Base24 or iTerm2 scheme file, from the project root. Give it or a seed, not both." },
  dark: { type: "boolean", description: "With a seed, make the dark scheme. A file gives its own variant.", default: false },
} as const;

const tokens = async ({ options, read, warn }: BaseContext<{ seed?: string; file?: string; dark: boolean }>) => {
  const { seed, file, dark } = options;
  if ((seed === undefined) === (file === undefined)) throw new Error("scheme: give one of the options seed and file");
  if (seed !== undefined) return { tokens: fromSeed(seed, dark) };
  const scheme = readScheme(file!, await read(file!));
  if (dark) warn(`${file} is a ${scheme.variant} scheme; the option dark does not apply to a file`);
  return { tokens: fromFile(scheme) };
};

/** The scheme addon: `addons: [scheme]` in breacan.config.ts, then `base = "scheme"` in theme.toml. */
export default defineAddon({
  name: "scheme",
  parts: [defineBase({ name: "scheme", base: "neutral", options, tokens })],
});
