// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// `breacan/css`: a token as CSS, for outputs that write stylesheets.
import type { Token } from "./addon.ts";
import { kebab, scalar } from "./resolve.mjs";

/** The custom property's name, such as `--color-surface-default`. */
export const cssVar = (token: Pick<Token, "segments">): string => `--${kebab(token.segments)}`;

/** The token's value as a CSS scalar, such as `#fbf7f0` or `4px`. */
export const cssValue = (token: Pick<Token, "type" | "value">): string => String(scalar(token.type, token.value));
