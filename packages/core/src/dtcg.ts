// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The dtcg output: the theme's resolved tokens as DTCG 2025.10 files that any tool reads, Breacán too. <path>/<name>.tokens.json
// holds the tokens, aliases resolved, and <path>/<name>.resolver.json is a DTCG resolver over it. The files are the
// 0.x dtcg output's format byte for byte; its mode and platform files come with modes and the dial.
import { join, resolve } from "node:path";
import { defineAddon, defineOutput, type OutputContext, type OutputFile, type Token } from "./addon.ts";
import { text } from "./header.mjs";

const options = {
  path: { type: "string", description: "The folder the DTCG files go in, from the project root.", default: "ports/tokens" },
} as const;

const file = (tokens: Token[], description: string) => {
  const root: Record<string, any> = { $description: description };
  for (const token of tokens) {
    let node = root;
    for (const segment of token.segments.slice(0, -1)) {
      node = node[segment] ??= {};
      if ("$value" in node) throw new Error(`dtcg: ${token.path} sits inside the token ${segment}`);
    }
    node[token.segments.at(-1)!] = { $type: token.type, $value: token.value, ...(token.description && { $description: token.description }) };
  }
  return `${JSON.stringify(root, null, 2)}\n`;
};

const write = ({ theme: { name }, permutations: [{ tokens }], options }: OutputContext<{ path: string }>): OutputFile[] => {
  const dir = options.path;
  if (resolve(dir) === resolve("tokens")) throw new Error("dtcg: tokens/ is the project's own token source; write the output elsewhere");
  const header = text({ name }, "dtcg");
  const resolver = {
    name, version: "2025.10", description: header,
    sets: { base: { sources: [{ $ref: `${name}.tokens.json` }] } },
    resolutionOrder: [{ $ref: "#/sets/base" }],
  };
  return [
    { path: join(dir, `${name}.tokens.json`), content: file(tokens, header) },
    { path: join(dir, `${name}.resolver.json`), content: `${JSON.stringify(resolver, null, 2)}\n` },
  ];
};

/** The dtcg addon: `addons: [dtcg]` in breacan.config.ts. */
export default defineAddon({ name: "dtcg", parts: [defineOutput({ name: "dtcg", options, write })] });
