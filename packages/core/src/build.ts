// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// One build: theme.toml compiled over its base chain, resolved, then every output part run. `breacan build` writes
// the files and the receipt; `breacan check` builds in memory and holds the tree to the receipt instead.
// Both run with the cwd at the project root, the receipt's paths being relative to it.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { CommandContext, OutputFile, Part } from "./addon.ts";
import { stamp, wantsHeader } from "./header.mjs";
import { partsOf, type Project } from "./project.ts";
import { checkReceipt, readReceipt, receipt, RECEIPT } from "./receipt.mjs";
import { apply, compile, loadBases, readTheme, THEME } from "./theme.ts";
import pkg from "../package.json" with { type: "json" };

// The theme resolved, and the files every part read on the way.
const resolveTheme = async (project: Project) => {
  const theme = await readTheme(project.root, project.config.paths?.theme ?? THEME);
  const inputs = [theme.file, project.configFile].filter((path): path is string => path !== undefined);
  const read = async (path: string) => { inputs.push(path); return readFile(resolve(project.root, path), "utf8"); };
  const bases = await loadBases(theme, partsOf(project, "base"), (base) => base.tokens({ options: project.optionsFor(base), mode: "default", read }));
  return { theme, inputs, permutations: apply(compile(theme, bases)) };
};

const run = async (project: Project) => {
  const { theme, inputs, permutations } = await resolveTheme(project);
  const outputs: OutputFile[] = [];
  // Each path an output writes, checked before anything is written: inside the root, not an input or the
  // receipt, and written by one output only.
  const writers = new Map<string, string>();
  const reserved = new Set([...inputs, RECEIPT].map((path) => relative(project.root, resolve(project.root, path))));
  for (const output of partsOf(project, "output")) {
    const files = await output.write({ theme: { name: theme.name }, permutations, options: project.optionsFor(output) });
    for (const { path } of files) {
      const at = relative(project.root, resolve(project.root, path));
      if (at === "" || at.startsWith("..") || isAbsolute(at)) throw new Error(`output ${output.name} writes ${path}, which is outside the project`);
      if (reserved.has(at)) throw new Error(`output ${output.name} writes ${path}, which is ${at === RECEIPT ? "the receipt" : "an input of the build"}`);
      if (writers.has(at)) throw new Error(`outputs ${writers.get(at)} and ${output.name} both write ${at}`);
      writers.set(at, output.name);
    }
    outputs.push(...stamp(files, { name: theme.name }, output.name));
  }
  return { inputs, outputs, permutations };
};

export const build = async (project: Project) => {
  const { inputs, outputs } = await run(project);
  for (const { path, content } of outputs) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
  await writeFile(RECEIPT, await receipt({ engine: pkg.version, inputs, outputs, header: (output: OutputFile) => wantsHeader(output.path) }));
  return outputs;
};

export const check = async (project: Project) => {
  const { inputs, outputs } = await run(project);
  const held = await readReceipt();
  if (held === undefined) throw new Error(`${RECEIPT} is missing; run breacan build to make it, then commit it`);
  await checkReceipt(held, inputs.filter((path) => existsSync(path)), outputs.map((output) => output.path));
};

// What a command part gets: the project's verbs, not the project.
export const commandContext = (project: Project, part: Part, args: string[]): CommandContext<Record<string, any>> => ({
  root: project.root,
  args,
  options: project.optionsFor(part),
  build: () => build(project),
  check: () => check(project),
  tokens: async () => (await resolveTheme(project)).permutations,
  parts: (kind) => partsOf(project, kind),
});
