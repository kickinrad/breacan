// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The addon contract: one shape for every addon, the core's built-ins included. An addon is a name and a list of
// parts, and each part is one of four kinds: an input reads a starting point, a base supplies role values, an output
// writes files, and a command adds a verb to the CLI. Each part declares its options, so the core can fill
// defaults and refuse a name it does not declare.

/** A DTCG 2025.10 token tree: groups of tokens, each token an object with `$value`. */
export type TokenTree = { [key: string]: unknown };

/** One option a part takes. `default` fills it when the config leaves it unset. */
export interface OptionSpec {
  description: string;
  default?: unknown;
}
/** A part's options, by name. */
export type OptionsSchema = Record<string, OptionSpec>;
/** The options a part runs with: its defaults, then what the config gives. */
export type Options = Record<string, unknown>;

/** One resolved token, as outputs read it. */
export interface Token {
  /** The dotted path, such as `color.surface.default`. */
  path: string;
  segments: string[];
  /** The path in kebab case, such as `color-surface-default`: a CSS variable name without its `--`. */
  name: string;
  type?: string;
  /** The value with every alias replaced. */
  raw: unknown;
  /** The value as a CSS scalar. */
  css: unknown;
  /** The path this token aliases, when it is an alias. */
  alias?: string;
  description?: string;
}

/** A project's theme.toml, read and checked. */
export interface Theme {
  /** The project root, where theme.toml sits. */
  root: string;
  /** theme.toml's path from the root. */
  file: string;
  name: string;
  /** The base the theme starts from. */
  base: string;
  /** Named raw colours, as #rrggbb. */
  palette: Record<string, string>;
  /** Role paths to the values theme.toml gives them. */
  roles: Record<string, string | number>;
}

/** A file an output writes, its path from the project root. */
export interface OutputFile {
  path: string;
  content: string;
}

/** What an output's `write` gets. */
export interface OutputContext {
  theme: Theme;
  tokens: Token[];
  options: Options;
}

/** What a command's `run` gets: the loaded project and the arguments after the verb. */
export interface CommandContext {
  project: Project;
  args: string[];
}

interface PartShape {
  /** Unique among the project's parts of the same kind. */
  name: string;
  options?: OptionsSchema;
}

/** Reads a starting point (an image, a website) into tokens. */
export interface InputPart extends PartShape {
  kind: "input";
  read(context: { root: string; options: Options }): TokenTree | Promise<TokenTree>;
}

/** Supplies role values a theme starts from. `base` names the base it starts from in turn. */
export interface BasePart extends PartShape {
  kind: "base";
  base?: string;
  tokens(context: { options: Options }): TokenTree;
}

/** Writes files from the resolved tokens. */
export interface OutputPart extends PartShape {
  kind: "output";
  write(context: OutputContext): OutputFile[] | Promise<OutputFile[]>;
}

/** A CLI verb. It throws to fail; the message is what the CLI prints. */
export interface CommandPart extends PartShape {
  kind: "command";
  /** One line for `breacan --help`. */
  summary: string;
  run(context: CommandContext): void | Promise<void>;
}

export type Part = InputPart | BasePart | OutputPart | CommandPart;

export interface Addon {
  /** The npm package name, such as `@breacan/tailwind`. */
  name: string;
  parts: Part[];
}

/** A project's optional breacan.config.ts. */
export interface Config {
  /** Addons beyond the core's built-ins, in order. */
  addons?: Addon[];
  /** Where the project keeps its files, from the root. */
  paths?: { theme?: string };
  /** Each part's options, by part name. */
  options?: Record<string, Options>;
}

/** A loaded project: its root, its config and every part its addons provide, the built-ins first. */
export interface Project {
  root: string;
  /** The config file's path from the root, when there is one. */
  configFile?: string;
  config: Config;
  addons: Addon[];
  /** The options a part runs with. */
  optionsFor(part: Part): Options;
}

/** The project's parts of one kind, in addon order. */
export const partsOf = <K extends Part["kind"]>(project: Project, kind: K): Extract<Part, { kind: K }>[] =>
  project.addons.flatMap((addon) => addon.parts.filter((part): part is Extract<Part, { kind: K }> => part.kind === kind));

/** Types an addon for editors; returns it unchanged. */
export const defineAddon = (addon: Addon): Addon => addon;

/** Types breacan.config.ts for editors; returns it unchanged. */
export const defineConfig = (config: Config): Config => config;
