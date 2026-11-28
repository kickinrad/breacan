// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The neutral base: a value for every core role, so any chain resolves them all. It is the root a platform base
// starts from, and what a role keeps when that base has no value of its own. The colours are a plain light scheme
// after GitHub Primer's light theme (MIT); the type, space, motion and state values are our own judgment. The
// optional accent-2 and accent-3 families alias color.accent.*, so a theme's accent fills them too.
import type { TokenTree } from "./addon.ts";
import { srgb } from "./color.mjs";

// The alpha sits before the hex, where the 0.x dtcg output writes it, so both write the same bytes.
const colour = (hex: string, alpha?: number) => {
  const { hex: plain, ...value } = srgb(hex);
  return { $value: { ...value, ...(alpha !== undefined && { alpha }), hex: plain } };
};
const px = (value: number) => ({ $value: { value, unit: "px" } });
const ms = (value: number) => ({ $value: { value, unit: "ms" } });
const alias = (path: string) => ({ $value: `{${path}}` });
const followsAccent = () => ({ default: alias("color.accent.default"), muted: alias("color.accent.muted") });
const followsOnAccent = () => ({ default: alias("color.on-accent.default"), muted: alias("color.on-accent.muted") });
// A type role: its face aliases a font role, so setting the font moves every type role that uses it.
const type = (font: string, size: number, weight: number, lineHeight: number) => ({
  $value: { fontFamily: `{font.${font}}`, fontSize: { value: size, unit: "px" }, fontWeight: weight, lineHeight, letterSpacing: { value: 0, unit: "px" } },
});

export const neutral: TokenTree = {
  color: {
    $type: "color",
    surface: { default: colour("#ffffff"), raised: colour("#f6f8fa"), overlay: colour("#ffffff"), sunken: colour("#eff2f5"), inverse: colour("#24292f") },
    text: { default: colour("#1f2328"), muted: colour("#59636e"), subtle: colour("#656d76"), inverse: colour("#ffffff") },
    accent: { default: colour("#0969da"), muted: colour("#ddf4ff") },
    "on-accent": { default: colour("#ffffff"), muted: colour("#0a3069") },
    border: { default: colour("#818b98"), subtle: colour("#d1d9e0") },
    status: { danger: colour("#cf222e"), success: colour("#1a7f37"), warning: colour("#9a6700"), info: colour("#0969da") },
    "on-status": { danger: colour("#ffffff"), success: colour("#ffffff"), warning: colour("#ffffff"), info: colour("#ffffff") },
    focus: colour("#0969da"),
    scrim: colour("#1f2328", 0.4),
    "accent-2": followsAccent(),
    "on-accent-2": followsOnAccent(),
    "accent-3": followsAccent(),
    "on-accent-3": followsOnAccent(),
  },
  type: {
    $type: "typography",
    display: type("display", 36, 600, 1.25),
    title: type("display", 28, 600, 1.25),
    heading: type("display", 20, 600, 1.4),
    body: type("body", 16, 400, 1.5),
    label: type("body", 14, 500, 1.4),
    caption: type("body", 12, 400, 1.35),
  },
  font: {
    $type: "fontFamily",
    body: { $value: ["system-ui", "sans-serif"] },
    display: alias("font.body"),
    mono: { $value: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"] },
  },
  icon: { set: { $type: "string", $value: "Lucide" } },
  corner: { $type: "dimension", control: px(6), container: px(8), overlay: px(12), full: px(9999) },
  space: {
    $type: "dimension",
    "3xs": px(2), "2xs": px(4), xs: px(8), sm: px(12), md: px(16), lg: px(24), xl: px(32), "2xl": px(48), "3xl": px(64),
  },
  // WCAG 2.2's enhanced target size (2.5.5) is 44 by 44 CSS pixels.
  size: { touch: { $type: "dimension", ...px(44) } },
  density: { $type: "number", $value: 0 },
  elevation: { $type: "dimension", raised: px(1), overlay: px(6) },
  motion: {
    duration: { $type: "duration", short: ms(100), medium: ms(250), long: ms(400) },
    easing: { $type: "cubicBezier", standard: { $value: [0.4, 0, 0.2, 1] }, enter: { $value: [0, 0, 0.2, 1] }, exit: { $value: [0.4, 0, 1, 1] } },
  },
  state: { $type: "number", hover: { $value: 0.08 }, pressed: { $value: 0.12 }, focus: { $value: 0.12 }, disabled: { $value: 0.38 } },
};
