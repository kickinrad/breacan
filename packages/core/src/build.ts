// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// One build: theme.toml compiled over its base chain, resolved, then every output part run. `breacan build` writes
// the files and the receipt; `breacan check` builds in memory and holds the tree to the receipt instead.
// Both run with the cwd at the project root, the receipt's paths being relative to it.
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { partsOf, type OutputFile, type Project } from "./addon.ts";
import { stamp, wantsHeader } from "./header.mjs";
import { checkReceipt, readReceipt, receipt, RECEIPT } from "./receipt.mjs";
import { apply, compile, readTheme, THEME } from "./theme.ts";
import pkg from "../package.json" with { type: "json" };

const ENGINE = pkg.version;

const run = async (project: Project) => {
  const theme = await readTheme(project.root, project.config.paths?.theme ?? THEME);
  const tokens = apply(compile(theme, partsOf(project, "base"), project.optionsFor));
  const outputs: OutputFile[] = [];
  for (const output of partsOf(project, "output")) {
    const files = await output.write({ theme, tokens, options: project.optionsFor(output) });
    outputs.push(...stamp(files, { name: theme.name }, output.name));
  }
  const inputs = [theme.file, project.configFile].filter((path): path is string => path !== undefined);
  return { inputs, outputs };
};

export const build = async (project: Project) => {
  const { inputs, outputs } = await run(project);
  for (const { path, content } of outputs) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
  await writeFile(RECEIPT, await receipt({ engine: ENGINE, inputs, outputs, header: (output: OutputFile) => wantsHeader(output.path) }));
  return outputs;
};

export const check = async (project: Project) => {
  const { inputs, outputs } = await run(project);
  const held = await readReceipt();
  if (held === undefined) throw new Error(`${RECEIPT} is missing; run breacan build to make it, then commit it`);
  await checkReceipt(held, inputs.filter((path) => existsSync(path)), outputs.map((output) => output.path));
};
