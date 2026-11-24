// A Base16 or Base24 scheme (tinted-theming's YAML) as a kit's colours. base00 to base07 are the neutral ramp, the
// accents fill Material's accent roles, and the sixteen ANSI colours map as tinted-theming's shell templates map
// them. A scheme gives its own variant (light or dark); the other scheme stays the base's unless a second file
// gives it. Everything else comes from the base.
// Options: files (one or two scheme paths, at most one per variant).
import { readFileSync } from "node:fs";
import YAML from "yaml";
import { bestOn, mix, textSafe } from "../color.mjs";

const HEX = /^#?[0-9a-fA-F]{6}$/;
// tinted-theming's base16-shell order; Base24 has its own bright colours.
const ANSI16 = ["00", "08", "0B", "0A", "0D", "0E", "0C", "05", "03", "08", "0B", "0A", "0D", "0E", "0C", "07"];
const ANSI24 = { 9: "12", 10: "14", 11: "13", 12: "16", 13: "17", 14: "15" };

const read = (file) => {
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
const tree = ({ system, hex }) => {
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
  const ansi = Object.fromEntries(ANSI16.map((slot, i) => [String(i), colour(b(system === "base24" && ANSI24[i] ? ANSI24[i] : slot))]));
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
