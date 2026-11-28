<!--
SPDX-FileCopyrightText: 2026 William Tierney

SPDX-License-Identifier: Apache-2.0
-->

# The core

The package `breacan` in `packages/core` builds `theme.toml` into files through addons. This page is reference for addon authors and for anyone reading the core. The 0.x binary in `src/` and `bin/` is a separate CLI, described by the other pages here.

## Project files

A project's root is the nearest folder, from the cwd up, that holds `breacan.config.ts` or `theme.toml`. The commands run with the cwd at the root.

`theme.toml` holds five keys:

| Key | Holds |
| --- | --- |
| `name` | The theme's name, used in each generated header. The default is `theme`. |
| `base` | The base the theme starts from. The default is `neutral`, the core's built-in base. |
| `[palette]` | Named raw colours, each a `#rrggbb` hex. |
| `[roles]` | Core role paths, such as `color.surface.default`, set to a palette name, a hex, a `px` or `rem` length, or a number. |
| `[platform.<name>.roles]` | Role paths that base `<name>` has of its own, such as `md.sys.color.surface-container-high` for `material`, set to the same kinds of value. |

A `[roles]` path must be a core role, and each value must have the role's type. A misspelled role, or a colour given to a corner, fails and names the role. A platform's own role set under `[roles]` fails and names the table to use.

A `[platform.<name>.roles]` path must be one that base `<name>` sets outside the core roles, and `<name>` must be a base in the theme's chain. A core role set there fails and points back to `[roles]`. `[platform.<name>]` holds only `roles`.

`breacan.config.ts` is optional. It exports `defineConfig({ addons, paths, options })`:

- `addons` lists the addons beyond the built-ins, in order.
- `paths.theme` moves `theme.toml`.
- `options` maps an addon's name to its options, such as `{ breacan: { path: "styles/tokens.css" } }`. The core's built-ins are the addon `breacan`.

## Roles

The core defines neutral roles, named `<property>.<role>.<emphasis>`, in `packages/core/src/roles.ts`. The public API exports them as `ROLES`, each `{ path, type, optional? }`, and `roleAt(path)` finds one.

| Family | Roles | Type |
| --- | --- | --- |
| Surface | `color.surface.{default,raised,overlay,sunken,inverse}` | `color` |
| Text | `color.text.{default,muted,subtle,inverse}` | `color` |
| Accent | `color.accent.{default,muted}`, `color.on-accent.{default,muted}` | `color` |
| Border | `color.border.{default,subtle}` | `color` |
| Status | `color.status.{danger,success,warning,info}`, `color.on-status.{danger,success,warning,info}` | `color` |
| Focus and scrim | `color.focus`, `color.scrim` | `color` |
| Optional accents | `color.accent-2.*`, `color.on-accent-2.*`, `color.accent-3.*`, `color.on-accent-3.*`, each `{default,muted}` | `color` |
| Type | `type.{display,title,heading,body,label,caption}` | `typography` |
| Fonts and icons | `font.{body,display,mono}`; `icon.set` | `fontFamily`; `string` |
| Shape | `corner.{control,container,overlay,full}` | `dimension` |
| Space and size | `space.{3xs,2xs,xs,sm,md,lg,xl,2xl,3xl}`, `size.touch` | `dimension` |
| Density | `density` | `number` |
| Elevation | `elevation.{raised,overlay}` | `dimension` |
| Motion | `motion.duration.{short,medium,long}`; `motion.easing.{standard,enter,exit}` | `duration`; `cubicBezier` |
| State | `state.{hover,pressed,focus,disabled}`, each an opacity | `number` |

The optional families alias `color.accent.*` and `color.on-accent.*` in the neutral base, so a theme's accent fills them until a base or the theme sets them. Each type role's face aliases a font role, so a theme's font moves every type role that uses it.

A base chain must give every core role a value; a chain that leaves one unset fails and lists the roles. A base that gives a core role another type fails and names the role. The neutral base gives every role a value, so a chain rooted at `neutral` always passes.

### Fill order and mapping tables

A platform base fills each core role in the fill order:

1. **published:** the platform's own value, from its tokens or its spec.
2. **derived:** a value computed from the platform's published values, where the platform has none.
3. **kept:** no value of its own, so the role keeps the value of the base below.

A base returns its mapping table as `mapping`: one row per core role, keyed by role path. A row is `{ source, from?, token?, symbols? }`:

- `source` is the fill-order step.
- `from` cites the token path or spec page, the derivation, or why the platform has no value.
- `token` is the platform's own name for the role.
- `symbols` maps a platform API to its symbol for the role, such as `{ swiftui: "Color(.systemBackground)" }`.

The core checks the table against the tokens. A row must name a core role and one of the three sources. A published or derived role must be in the base's tokens, and a kept role must not. A base that returns no table passes, and each role it leaves unset is kept.

## Addons and parts

An addon is `{ name, contract, parts }`. `defineAddon` stamps `contract: 1`, and the core refuses an addon written for another contract, naming it. An addon with no `contract` reads as 1.

Each part has a `kind` and a `name`. A part's name is unique across all the project's addons, whatever the kind. Write a part with `defineBase`, `defineOutput` or `defineCommand` to get its options typed from its schema.

| Kind | Method | Gets | Returns |
| --- | --- | --- | --- |
| `base` | `tokens` | `options`, `mode`, `platform`, and the helpers `read`, `log` and `warn` | `{ tokens, modes?, mapping? }`, `mapping` being its mapping table |
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

