// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The core's public API: the addon contract's types, and the two helpers that type a config and an addon.
export { defineAddon, defineConfig } from "./addon.ts";
export type {
  Addon, BasePart, CommandContext, CommandPart, Config, InputPart, OptionSpec, Options, OptionsSchema, OutputContext,
  OutputFile, OutputPart, Part, Project, Theme, Token, TokenTree,
} from "./addon.ts";
