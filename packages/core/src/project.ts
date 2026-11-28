// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// Finds and loads a project. The root is the nearest folder, from the cwd up, that holds breacan.config.ts or
// theme.toml. With no config file the project runs the core's built-ins with their defaults.
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Addon, Config, Options, Part, Project } from "./addon.ts";
import { builtins } from "./builtins.ts";
import { THEME } from "./theme.ts";

export const CONFIG = "breacan.config.ts";
const CONFIG_KEYS = ["addons", "paths", "options"];
const PATH_KEYS = ["theme"];

const isTable = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

export const findRoot = (from: string): string => {
  for (let dir = resolve(from); ; dir = dirname(dir)) {
    if (existsSync(join(dir, CONFIG)) || existsSync(join(dir, THEME))) return dir;
    if (dirname(dir) === dir) throw new Error(`no ${THEME} or ${CONFIG} here or in any folder above ${resolve(from)}`);
  }
};

const checkConfig = (config: unknown): Config => {
  if (!isTable(config)) throw new Error(`${CONFIG} must export default defineConfig({ ... })`);
  for (const key of Object.keys(config)) if (!CONFIG_KEYS.includes(key)) throw new Error(`${CONFIG}: unknown key "${key}" (expected ${CONFIG_KEYS.join(", ")})`);
  if (config.addons !== undefined && !Array.isArray(config.addons)) throw new Error(`${CONFIG}: addons must be a list`);
  for (const [at, addon] of (config.addons ?? []).entries()) {
    if (!isTable(addon) || typeof addon.name !== "string" || !Array.isArray(addon.parts)) throw new Error(`${CONFIG}: addons[${at}] is not an addon ({ name, parts })`);
  }
  if (config.paths !== undefined) {
    if (!isTable(config.paths)) throw new Error(`${CONFIG}: paths must be an object`);
    for (const key of Object.keys(config.paths)) if (!PATH_KEYS.includes(key)) throw new Error(`${CONFIG}: unknown path "${key}" (expected ${PATH_KEYS.join(", ")})`);
  }
  if (config.options !== undefined && (!isTable(config.options) || !Object.values(config.options).every(isTable))) throw new Error(`${CONFIG}: options must map part names to objects`);
  return config as Config;
};

const KINDS = ["input", "base", "output", "command"];
// Every part's kind is one of the four, and no two parts of a kind share a name.
const checkParts = (addons: Addon[]) => {
  const owners = new Map<string, string>();
  for (const addon of addons) {
    for (const part of addon.parts) {
      if (!KINDS.includes(part?.kind)) throw new Error(`${addon.name}: a part has kind "${part?.kind}"; the kinds are ${KINDS.join(", ")}`);
      const key = `${part.kind} ${part.name}`;
      if (owners.has(key)) throw new Error(`${addon.name} and ${owners.get(key)} both provide the ${part.kind} "${part.name}"`);
      owners.set(key, addon.name);
    }
  }
};

export const loadProject = async (cwd: string): Promise<Project> => {
  const root = findRoot(cwd);
  const file = join(root, CONFIG);
  let config: Config = {};
  if (existsSync(file)) {
    let module;
    try { module = await import(pathToFileURL(file).href); }
    catch (error) { throw new Error(`${CONFIG} did not load: ${(error as Error).message}`, { cause: error }); }
    config = checkConfig(module.default);
  }
  const addons = [builtins, ...(config.addons ?? [])];
  checkParts(addons);
  // shortcut: an unknown option name passes through, until task 5c refuses it with the known list.
  const optionsFor = (part: Part): Options => ({
    ...Object.fromEntries(Object.entries(part.options ?? {}).filter(([, spec]) => "default" in spec).map(([key, spec]) => [key, spec.default])),
    ...config.options?.[part.name],
  });
  return { root, ...(existsSync(file) && { configFile: CONFIG }), config, addons, optionsFor };
};
