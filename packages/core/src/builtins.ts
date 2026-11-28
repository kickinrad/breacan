// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The core's own addon, the same shape as any other: the neutral base, the css output, and the build and check
// commands. Every project has it, first, and its options block in the config is `breacan`.
import { defineAddon, defineBase, defineCommand, defineOutput } from "./addon.ts";
import { cssValue, cssVar } from "./css.ts";
import { neutral } from "./neutral.ts";

export const builtins = defineAddon({
  name: "breacan",
  parts: [
    defineBase({ name: "neutral", tokens: () => ({ tokens: neutral }) }),
    defineOutput({
      name: "css",
      options: { path: { type: "string", description: "The css output's stylesheet, from the project root.", default: "src/styles/tokens.css" } },
      // shortcut: the first permutation only, as one :root block; modes arrive with [modes].
      write: ({ permutations: [{ tokens }], options }) => [{
        path: options.path,
        content: `:root {\n${tokens.map((token) => `  ${cssVar(token)}: ${cssValue(token)};`).join("\n")}\n}\n`,
      }],
    }),
    defineCommand({
      name: "build",
      summary: "Build every output from theme.toml and write breacan.receipt.json.",
      run: async ({ build }) => {
        for (const { path } of await build()) console.log(`wrote ${path}`);
      },
    }),
    defineCommand({
      name: "check",
      summary: "Fail when an output or input differs from breacan.receipt.json.",
      run: ({ check }) => check(),
    }),
  ],
});