The built-ins are the `neutral` base, which gives every core role a value, the `css` output (option `path`, default `src/styles/tokens.css`), and the `build` and `check` commands.

### Colour helpers

`breacan/color` exports the colour helpers an addon needs, over `#rrggbb` strings: `contrast`, `luminance`, `mix`, `bestOn`, `textSafe`, `stateLayer`, `hsl`, `rgb`, `srgb` (a hex as a DTCG colour value) and `byPath`.

### Addons the core ships

Two addons live in the core and a project lists them, as it lists any addon: `import scheme from "breacan/scheme"` and `import dtcg from "breacan/dtcg"`.

- `scheme` is a base that starts from `neutral`. Its options are `seed` (a hex that Material's tonal-spot scheme grows the four colour roles from), `file` (a Base16, Base24 or iTerm2 scheme file; give it or a seed) and `dark` (with a seed, make the dark scheme). A file also writes `scheme.palette.base00` to `base17` and `scheme.ansi.0` to `15`.
- `dtcg` is an output with the option `path`, default `ports/tokens`. It writes `<name>.tokens.json`, the resolved tokens as DTCG 2025.10, and `<name>.resolver.json`, a resolver over it. The bytes match the 0.x dtcg output's for the same tokens.

## The material base

The addon `@breacan/material` in `packages/material` has the `material` base, which starts from `neutral`. It sets the core roles from Material 3's baseline scheme, in the vendored androidx tokens under `material/`. The `dark` mode builds the dark scheme, and any other mode builds the light one.

`packages/material/mapping.json` is its mapping table, and it drives the base. A published row takes the Material token it names, or its own `value` for a value Material publishes only in its docs. A derived row runs its derivation in `packages/material/src/index.ts`. A kept row leaves the role to `neutral`. The base also sets every Material colour role that no core role takes, under its own `md.sys.color.*` name, so a theme can set it under `[platform.material.roles]`.

Seven of the 25 required colour roles are derived, since Material has no success, warning or info colours and no third text emphasis. `color.text.subtle` is Material's outline, mixed toward on-surface-variant until it reads at 4.5:1. Each status colour is Material's custom colour (`customColor` in material-color-utilities), from a seed harmonized to the scheme's primary. Material publishes the other 18, 72% of the required colour roles. `font.mono`, the `space.*` scale and `density` are kept.

## Build and check

`breacan build` compiles the theme over its base chain into a [DTCG 2025.10 resolver document](https://www.designtokens.org/tr/2025.10/resolver/). Each base is one set, root first, and the theme's palette and roles are the last set, named `theme`. The core resolves that document and runs every output part.

Before it writes anything, the build checks every output path. It fails, naming the outputs, on a path outside the project root, an input of the build, the receipt, or a path two outputs write. Each output's text files get the generated header, and the build writes the files and `breacan.receipt.json`.

`breacan check` builds in memory and holds the tree to the receipt. It uses the receipt code the 0.x CLI uses (`packages/core/src/receipt.mjs`), so an output edited by hand fails, naming the file.

## Limits

- Input parts are not in the contract yet. The `image` and `website` inputs bring their shape.
- A base that returns `modes` fails, and the build passes every base the mode `default`. A build on `material` is light until theme.toml has `[modes]`.
- `[roles]` and `[platform.<name>.roles]` take colours, lengths and numbers only. The `type.*`, `font.*`, `icon.set`, `motion.*` and `elevation.*` roles come from bases until theme.toml has `[fonts]` and `[tokens]`.
- A `[platform.<name>]` table names a base in the theme's chain. A platform output that layers its base in through the dial needs this to widen.
- The mapping check does not hold a row's `from` or `token` to the platform's tokens. The material coverage test does, for that base alone.
- `permutations` holds one entry with an empty `input`, and the `css` output writes only that one, in one `:root` block. Modes and the dial add more.
- The core reads only the resolver documents it writes: references to its own sets with inline sources. Modifiers and file references come with the dial.
- The receipt holds `theme.toml`, `breacan.config.ts` and each file a base reads. It does not hold an addon's own files, so an addon upgrade that changes no output passes `check`.
- `scheme` makes one variant, since bases return no modes yet: a file gives its own, and a seed gives the one `dark` picks. The 0.x source took a light and a dark file together. It sets four roles and returns no mapping table, so every other role is kept from `neutral`.
- `dtcg` writes the one permutation, so it has no mode or platform files yet. Those come with modes and the dial.
- `ctx.log` and `ctx.warn` print straight to the console, so `breacan check` prints them too. An output that logs is noisy on every check.
- `ctx.output` returns another output's files before their path check, so it can hand back a path the build then refuses for the other output. The path check runs after every output has run, so a file any output read is an input.
- `@breacan/material` reads the vendored tokens from the repo's `material/` folder, outside its package, so it cannot publish until it carries them. It sets Material's platform roles for colour only; `md.sys.*` names for type, shape and motion come with the Material output.
- The status seeds (`#1a7f37`, `#9a6700`, `#0969da`) and the neutral base's values are our judgment. The neutral colours follow GitHub Primer's light theme.
- The `css` output writes every resolved token, the palette included.
- An output's file content is text. Binary files arrive with the Material addon.
- The core ships its TypeScript source and runs on Bun only. Its sources use the `Bun` global, so a typecheck needs Bun's type definitions.
