// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The addon contract: one shape for every addon, the core's built-ins included. An addon is a name and a list of
// parts, and each part is a base (role values a theme starts from), an output (files) or a command (a CLI verb).
// An addon's parts share one options block, keyed by the addon's name in the config and checked against the
// union of the parts' schemas. Write a part with defineBase, defineOutput or defineCommand to get its options typed.

/** The contract version this core reads. defineAddon stamps it; an addon without one is read as this version. */
export const CONTRACT = 1;

/** A DTCG 2025.10 token tree: groups of tokens, each token an object with `$value`. */
export type TokenTree = { [key: string]: unknown };

type OptionType = "string" | "number" | "boolean";
type TypeOf<T extends OptionType> = T extends "string" ? string : T extends "number" ? number : boolean;

/** One option a part takes. `default` fills it when the config leaves it unset; `required` refuses it unset. */
export interface OptionSpec {
  type: OptionType;
  description: string;
  default?: string | number | boolean;
  required?: boolean;
}
/** A part's options, by name. */
export type OptionsSchema = Record<string, OptionSpec>;
/** The options a part runs with, typed from its schema: set when the option has a default or is required. */
export type OptionsOf<S extends OptionsSchema> = {
  [K in keyof S]: S[K] extends { default: string | number | boolean } | { required: true } ? TypeOf<S[K]["type"]> : TypeOf<S[K]["type"]> | undefined;
};

/** DTCG 2025.10 values by type, as an output reads them: every alias replaced by its target's value. */
export interface TokenValues {
  color: { colorSpace: string; components: (number | "none")[]; alpha?: number; hex?: string };
  dimension: { value: number; unit: "px" | "rem" };
  duration: { value: number; unit: "ms" | "s" };
  number: number;
  string: string;
  fontFamily: string | string[];
  fontWeight: number | string;
  cubicBezier: [number, number, number, number];
  strokeStyle: string | Record<string, unknown>;
  border: Record<string, unknown>;
  transition: Record<string, unknown>;
  shadow: Record<string, unknown> | Record<string, unknown>[];
  gradient: Record<string, unknown>[];
  typography: Record<string, unknown>;
}
interface TokenShape {
  /** The dotted path, such as `color.surface.default`. */
  path: string;
  segments: string[];
  /** The path this token aliases, when it is an alias. */
  alias?: string;
  description?: string;
}
/** One resolved token. Narrow on `type` to get its `value`'s shape. */
export type Token = { [T in keyof TokenValues]: TokenShape & { type: T; value: TokenValues[T] } }[keyof TokenValues];

/** One resolution of the theme's resolver document: its input (the modifier contexts chosen) and the tokens. */
export interface Permutation {
  input: Record<string, string>;
  tokens: Token[];
}

/** A file an output writes, its path from the project root. */
export interface OutputFile {
  path: string;
  content: string;
}

/**
 * A base's mapping table: one row per core role, by role path, saying where the base's value comes from. In the
 * fill order a role takes the platform's own value (`published`), else one computed from published values
 * (`derived`), else it keeps the value of the base below (`kept`).
 */
export type Mapping = Record<string, MappingRow>;
export interface MappingRow {
  source: "published" | "derived" | "kept";
  /** The citation: the token path or spec page the value comes from, the derivation, or why the base has none. */
  from?: string;
  /** The platform's own token for the role, such as `md.sys.color.surface`. */
  token?: string;
  /** The platform API's symbol for the role, by API, such as `{ swiftui: "Color(.systemBackground)" }`. */
  symbols?: Record<string, string>;
}

/** What every part may do besides return its result: read a project file, and tell the person running the build. */
export interface Talk {
  /** Reads a file from the project root and records it as a build input, so `breacan check` holds it. */
  read(path: string): Promise<string>;
  /** Prints a line to stdout, prefixed with the part's name. */
  log(message: string): void;
  /** Prints a line to stderr, prefixed with `warning:` and the part's name. The build goes on. */
  warn(message: string): void;
}

export interface BaseContext<O> extends Talk {
  options: O;
  /** The mode being built. */
  mode: string;
  /** The platform being built, when an output asks for one. */
  platform?: string;
}
export interface BaseResult {
  tokens: TokenTree;
  /** Token trees for other modes, by mode name. */
  modes?: Record<string, TokenTree>;
  /** The source of each role value, by role path. */
  mapping?: Mapping;
}

export interface OutputContext<O> extends Talk {
  theme: { name: string };
  /** Every resolution of the theme; an output writes each one it supports. */
  permutations: Permutation[];
  options: O;
  /**
   * The files another output of the project writes, as it wrote them: before the generated header, and before the
   * build checks their paths. It fails for an output the project lacks, and for two outputs that ask for each other.
   */
  output(name: string): Promise<OutputFile[]>;
}

export interface CommandContext<O> {
  /** The project root; the command runs with it as the cwd. */
  root: string;
  /** The arguments after the verb. */
  args: string[];
  options: O;
  build(): Promise<OutputFile[]>;
  check(): Promise<void>;
  tokens(): Promise<Permutation[]>;
  parts<K extends Part["kind"]>(kind: K): readonly Extract<Part, { kind: K }>[];
}

interface PartShape<S extends OptionsSchema> {
  /** Unique across the project's addons. */
  name: string;
  options?: S;
}
/** Supplies role values a theme starts from. `base` names the base it starts from in turn. */
export interface BasePart<S extends OptionsSchema = OptionsSchema> extends PartShape<S> {
  kind: "base";
  base?: string;
  tokens(context: BaseContext<OptionsOf<S>>): BaseResult | Promise<BaseResult>;
}
/** Writes files from the resolved tokens. */
export interface OutputPart<S extends OptionsSchema = OptionsSchema> extends PartShape<S> {
  kind: "output";
  write(context: OutputContext<OptionsOf<S>>): OutputFile[] | Promise<OutputFile[]>;
}
/** A CLI verb. It throws to fail; the message is what the CLI prints. */
export interface CommandPart<S extends OptionsSchema = OptionsSchema> extends PartShape<S> {
  kind: "command";
  /** One line for `breacan --help`. */
  summary: string;
  run(context: CommandContext<OptionsOf<S>>): void | Promise<void>;
}

export type Part = BasePart<any> | OutputPart<any> | CommandPart<any>;

export interface Addon {
  /** The npm package name, such as `@breacan/tailwind`; the config keys the addon's options by it. */
  name: string;
  /** The contract version the addon was written for. */
  contract?: number;
  parts: Part[];
}

/** A project's optional breacan.config.ts. */
export interface Config {
  /** Addons beyond the core's built-ins, in order. */
  addons?: Addon[];
  /** Where the project keeps its files, from the root. */
  paths?: { theme?: string };
  /** Each addon's options, by addon name; the core's built-ins are `breacan`. */
  options?: Record<string, Record<string, unknown>>;
}

/** Stamps the contract version on an addon. */
export const defineAddon = (addon: Omit<Addon, "contract">): Addon => ({ ...addon, contract: CONTRACT });
export const defineBase = <const S extends OptionsSchema = {}>(part: Omit<BasePart<S>, "kind">): BasePart<S> => ({ ...part, kind: "base" });
export const defineOutput = <const S extends OptionsSchema = {}>(part: Omit<OutputPart<S>, "kind">): OutputPart<S> => ({ ...part, kind: "output" });
export const defineCommand = <const S extends OptionsSchema = {}>(part: Omit<CommandPart<S>, "kind">): CommandPart<S> => ({ ...part, kind: "command" });

/** Types breacan.config.ts for editors; returns it unchanged. */
export const defineConfig = (config: Config): Config => config;
