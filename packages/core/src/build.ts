// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// One build: theme.toml compiled over its base chain, resolved, then every output part run. `breacan build` writes
// the files and the receipt; `breacan check` builds in memory and holds the tree to the receipt instead.
// Both run with the cwd at the project root, the receipt's paths being relative to it.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { CommandContext, OutputFile, OutputPart, Part, Talk } from "./addon.ts";
import { stamp, wantsHeader } from "./header.mjs";
import { partsOf, type Project } from "./project.ts";
import { checkReceipt, readReceipt, receipt, RECEIPT } from "./receipt.mjs";
import { apply, compile, loadBases, readTheme, THEME } from "./theme.ts";
import pkg from "../package.json" with { type: "json" };

// What a part gets besides its result: reading a project file, and telling the person running the build.
const talk = (part: Part, read: Talk["read"]): Talk => ({
  read,
  log: (message) => console.log(`${part.name}: ${message}`),
  warn: (message) => console.warn(`warning: ${part.name}: ${message}`),
});

// The theme resolved, and the files every part read on the way.
const resolveTheme = async (project: Project) => {
  const theme = await readTheme(project.root, project.config.paths?.theme ?? THEME);
  const inputs = [theme.file, project.configFile].filter((path): path is string => path !== undefined);
  const read = async (path: string) => { inputs.push(path); return readFile(resolve(project.root, path), "utf8"); };
  const bases = await loadBases(theme, partsOf(project, "base"), (base) => base.tokens({ options: project.optionsFor(base), mode: "default", ...talk(base, read) }));
  return { theme, inputs, read, permutations: apply(compile(theme, bases)) };
};

const run = async (project: Project) => {
  const { theme, inputs, read, permutations } = await resolveTheme(project);
  const outputs: OutputFile[] = [];
  const parts = partsOf(project, "output");
  // Each output runs once, whether the loop or another output asks first. `waiting` holds the edges of every output
  // now waiting on another, across all that run together, so an edge that would close a cycle fails, naming the
  // chain, instead of hanging.
  const written = new Map<OutputPart, Promise<OutputFile[]>>();
  const waiting = new Map<string, Set<string>>();
  const reach = (from: string, to: string, seen = new Set<string>()): string[] | undefined => {
    if (from === to) return [from];
    if (seen.has(from)) return undefined;
    seen.add(from);
    for (const next of waiting.get(from) ?? []) {
      const rest = reach(next, to, seen);
      if (rest) return [from, ...rest];
    }
    return undefined;
  };
  const files = (output: OutputPart): Promise<OutputFile[]> => {
    let result = written.get(output);
    if (!result) {
      result = Promise.resolve(output.write({
        theme: { name: theme.name },
        permutations,
        options: project.optionsFor(output),
        ...talk(output, read),
        output: async (name) => {
          const found = parts.find((each) => each.name === name);
          if (!found) throw new Error(`output ${output.name} asks for the output "${name}", which this project lacks (outputs: ${parts.map((each) => each.name).join(", ")})`);
          const back = reach(name, output.name);
          if (back) throw new Error(`outputs ask for each other: ${[output.name, ...back].join(" → ")}`);
          const edges = waiting.get(output.name) ?? new Set<string>();
          waiting.set(output.name, edges);
          edges.add(name);
          try { return await files(found); } finally { edges.delete(name); }
        },
      }));
      written.set(output, result);
    }
    return result;
  };
  // Each path an output writes, checked once every output has run, so a file any of them read counts as an input:
  // inside the root, not an input or the receipt, and written by one output only. Nothing is written before then.
  const writers = new Map<string, { name: string; path: string }>();
  for (const output of parts) {
    const own = await files(output);
    for (const { path } of own) {
      const at = relative(project.root, resolve(project.root, path));
      if (at === "" || at.startsWith("..") || isAbsolute(at)) throw new Error(`output ${output.name} writes ${path}, which is outside the project`);
      if (writers.has(at)) throw new Error(`outputs ${writers.get(at)!.name} and ${output.name} both write ${at}`);
      writers.set(at, { name: output.name, path });
    }
    outputs.push(...stamp(own, { name: theme.name }, output.name));
  }
  const reserved = new Set([...inputs, RECEIPT].map((path) => relative(project.root, resolve(project.root, path))));
  for (const [at, { name, path }] of writers) {
    if (reserved.has(at)) throw new Error(`output ${name} writes ${path}, which is ${at === RECEIPT ? "the receipt" : "an input of the build"}`);
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
