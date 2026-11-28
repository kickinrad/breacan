// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The core's public API: the addon contract's types, and the helpers that type a config, an addon and its parts.
export { CONTRACT, defineAddon, defineBase, defineCommand, defineConfig, defineOutput } from "./addon.ts";
export type {
  Addon, BaseContext, BasePart, BaseResult, CommandContext, CommandPart, Config, Mapping, OptionSpec, OptionsOf,
  OptionsSchema, OutputContext, OutputFile, OutputPart, Part, Permutation, Talk, Token, TokenTree, TokenValues,
} from "./addon.ts";
