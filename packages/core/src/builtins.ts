// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The core's own addon, the same shape as any other: the neutral base, the css output, and the build and check
// commands. Every project has it, first, and its options block in the config is `breacan`.
import { defineAddon, defineBase, defineCommand, defineOutput } from "./addon.ts";
import { srgb } from "./color.mjs";
import { cssValue, cssVar } from "./css.ts";
import { lint } from "./lint.ts";

const colour = (hex: string) => ({ $value: srgb(hex) });

export const builtins = defineAddon({
  name: "breacan",
  parts: [
    defineBase({
      name: "neutral",
      // shortcut: five roles, enough for the tracer; task 5b adds the full role set and its mapping table.
      tokens: () => ({
        tokens: {
          color: {
            $type: "color",
            surface: { default: colour("#ffffff") },
            text: { default: colour("#1f2328") },
            accent: { default: colour("#0969da") },
            "on-accent": { default: colour("#ffffff") },
          },
          corner: { $type: "dimension", control: { $value: { value: 6, unit: "px" } } },
        },
      }),
    }),
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
    defineCommand({
      name: "lint",
      summary: "Flag a hand-typed value the theme defines in the files or folders given (default: here).",
      run: ({ args, parts }) => {
        const rules = (["base", "output", "command"] as const).flatMap((kind) => parts(kind).flatMap((part) => part.rules ?? []));
        const found = lint(args.length ? args : ["."], rules);
        if (found.length) {
          console.log(found.join("\n"));
          throw new Error(`lint found ${found.length} hand-typed value${found.length === 1 ? "" : "s"}`);
        }
      },
    }),
  ],
});
