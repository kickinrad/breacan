// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// A DTCG 2025.10 resolver document as the build's layers, read through Terrazzo's parser. The resolver's default
// input is the base mode. It may have one modifier, the mode: each other context becomes a media layer, under the
// query its $extensions name ({ "com.kickinrad.breacan": { "media": { "<context>": "<query>" } } }).
import { defineConfig, parse } from "@terrazzo/parser";
import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const EXTENSION = "com.kickinrad.breacan";

// Terrazzo's normalized tokens as one DTCG tree, aliases resolved.
const tree = (tokens) => {
  const root = {};
  for (const token of Object.values(tokens)) {
    const segments = token.id.split(".");
    let node = root;
    for (const segment of segments.slice(0, -1)) node = node[segment] ??= {};
    node[segments.at(-1)] = { $type: token.$type, $value: token.$value, ...(token.$description && { $description: token.$description }) };
  }
  return root;
};

export const loadResolver = async (file) => {
  const url = pathToFileURL(file);
  const read = new Set([file]);
  const config = defineConfig({}, { cwd: new URL("./", url) });
  let result;
  try {
    result = await parse([{ filename: url, src: await readFile(file, "utf8") }], {
      config, req: async (each) => { read.add(relative(".", fileURLToPath(each))); return readFile(each, "utf8"); },
    });
  } catch (error) { throw new Error(`${file}: ${error.message}`); }
  const { resolver } = result;
  if (!resolver?.source?.resolutionOrder) throw new Error(`${file} is not a DTCG resolver document`);
  const modifiers = Object.values(resolver.source.modifiers ?? {});
  if (modifiers.length > 1) throw new Error(`${file}: Breacán reads one modifier, the mode; this resolver has ${modifiers.length}`);
  const base = resolver.apply(resolver.inputDefault);
  const modes = { base: "base", media: {} };
  const media = {};
  const [modifier] = modifiers;
  if (modifier) {
    modes.base = resolver.inputDefault[modifier.name];
    const queries = modifier.$extensions?.[EXTENSION]?.media ?? {};
    for (const context of Object.keys(modifier.contexts).filter((each) => each !== modes.base)) {
      const query = queries[context];
      if (!query) throw new Error(`${file}: the ${modifier.name} context "${context}" names no media query in $extensions["${EXTENSION}"].media`);
      const tokens = resolver.apply({ ...resolver.inputDefault, [modifier.name]: context });
      const differ = Object.fromEntries(Object.entries(tokens).filter(([id, token]) => JSON.stringify(token.$value) !== JSON.stringify(base[id]?.$value)));
      media[query] = [{ tree: tree(differ), file: `${file} (${context})`, strict: true }];
      modes.media[query] = context;
    }
  }
  return { tree: tree(base), media, modes, files: [...read] };
};
