// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// Types for color.mjs, the colour helpers an addon imports as `breacan/color`. Colours are `#rrggbb` hex strings.
import type { TokenValues } from "./addon.ts";

export const SRGB_LINEAR_THRESHOLD: number;
/** One sRGB channel (0 to 1) as linear light. */
export function linear(channel: number): number;
/** WCAG relative luminance of a hex colour. */
export function luminance(hex: string): number;
/** WCAG contrast ratio of two hex colours, 1 to 21. */
export function contrast(a: string, b: string): number;
/** `pct` percent of `b` blended into `a`, in sRGB. */
export function mix(a: string, b: string, pct: number): string;
/** The candidate that reads best on a solid fill, as `[hex, ratio]`. */
export function bestOn(fill: string, candidates: string[]): [string, number];
/** `pct` percent of the accent over a surface, as a solid hex. */
export function stateLayer(surface: string, accent: string, pct: number): string;
/** The smallest mix of `accent` toward `text` that reaches AA (4.5:1) on every surface given. */
export function textSafe(accent: string, text: string, surfaces: string[]): { value: string; pct: number; worst: number };
/** Tokens keyed by path. */
export function byPath<T extends { path: string }>(tokens: T[]): Map<string, T>;
/** Hex to `[h, s, l]`, h in degrees and s, l in percent, rounded. */
export function hsl(hex: string): [number, number, number];
/** A `#rrggbb` hex as a DTCG 2025.10 colour value. */
export function srgb(hex: string): TokenValues["color"];
/** Hex to `[r, g, b]`, each 0 to 255. */
export function rgb(hex: string): [number, number, number];
