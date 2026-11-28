// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// Finds and loads a project. The root is the nearest folder, from the cwd up, that holds breacan.config.ts or
// theme.toml. With no config file the project runs the core's built-ins with their defaults.
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CONTRACT, type Addon, type Config, type OptionSpec, type Part } from "./addon.ts";
import { builtins } from "./builtins.ts";
import { THEME } from "./theme.ts";

export const CONFIG = "breacan.config.ts";
const CONFIG_KEYS = ["addons", "paths", "options"];
const PATH_KEYS = ["theme"];
const KINDS = ["base", "output", "command"];
// The core's verbs, and the one addon each may come from.
const RESERVED: Record<string, string> = { init: builtins.name, add: builtins.name, build: builtins.name, check: builtins.name, lint: builtins.name, studio: "@breacan/studio" };

/** A loaded project. Internal: commands get a narrower context. */
export interface Project {
  root: string;
  /** The config file's path from the root, when there is one. */
  configFile?: string;
  config: Config;
  addons: Addon[];
  /** The options a part runs with: its addon's block, checked against the addon's schemas, over their defaults.
   * Typed loosely here, since the load has checked each value against the part's schema. */
  optionsFor(part: Part): Record<string, any>;
}

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
  if (config.options !== undefined && (!isTable(config.options) || !Object.values(config.options).every(isTable))) throw new Error(`${CONFIG}: options must map addon names to objects`);
  return config as Config;
};

// Each addon reads this contract, each part is of a known kind with a name no other part has, and only the
// addon that owns a core verb provides it.
const checkAddons = (addons: Addon[]) => {
  const owners = new Map<string, string>();
  const names = new Set<string>();
  for (const addon of addons) {
    if (names.has(addon.name)) throw new Error(`the addon ${addon.name} is listed twice`);
    names.add(addon.name);
    const contract = addon.contract ?? CONTRACT;
    if (contract !== CONTRACT) throw new Error(`${addon.name} is written for addon contract ${contract}; this core reads contract ${CONTRACT}`);
    for (const part of addon.parts) {
      if (!KINDS.includes(part?.kind)) throw new Error(`${addon.name}: a part has kind "${part?.kind}"; the kinds are ${KINDS.join(", ")}`);
      if (owners.has(part.name)) throw new Error(`${addon.name} and ${owners.get(part.name)} both provide a part named "${part.name}"`);
      owners.set(part.name, addon.name);
      if (part.kind === "command" && Object.hasOwn(RESERVED, part.name) && RESERVED[part.name] !== addon.name) throw new Error(`${addon.name}: "${part.name}" is a core verb, which only ${RESERVED[part.name]} provides`);
    }
  }
};

// The addon's options: its block in the config over the defaults of every part's schema. A value of the wrong type,
// or a required option left unset, fails naming the addon and the option.
const optionsOf = (addon: Addon, given: Record<string, unknown> = {}) => {
  const schema: Record<string, OptionSpec> = {};
  for (const part of addon.parts) {
    for (const [key, spec] of Object.entries<OptionSpec>(part.options ?? {})) {
      if (schema[key] && schema[key].type !== spec.type) throw new Error(`${addon.name}: option "${key}" is a ${schema[key].type} in one part and a ${spec.type} in another`);
      schema[key] = spec;
    }
  }
  const known = Object.keys(schema);
  for (const key of Object.keys(given)) {
    if (!Object.hasOwn(schema, key)) throw new Error(`${addon.name}: unknown option "${key}"; ${known.length ? `the known options are ${known.join(", ")}` : "this addon takes no options"}`);
  }
  const options: Record<string, unknown> = { ...given };
  for (const [key, spec] of Object.entries(schema)) {
    if (options[key] === undefined && spec.default !== undefined) options[key] = spec.default;
    if (options[key] === undefined) {
      if (spec.required) throw new Error(`${addon.name}: option "${key}" is required (${spec.description})`);
    } else if (typeof options[key] !== spec.type) throw new Error(`${addon.name}: option "${key}" must be a ${spec.type}, not ${JSON.stringify(options[key])}`);
  }
  return options;
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
  checkAddons(addons);
  for (const name of Object.keys(config.options ?? {})) {
    if (!addons.some((addon) => addon.name === name)) throw new Error(`${CONFIG}: options names "${name}", which is not an addon here (addons: ${addons.map((addon) => addon.name).join(", ")})`);
  }
  const options = new Map(addons.map((addon) => [addon.name, optionsOf(addon, config.options?.[addon.name])]));
  const owner = new Map(addons.flatMap((addon) => addon.parts.map((part) => [part, addon.name] as const)));
  return { root, ...(existsSync(file) && { configFile: CONFIG }), config, addons, optionsFor: (part) => options.get(owner.get(part)!)! };
};

/** The project's parts of one kind, in addon order. */
export const partsOf = <K extends Part["kind"]>(project: Pick<Project, "addons">, kind: K): Extract<Part, { kind: K }>[] =>
  project.addons.flatMap((addon) => addon.parts.filter((part): part is Extract<Part, { kind: K }> => part.kind === kind));
