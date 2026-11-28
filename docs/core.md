<!--
SPDX-FileCopyrightText: 2026 William Tierney

SPDX-License-Identifier: Apache-2.0
-->

# The core

The package `breacan` in `packages/core` builds `theme.toml` into files through addons. This page is reference for addon authors and for anyone reading the core. The 0.x binary in `src/` and `bin/` is a separate CLI, described by the other pages here.

## Project files

A project's root is the nearest folder, from the cwd up, that holds `breacan.config.ts` or `theme.toml`. The commands run with the cwd at the root.

`theme.toml` holds four keys:

| Key | Holds |
| --- | --- |
| `name` | The theme's name, used in each generated header. The default is `theme`. |
| `base` | The base the theme starts from. The default is `neutral`, the core's built-in base. |
| `[palette]` | Named raw colours, each a `#rrggbb` hex. |
| `[roles]` | Role paths, such as `color.surface.default`, set to a palette name, a hex, a `px` or `rem` length, or a number. |

A role must be one the base chain defines, with the same type. A misspelled role, or a colour given to a corner, fails and names the role.

`breacan.config.ts` is optional. It exports `defineConfig({ addons, paths, options })`:

- `addons` lists the addons beyond the built-ins, in order.
- `paths.theme` moves `theme.toml`.
- `options` maps an addon's name to its options, such as `{ breacan: { path: "styles/tokens.css" } }`. The core's built-ins are the addon `breacan`.

## Addons and parts

An addon is `{ name, contract, parts }`. `defineAddon` stamps `contract: 1`, and the core refuses an addon written for another contract, naming it. An addon with no `contract` reads as 1.

Each part has a `kind` and a `name`. A part's name is unique across all the project's addons, whatever the kind. Write a part with `defineBase`, `defineOutput` or `defineCommand` to get its options typed from its schema.

| Kind | Method | Gets | Returns |
| --- | --- | --- | --- |
| `base` | `tokens` | `options`, `mode`, `platform`, and the helpers `read`, `log` and `warn` | `{ tokens, modes?, mapping? }` |
| `output` | `write` | `theme: { name }`, `permutations`, `options`, the helpers, and `output(name)` | The files to write, as `{ path, content }` |
| `command` | `run` | `root`, `args`, `options`, `build()`, `check()`, `tokens()` and `parts(kind)` | Nothing; it throws to fail |

A base's `base` names the base it starts from in turn. A command has a one-line `summary` for `--help`.

`permutations` lists each resolution of the theme's resolver document, as `{ input, tokens }`. Each token has a `path`, `segments`, a `type` and a `value` typed by that type, with every alias resolved. The `breacan/css` export turns a token into CSS: `cssVar(token)` gives `--color-surface-default`, and `cssValue(token)` gives `#fbf7f0`.

### Helpers

A base and an output both get three helpers:

- `read(path)` reads a file from the project root and records it as a build input, so `breacan check` holds it.
- `log(message)` prints a line to stdout, prefixed with the part's name.
- `warn(message)` prints a line to stderr, prefixed with `warning:` and the part's name. The build goes on.

An output's `output(name)` returns the files another output writes, as it wrote them: before the generated header and before the build checks their paths. Each output runs once however many ask for it. It fails for an output the project lacks, and for two outputs that ask for each other.

### Options

All parts of one addon share the addon's options block. The core checks the block against the union of the parts' schemas. Each option in a schema is `{ type, description, default?, required? }`, where `type` is `string`, `number` or `boolean`. A value of the wrong type fails, naming the addon and the option. So does an option no part declares, which lists the known ones, a required option left unset, or a block for an addon the project lacks.

### Reserved names

The verbs `init`, `add`, `build`, `check` and `lint` belong to the core. `studio` belongs to `@breacan/studio`. A command part of another addon with one of these names fails.

### The built-ins

The built-ins are the `neutral` base, the `css` output (option `path`, default `src/styles/tokens.css`), and the `build` and `check` commands.

### Colour helpers

`breacan/color` exports the colour helpers an addon needs, over `#rrggbb` strings: `contrast`, `luminance`, `mix`, `bestOn`, `textSafe`, `stateLayer`, `hsl`, `rgb`, `srgb` (a hex as a DTCG colour value) and `byPath`.

### Addons the core ships

Two addons live in the core and a project lists them, as it lists any addon: `import scheme from "breacan/scheme"` and `import dtcg from "breacan/dtcg"`.

- `scheme` is a base that starts from `neutral`. Its options are `seed` (a hex that Material's tonal-spot scheme grows the four colour roles from), `file` (a Base16, Base24 or iTerm2 scheme file; give it or a seed) and `dark` (with a seed, make the dark scheme). A file also writes `scheme.palette.base00` to `base17` and `scheme.ansi.0` to `15`.
- `dtcg` is an output with the option `path`, default `ports/tokens`. It writes `<name>.tokens.json`, the resolved tokens as DTCG 2025.10, and `<name>.resolver.json`, a resolver over it. The bytes match the 0.x dtcg output's for the same tokens.

## Build and check

`breacan build` compiles the theme over its base chain into a [DTCG 2025.10 resolver document](https://www.designtokens.org/tr/2025.10/resolver/). Each base is one set, root first, and the theme's palette and roles are the last set, named `theme`. The core resolves that document and runs every output part.

Before it writes anything, the build checks every output path. It fails, naming the outputs, on a path outside the project root, an input of the build, the receipt, or a path two outputs write. Each output's text files get the generated header, and the build writes the files and `breacan.receipt.json`.

`breacan check` builds in memory and holds the tree to the receipt. It uses the receipt code the 0.x CLI uses (`packages/core/src/receipt.mjs`), so an output edited by hand fails, naming the file.

## Limits

- Input parts are not in the contract yet. The `image` and `website` inputs bring their shape.
- A base that returns `modes` fails, and the core does not read a base's `mapping`. The full role set brings both.
- `permutations` holds one entry with an empty `input`, and the `css` output writes only that one, in one `:root` block. Modes and the dial add more.
- The core reads only the resolver documents it writes: references to its own sets with inline sources. Modifiers and file references come with the dial.
- The receipt holds `theme.toml`, `breacan.config.ts` and each file a base reads. It does not hold an addon's own files, so an addon upgrade that changes no output passes `check`.
- `scheme` makes one variant, since bases return no modes yet: a file gives its own, and a seed gives the one `dark` picks. The 0.x source took a light and a dark file together. It sets four roles and not Material's whole set, which the full role set brings.
- `dtcg` writes the one permutation, so it has no mode or platform files yet. Those come with modes and the dial.
- `ctx.log` and `ctx.warn` print straight to the console, so `breacan check` prints them too. An output that logs is noisy on every check.
- `ctx.output` returns another output's files before their path check, so it can hand back a path the build then refuses for the other output. The path check runs after every output has run, so a file any output read is an input.
- The neutral base holds five roles: `color.surface.default`, `color.text.default`, `color.accent.default`, `color.on-accent.default` and `corner.control`.
- The `css` output writes every resolved token, the palette included.
- An output's file content is text. Binary files arrive with the Material addon.
- The core ships its TypeScript source and runs on Bun only. Its sources use the `Bun` global, so a typecheck needs Bun's type definitions.
