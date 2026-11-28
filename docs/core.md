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
- `options` maps a part's name to its options, such as `{ css: { path: "styles/tokens.css" } }`.

## Addons and parts

An addon is `{ name, parts }`, and `defineAddon` types one for editors. The core's built-ins are an addon of the same shape, listed first. Each part has a `kind`, a `name` unique within its kind, and an optional `options` schema of `{ description, default }` per option.

| Kind | Method | Does |
| --- | --- | --- |
| `input` | `read({ root, options })` | Returns a token tree read from a starting point. |
| `base` | `tokens({ options })` | Returns the role values a theme starts from. Its `base` names the base it starts from in turn. |
| `output` | `write({ theme, tokens, options })` | Returns the files to write, as `{ path, content }`. |
| `command` | `run({ project, args })` | Runs a CLI verb, with a one-line `summary` for `--help`. It throws to fail. |

The built-ins are the `neutral` base, the `css` output (option `path`, default `src/styles/tokens.css`), and the `build` and `check` commands.

## Build and check

`breacan build` compiles the theme over its base chain into a [DTCG 2025.10 resolver document](https://www.designtokens.org/tr/2025.10/resolver/). Each base is one set, root first, and the theme's palette and roles are the last set, named `theme`. The core resolves that document and runs every output part. Each output's text files get the generated header, and the build writes the files and `breacan.receipt.json`.

`breacan check` builds in memory and holds the tree to the receipt. It uses the receipt code the 0.x CLI uses (`packages/core/src/receipt.mjs`), so an output edited by hand fails, naming the file.

## Limits

- Input parts have a type, but the build does not run them. The `image` and `website` inputs wire them in.
- An option name a part does not declare passes through. The rejection of unknown options refuses it with the known list.
- The core reads only the resolver documents it writes: references to its own sets with inline sources. Modifiers and file references come with the dial.
- The receipt holds `theme.toml` and `breacan.config.ts`. It does not hold an addon's own files, so an addon upgrade that changes no output passes `check`.
- The neutral base holds five roles: `color.surface.default`, `color.text.default`, `color.accent.default`, `color.on-accent.default` and `corner.control`.
- The `css` output writes every resolved token, the palette included, in one `:root` block.
- The core ships its TypeScript source and runs on Bun only. Its sources use the `Bun` global, so a typecheck needs Bun's type definitions.
