// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The core's own addon, the same shape as any other: the neutral base, the css output, and the build and check
// commands. Every project has it, first.
import { defineAddon } from "./addon.ts";
import { build, check } from "./build.ts";
import { srgb } from "./color.mjs";

const colour = (hex: string) => ({ $value: srgb(hex) });

export const builtins = defineAddon({
  name: "breacan",
  parts: [
    {
      kind: "base",
      name: "neutral",
      // shortcut: five roles, enough for the tracer; task 5b adds the full role set and its mapping table.
      tokens: () => ({
        color: {
          $type: "color",
          surface: { default: colour("#ffffff") },
          text: { default: colour("#1f2328") },
          accent: { default: colour("#0969da") },
          "on-accent": { default: colour("#ffffff") },
        },
        corner: { $type: "dimension", control: { $value: { value: 6, unit: "px" } } },
      }),
    },
    {
      kind: "output",
      name: "css",
      options: { path: { description: "The stylesheet's path from the project root.", default: "src/styles/tokens.css" } },
      write: ({ tokens, options }) => [{
        path: String(options.path),
        content: `:root {\n${tokens.map((token) => `  --${token.name}: ${token.css};`).join("\n")}\n}\n`,
      }],
    },
    {
      kind: "command",
      name: "build",
      summary: "Build every output from theme.toml and write breacan.receipt.json.",
      run: async ({ project }) => {
        for (const { path } of await build(project)) console.log(`wrote ${path}`);
      },
    },
    {
      kind: "command",
      name: "check",
      summary: "Fail when an output or input differs from breacan.receipt.json.",
      run: async ({ project }) => { await check(project); },
    },
  ],
});
