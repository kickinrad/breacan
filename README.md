# Breacán

Breacán (said BRAK-awn, Irish for tartan) builds DTCG design tokens → CSS, Beer CSS, Tailwind, React Native, Obsidian, Mealie, `DESIGN.md` and more, as one binary named `breacan`. It still answers to its old name, `kumiko`, with `--check` and `kumiko.config.mjs`, until every project has moved.

```sh
mise use github:kickinrad/breacan
breacan build   # build every target in breacan.config.mjs
breacan check   # fail if an input changed or an output was edited since the last build
breacan new --seed "#d9480f" --seed "#2b8a3e" ember  # a starter kit from two colours
breacan --version
```

```js
// breacan.config.mjs
export default {
  preset: "default",                         // optional: a named list of built-in modules
  without: ["claude-design"],                 // optional: names to leave out of the preset
  modules: ["tailwind"],                      // built-ins by name, or a module the config imports, listed as its object (`targets` is the old name)
  media: { "(max-width: 850px)": ["tokens/responsive.tokens.json"] },
  include: ["builtin:material", "vendor/*.tokens.json"], // optional silent base layers; tokens/ overrides them
  kit: { name: "acme", root: "design" }, // optional; targets also get ctx.root (absolute), ctx.version (from ./VERSION), ctx.name, ctx.title
  css: { path: "src/styles/tokens.css", layer: "base", prelude: "", scheme: "dark" }, // scheme is optional
};
```

Each build writes `breacan.receipt.json`: the sha256 of every input it read (the config, `VERSION`, the kit folder and any theme it extends, `tokens/`, include files and what modules read) and of every file it wrote. Shortcut: files the config itself imports are not held; when a kit splits its config into helpers, hold them too. `breacan check` holds the tree to it, naming an input changed since the build or an output edited by hand, and it holds each generated file to the header rule. The outputs the build writes must be exactly the receipt's. It does not compare bytes with a fresh build, so a newer engine that writes the same files differently never fails a check; the next build takes it. A project with no receipt yet (last built by kumiko) is checked against a fresh build, as `kumiko --check` did.

`include: ["builtin:base"]` adds the Breacán-neutral base, which fills every role in the contract (`src/contract.mjs`): Material's colour, type, shape, motion, elevation and state roles, plus `breacan.sys` spacing, `touch-min`, `icon-set` and `density`. Material sits beneath it. Greys and accents are [Radix Colors](https://www.radix-ui.com/colors) (blue, slate, violet and red, step 11 as the accent), type and spacing follow Spectrum, and durations, easings and elevation follow Fluent 2. The base gives the kit's base mode its scheme's colours and the other scheme to the colour-scheme query; a kit with no modes is light with dark under `(prefers-color-scheme: dark)`. The base check fails a build where any contract role lacks a value in any mode.

A `source` module reads a look from outside. `scheme` takes one or two [tinted-theming](https://github.com/tinted-theming/schemes) Base16 or Base24 files (`scheme: { files: ["night.yaml", "day.yaml"] }`, one per variant): base00 to base07 become the neutral roles, base0D, base0C, base0E and base08 the primary, secondary, tertiary and error accents (moved toward the text until they hold 4.5:1), and the sixteen ANSI colours become `scheme.ansi.0` to `15` as tinted-theming's shell templates map them. With one file, the other variant keeps the base's colours. A `.itermcolors` file (an iTerm2 colour scheme) works in the same list: its ANSI 0 to 15 are `scheme.ansi.0` to `15`, ANSI 1 to 6 are the accents, its background, foreground and selection are base00, base05 and base02, and the steps between come from mixing background and foreground; light or dark follows the background. The cursor colour is not read.

A colour engine is a `foundation` module: it gives every colour role it knows in both schemes, over the base. `leonardo` (the default, [Adobe Leonardo](https://leonardocolor.io)) turns each seed (primary, then secondary, then tertiary) into an accent family at target contrasts against the base's surface: the accent at 5.5:1 light and 7:1 dark, its container just off the surface and the container's text at 10:1 or 11:1. Greys stay the base's. `material` ([material-color-utilities](https://github.com/material-foundation/material-color-utilities)) makes Material's tonal-spot scheme from the first seed, greys included; a second or third seed replaces the secondary or tertiary palette. Either takes `seeds` in its options, and `breacan new --seed <hex>… [--engine material] [<dir>]` writes a starter kit around them.

`platforms` adapts the kit to each platform through the dial (`src/dial.mjs`): `platforms: { ios: { language, dial: "branded" } }`. A language is a module `{ slot: "language", name, run }` whose `run({ platform, mode })` runs for the base mode and again for each other mode (`"light"`, `"dark"`), so a language gives each mode its own colours, and gives the platform's native values by foundation: `colour`, `type`, `shape`, `spacing`, `motion`, `elevation`, `icons` and `components`, each a DTCG tree that sets only that foundation's token groups (`FOUNDATIONS` in `src/dial.mjs`), plus `chrome` for system bars, sheets and controls under `breacan.comp`. The dial level says per foundation whether the platform keeps the theme's values or takes the language's, which then sit over the theme and the project's `tokens/`: Native takes them all, Tinted keeps colour, Branded keeps colour, type and shape, and Signature keeps everything. `dial: { level: "branded", motion: "theme" }` sets one foundation against its level (`"theme"` or `"platform"`). Below Signature, system chrome stays the language's whatever the foundations say, tinted with the brand: the dial sets `breacan.sys.tint` to the theme's `md.sys.color.primary`, and the language's chrome aliases it. Outputs read each platform's base tokens as `ctx.platforms.<platform>.tokens` and other modes as `ctx.platforms.<platform>.media[mode]`. The `dtcg` output writes `<name>.<platform>.tokens.json` with differences in the base mode. Shortcut: the DTCG resolver has no platform modifier; add one when a consumer reads a platform through the resolver. Shortcut: per-foundation overrides do not reach chrome, which follows the level alone; add a `chrome` override when a kit needs its own bars below Signature. `tests/dial/kit-d` is fixture kit D, with a fixture Apple language.

The built-in Apple language is `language: "apple"`. Set `platforms: { ios: { language: "apple", dial: "tinted" } }` on a seed kit to keep its colours and take iOS foundations. It gives only what Apple publishes as fixed values: colour swatches in light and dark, SF Pro, the Dynamic Type default (Large) text sizes, the 44 pt `touch-min`, SF Symbols and system chrome. React Native scales text with the user's setting at runtime. The [breacan-apple plugin](plugins/breacan-apple/README.md) links Apple's HIG guidance.

The built-in Material language is `language: "material"`, for Android: `platforms: { android: { language: "material", dial: "branded" } }`. It gives only what Material publishes as fixed values, from the vendored androidx tokens: baseline colour roles in light and dark by mode, Roboto and the type scale, the shape corner scale, motion durations and easings, elevation levels, the 48 dp `touch-min` and Material Symbols. It sets no system chrome or component tokens.

A DTCG 2025.10 resolver in `tokens/` (`*.resolver.json`, read through [Terrazzo's parser](https://terrazzo.app/docs/reference/js-api/)) governs that folder: its default input is the base mode, and a single `mode` modifier gives each other context as a media layer, under the query its `$extensions["com.kickinrad.breacan"].media` names. The `dtcg` output writes that resolver beside its files, so another kit, Terrazzo or Swatchbook reads a kit as one document.

`design-md` writes [Google's DESIGN.md format](https://github.com/google-labs-code/design.md). On the role contract it writes the colour roles by name, the fifteen type roles, the corners, the spacing scale and a component per on-colour pair, so `design.md lint` checks each pair's contrast; a file with no body yet gets one that states the usage rules. Off the contract it writes the project's tokens by their names.

Every part outside the engine is a module of one shape, `{ slot, name, reads, writes, run(ctx) → [{ path, content }] }`. `slot` says when it runs (`source`, `foundation`, then `output`), `reads` names what of `ctx` it needs (`kit` makes a missing kit an error), and `writes` maps each option that says where it writes to its default, `null` when the config must set it. The old target shape `{ name, build }` still works. The `default` preset is `dtcg`, `css`, `beer`, `design-md`, `claude-design` and `playground`; a module that needs a sibling stylesheet the config leaves out makes it in memory.

`kit` is optional. When set, `name` is required, `root` is the kit folder relative to the config and defaults to `design`, and `VERSION` in the working directory must hold a semantic version. Every target's `ctx` then also carries `root`, `version`, `name` and `title` (the theme's, else the name), and with a `theme.toml` `theme` (the parsed file) and `modes` (`{ base, media }`: the base mode's name, and each other mode's name by its media query); without `kit` it carries none of them. Every target also gets `config`, so it can read a sibling output's path. Each token a target reads has a `description` (its `$description`, if any).

With a kit, every generated text file (`.css`, `.js`, `.mjs`, `.ts`, `.kt`, `.md`, `.html`) starts with a header naming the engine, the kit and the target, and saying not to edit it; it sits after any front matter, doctype or `@charset`, and within the first 10 lines. An output that sets `lead: n` keeps its first `n` lines first, for a marker its reader looks for on line 1, and the header follows them. `.json` and other extensions get none. `breacan check` fails a kit output none of whose first 10 lines matches `/^\W*Generated by \S+.*\bdo not edit\b/i` (one line: comment marks, "Generated by <name>", then "do not edit"), naming the path. The systems guard reads the same rule.

The colour maths (`luminance`, `contrast`, `mix`, `bestOn`, `stateLayer`, `textSafe`, `hsl`, `rgb`) live in `src/color.mjs`.


## Built-in Material 3 baseline

`include` entries are file globs, or the name of a layer the binary carries. `"builtin:material"` is Google's Material 3 token set (`md.ref`, `md.sys` and `md.comp`), so a kit starts from Material and writes only what it changes. Built-in layers sit beneath file includes, which sit beneath the project's `tokens/` and its `media` files. An unknown name fails with `Unknown built-in include`.

Beside it, `src/material-guidance.tokens.json` holds the Material values the Compose token files lack (the slider's handle and icon sizes, the focus indicator, the shadow role), each with its source; it only adds, so a path the vendored data holds fails. The data is `material/`, generated by `scripts/vendor-m3.mjs` from the Compose Material 3 token files in [androidx/androidx](https://github.com/androidx/androidx) (Apache-2.0, The Android Open Source Project) at the SHA in `material/manifest.json`. The token files merge into one, `material/material.tokens.json` (`manifest.json` names each source file), which the engine imports as JSON, so `bun build --compile` embeds the data and the binary needs no `material/` beside it. Never edit `material/` by hand; CI runs `bun scripts/vendor-m3.mjs --check`.

To re-vendor, run `bun scripts/vendor-m3.mjs --sha <androidx sha>` on a branch, review the diff, run `bun test` and open a PR. CI checks `material/` against the recorded SHA. A new Kotlin form the script does not know fails loudly, naming file and line.

## A kit's `theme.toml`

With a `kit`, a hand-written `<kit root>/theme.toml` holds the whole kit: its palette per mode (plain `#rrggbb` hex), which palette colour fills each role it picks, its faces, its other tokens, and the recipes and floors the build applies. The build reads it as token layers in memory and writes nothing beside it.

```toml
name = "acme"                          # must equal kit.name in the config
title = "Acme"                         # optional: the name outputs show (default: name)
tagline = "Ink on paper."              # optional: one line in the kit's voice, under the name on claude-design's cover
icon = "style"                         # optional: a Material Symbol, the playground's mark on small screens
extends = "base.toml"                  # optional: another theme's file beside this one (a copy at the version this kit
                                       # builds on); its default, [media], [palette] and [faces] come first, this file's add or change them
default = "night"                      # the base mode
[media]
day = "(prefers-color-scheme: light)"  # every other mode and its media query
[palette.night]
ink = "#101418"
blue = "#7aa2f7"
[palette.day]
ink = "#f6f6f6"
blue = "#2e7de9"
[roles]
"md.sys.color.surface" = "ink"         # a token path to a palette colour, resolved per mode
"md.sys.color.primary" = "blue"
"md.sys.color.scrim" = "night.ink"     # one mode's colour, in every mode
"md.sys.color.inverse-surface" = "day.ink"
[roles.day]                            # overrides a role in one mode
"md.sys.color.inverse-surface" = "night.ink"
[faces]                                # brand, plain, mono, icon: a family or a stack
brand = "Some Sans"
mono = ["Some Mono", "monospace"]
[tokens]                               # every other value, by token path
"acme.layout.gap" = "8px"              # a length or a time is typed by its unit (px, rem, em; ms, s)
"acme.hero.weight" = { value = 600, type = "fontWeight", why = "Bolder over art" }
"md.sys.typescale.label-large.font" = { value = "{acme.typeface.mono}", why = "Labels in the mono face" }
```

The palette sits under `<name>.palette.<colour>`, brand and plain in Material's `md.ref.typeface` slots, mono and icon under `<name>.typeface`, and each role at its path. A role the kit doesn't pick comes from its other layers (its own tokens, `include`, `builtin:material`); a theme that maps any Material colour role must leave none unset once they merge. A `[tokens]` entry is a value (an alias, a length, a time, a number or a string) or a table of `value`, `type` and `why`; tables nest by path, and a table without a `value` is a group. A value that replaces a token keeps that token's type; a new one is typed by its unit, else a number or a string, and a list needs a `type`. A path under `md.` changes Material, so it needs a `why`, which becomes its `$description`. The theme sits above `include` and below the project's `tokens/` files, where a token set twice fails; each other mode joins the `media` layers for its query. A role naming a colour a palette lacks, or a mode with no palette, fails the build, naming the role, the colour and the mode; so do `[roles.<mode>]` for an unknown mode, and an override of a role `[roles]` doesn't set.

### `[derived]`: the roles a palette has no step for

```toml
[derived]
accents = ["amber"]                    # the kit's own accents (<name>.color.<accent>), beside Material's four
container-opacity = 0.12               # a container is its accent at this fraction over surface-container-low
marks = { group = "track", darker = ["slow"] }  # optional: <name>.<group>.<item>.color gets a mark role
```

The build computes Material's on-colours and containers for primary, secondary, tertiary and error and for each listed accent, the fixed roles for primary, secondary and tertiary, and a mark per item of the group (in the other mode, tone 40 of its hue for the `darker` items), before it resolves anything else, so one run is final. They need exactly one other mode, and read Material's `surface`, `surface-container-lowest`, `surface-container-low`, `on-surface`, `inverse-surface`, `inverse-on-surface` and the accents. Each carries the `com.kickinrad.derived` extension, which the playground marks.

### `[contrast]`: the floors the build holds

```toml
[contrast]
text = 4.5                             # Material's text pairs: each on-colour on its colour, on-surface on the page, the card and the top surface
graphics = 3                           # outline on every surface, the derived group's on-container, and its marks on the page, the card and the filled card
[[contrast.exceptions]]                # lowers one checked pair's floor, with a reason
fg = "md.sys.color.on-secondary"
bg = "md.sys.color.secondary"
min = 4.3
why = "A filled secondary carries a label, not body text"
[[contrast.pairs]]                     # any other pair the kit wants held
fg = "acme.color.ink"
bg = "acme.color.paper"
min = 4.5
```

Every pair is resolved in the base mode and in each other mode, and a pair under its floor, or a path that is not a colour token, fails the build and `--check`, naming the pair, the mode, the ratio and the floor. An exception for a pair the build doesn't check fails.

`src/motion.mjs` (springs as CSS `linear()` easings) and `src/type.mjs` (the fifteen type styles) are libraries, not targets (the `css` target uses the first).

## The `css` target's modes and springs

`css: { scheme: "dark" }` names the base mode (`"dark"` or `"light"`). Each colour that differs by mode is then one `light-dark()` declaration on `:root`, with `color-scheme: <base> <other>` there, so the page follows the system. `[data-theme="light"]` and `[data-theme="dark"]` set only `color-scheme`, which pins a mode on the root or any element: a variable holding `light-dark()` resolves where it is used, so a pinned subtree switches without re-declaring anything. A non-colour token that differs by mode keeps its `prefers-color-scheme` media block on `:root:not([data-theme="<base>"])` and its value on each `data-theme` pin. `light-dark()` needs a Baseline 2024 browser (Chrome 123, Safari 17.5, Firefox 120). Without `scheme` the output is unchanged.

The `css` output writes Material's own component tokens (from `builtin:material`, untouched by the project) only where the `beer` output's rules read them; a component token the project or kit sets itself is always written. A platform that wants the full set builds it from `builtin:material` with its own output. The playground carries the same set. When the tokens hold Material's springs (`md.sys.motion.spring.*.damping` and `.stiffness`), each spring also gets a `-easing` (a CSS `linear()` curve) and a `-settle` time.

## The `react-native` target

`"react-native"` writes a typed TypeScript module for Expo or React Native. It needs a declared kit with two modes (the base and one media mode), `builtin:material`, and a `.ts` output path:

```js
export default {
  targets: ["react-native"],
  include: ["builtin:material"],
  kit: { name: "acme" },
  "react-native": { path: "ports/react-native/tokens.ts" },
};
```

The module exports `tokens[mode]` with the resolved DTCG paths as nested objects, `textStyles[mode]` with Material's fifteen React Native `TextStyle` values, and the `ThemeMode` and `ThemeTokens` types. Mode keys come from `theme.toml` (for example `night` and `day`). Use `tokens[mode].md.sys.color.primary` for a role, `tokens[mode].md.sys.shape.corner.medium` for a radius, and `textStyles[mode]["label-large"]` for a text style. Dimensions become [unitless density-independent values](https://reactnative.dev/docs/height-and-width) for React Native layout, durations become milliseconds, colours remain strings, and font stacks become their first family. Install the named fonts in the app. A `rem` dimension becomes 16 points per rem, the web's default root size, so a measure can stay in `rem` for the web. A dimension in `em` or `%` fails, because React Native has no parent size to resolve it against. CSS shadows, aggregate typography tokens, and untouched Material component defaults are omitted; named typography styles are in `textStyles`.

When the kit lists platforms, the module also exports `themes[platform][mode]`, `ThemePlatform`, and `Theme`. Each theme holds its own `tokens` and `textStyles`. The app can select a platform with `Platform.select({ ios: "ios", android: "android", default: "android" })`, then read `themes[platform][mode]`. The listed platform keys and both mode keys are TypeScript types. A kit without `platforms` keeps the earlier output byte for byte.

Shortcut: system chrome uses the base mode's brand tint in both platform modes. Revisit this when a kit needs a different chrome tint in its other mode.

## The `beer` target

`"beer"` themes [Beer CSS](https://github.com/beercss/beercss) with the kit's tokens: a Beer variable for each of the kit's Material colour roles, set to `var(--md-sys-color-<role>)` (Beer names its colours after the roles), Beer's system variables (size, font, speeds, state layer, overlay) set from Material's, the label-large type on buttons and chips, Material's values where Beer draws its own (focus ring, slider handles, large buttons, rail, list, app bar, in `src/web/material.css`), and Material's panes inside Beer's main (`main > .panes`, Material's breakpoints, pane widths and spacer, in `src/web/layout.css`). Load it after Beer and the `css` output, and set the mode with `data-theme`.

`beer: { path: "src/styles/beer.css" }`. With a kit, Beer's `--font-icon` reads `<name>.typeface.icon` and the opacity of its `--elevate1..3` shadows `<name>.elevation.shadow-opacity`; with either token absent, Beer keeps its own value.

## The `playground` output

`"playground"` writes `index.html`, one page that opens from disk and shows the kit on its own generated theme, for a declared kit. List the `css` and `beer` outputs before it, and `tailwind` too if the kit has one; the page carries all of them.

```js
playground: { path: "docs/playground", examples: ["preview/example.json"] }
```

- `path`: the directory it writes.
- `examples` (optional): the project's own entry files, read at build and carried in the page. An entry is `{ name, surface, output, preview?, captures?, devices? }`: `preview` a live web page, `captures` `[{ src, label, build? }]` for a surface a page cannot embed, `devices` `[{ name, width, height }]`, each path relative to the entry. A missing entry fails the build; a missing preview or capture fails `breacan audit`.
- theme.toml's `icon` (a Material Symbol) is the kit's mark in the top app bar on small screens (`style` otherwise).
- The **Columns** destination shows one specimen screen four times: **Base** (the Breacán-neutral base alone), **Theme** (the kit's own look), **Platform** (the platform's language alone, at Native) and **Kit** (what the dial resolves for that platform at the kit's level). A kit with `platforms` gets Platform and Kit, with a picker when it lists more than one; without, Base and Theme only. The mode switch moves every column. Each column is the same markup under its own CSS variables, written by the `css` output's own code; the columns stack on a phone.

It writes:

| File | Holds |
| --- | --- |
| `index.html` | Beer's stylesheet in a cascade layer, the kit's `css` and `beer` outputs, the kit's data (name, version, title, the tokens the `css` output carries, per mode, `notes.md` as HTML, the examples) and the engine's client as one script. Beer's script and the icon face come from their CDNs. The page has a navigation rail (Foundations, Components, Cards, Pages, Examples when there are entries, Rules), each destination a list-detail layout at `#destination/item`, and a top app bar with the kit's title and a mode switch. |
| `tailwind.html` | with a `tailwind` output: Tailwind's utility classes on the kit's outputs, shown in a frame so Tailwind's reset leaves Beer alone. |

A mode's `data-theme` is the colour scheme its surface is nearer to, so the switch needs one dark and one light mode. `breacan audit`, below, checks the page in a browser.

## The `claude-design` output

`"claude-design"` writes the kit as the files of a Claude Design System artifact, for a declared kit: `"claude-design": { path: "ports/claude-design" }`, a directory, under which it writes `project/`. Publish that folder to the kit's design-system artifact, which keeps its own index (`project/design-system.json`, with `"editing": "code"` so the page stays read-only); the output never writes the index. It needs the config's `css` and `beer` outputs, listed before it. It writes:

| File | Holds |
| --- | --- |
| `README.md` | `<kit root>/notes.md` without its title, then each Material token the kit sets by hand with its description, under a header written as a Markdown link reference, which the page hides |
| `tokens.json` | the page's list-shaped tokens: a theme per mode (ids as the `css` output's `scheme` pins them with `data-theme`, else the mode names), every colour but Material's component tokens, the typescale as a type style each in Material's role groups, the corner scale, spacing and the state-layer opacities |
| `tokens.css` | the same values compiled the way the page compiles them; its first line is the page's marker |
| `components/bundle.css` | the type tokens' faces and Beer's icon face from Google Fonts, Beer CSS in its `beer` layer, then the `css` and `beer` outputs |
| `components/bundle.js` | the kit's namespace and no code, since the components are Beer's markup; the page runs previews only beside one |
| `components/<Name>/preview.html`, `README.md` | each playground component specimen in its Material family, loading Beer's script from jsDelivr at the version the engine was built with; the README links Beer's markup and Material's guidance |
| `components/Cover/preview.html` | the cover: the kit's title and `tagline` beside the accent roles as blocks cut by the corner scale |

## The `plugin` output

`"plugin"` writes the kit's agent plugin, one directory that Claude Code and Codex both install, for a declared kit: `plugin: { path: "plugins/acme" }`. The kit writes its own `skills/<name>/SKILL.md`, so its wording changes with the kit and needs no engine release; with none, the output starts one (no header, since the kit then owns it) that points at the references and the lint. The output writes what the skill reads. Optional: `description`, the manifest's one line, when the kit's skill does more than build UI (by default it says the plugin builds UI on the kit); `repository`, a URL where the kit's files are; and `author`, the manifest's `{ name, email?, url? }`. It writes:

| File | Holds |
| --- | --- |
| `.claude-plugin/plugin.json` | the manifest: the kit's name, a description, `author`, `repository` and keywords; no `version`, so the runtime keys the plugin by its commit |
| `skills/<name>/references/index.md` | the references below, each with what it is for |
| `skills/<name>/references/DESIGN.md` | for a kit on the role contract, its DESIGN.md: the roles, the components the contract pairs and the usage rules |
| `skills/<name>/references/breacan.rules.json` | the lint config: `breacan lint --rules <this file> <paths>` in the consumer's repo |
| `skills/<name>/references/notes.md` | the kit's `notes.md`, its rules, when it has one |
| `skills/<name>/references/components.md` | with a `beer` output, each playground component in its Material 3 family with Beer's markup and Material 3's guidance where Material has a page; without one, only the components Material 3 documents, with their guidance |
| `skills/<name>/references/theme.toml` | the kit's `theme.toml`, under a `#` header line, when it has one |

The plugin guides an agent, and its rules file lets the agent's lint enforce the kit. `--check` holds the files it writes current with `notes.md`, `theme.toml` and the config, like any output's; after `path` changes, the old directory stays until it is removed. Files the output does not write, such as a kit's own evaluations beside the skill, stay the kit's.

## The `template` output

`"template"` writes a kit's own files for apps the engine has no output for, such as terminal and editor themes, for a declared kit: `template: { from: "templates", to: "ports" }`. Every file under `from` is written to the same path under `to`. In each file, `{{<mode>.<colour>}}` becomes that mode's palette colour as `#rrggbb` (so `{{night.blue}}80` adds an alpha), and `{{name}}` becomes the kit's name; every other byte stays as written. A slot the theme lacks fails the build, naming the file. CSS, JS, Kotlin, Markdown and HTML files get the generated header; other formats are written as the template has them.

## Live editing: `breacan dev`

`breacan dev [--port <n>]` (port 4400 by default) builds every output, then serves the project on `http://localhost:<port>/` (the playground, when the config has one) and edits the kit's `theme.toml` live, for a declared kit with a `css` output. Edits are built in memory exactly as `breacan` builds them, derived roles and contrast included, and nothing is written until a save. A change to the kit's folder or `tokens/` on disk rebuilds every output.

| Endpoint | Does |
| --- | --- |
| `POST /_kumiko/edit` | takes `{ "<theme.toml path>": value }` (`"palette.night.primary": "#fd5416"`, `"faces.brand": ["Archivo", "sans-serif"]`, `"tokens.acme.layout.gap": "12px"`; `null` drops an edit), builds the draft and answers with the pairs under their floors |
| `POST /_kumiko/save` | writes the edits into `theme.toml` and rebuilds; each edited value changes on its own line, keeping its key, comment and `why`, and a new key joins its table. A draft with a pair under its floor is not saved |
| `GET /_kumiko/live` | the current draft: the `css` output's text, its faces' stylesheets, and the kit's tokens per mode |
| `GET /_kumiko/events` | server-sent events: `live` after every edit, `reload` after a rebuild from disk |
| `GET /_kumiko/bridge.js` | the bridge, below |
| `GET /_kumiko/panel` | the Kit panel: every palette colour of a mode (with the pairs the kit is held to, their live ratios and whether they pass), the faces by the type roles that read them, and the kit's own lengths and times in `[tokens]` as sliders with their units, grouped as Spacing, Radius, Size and Duration; each with its reset, then Save. It wears the kit's own variables. |

The server listens on `127.0.0.1` and answers only to the names `localhost` and `127.0.0.1` with its port; any other host name, such as a LAN name or a DNS-rebinding page's, gets a 403. Only a page the server itself serves can edit or save: a request from another origin is refused.

The bridge is how another app follows the edits: load `http://localhost:<port>/_kumiko/bridge.js` as a classic script, in development only. It adds the draft's CSS in a `<style id="kumiko-live">` (the `css` output's variables on `:root`), loads its faces, and replaces both on every edit, without a reload; each update also fires a `kumiko:live` event on `window` whose `detail` is the kit's tokens per mode (kept as `window.kumikoLive` too), for code that reads tokens in JavaScript. The app's own styles follow when they read the kit's variables, for example `var(--md-sys-color-primary, <its own value>)`, so the page looks as before when the server is stopped. Pin the kit's mode on the root (`data-theme`) when the app has one scheme. A parent page that frames the app switches its mode with `postMessage({ kumiko: "theme", scheme: "light" | "dark" })`, which the bridge sets as `data-theme`.

## Rendered check: `breacan audit`

`breacan audit [<dir>]` opens the generated playground's `index.html` from disk (the config's `playground` path by default) in headless Chrome at 1280 and 412 px, under a host's reset as a page that embeds or publishes it would add, and walks every destination and item in every mode. It fails, one line each (size, mode, place, finding), on: text under Material's contrast (4.5:1, or 3:1 for large text and icons) against the colour actually behind it; text set in a face that is not one of the kit's type or mono faces, or a face that did not load; overlapping parts inside one control; sideways scroll; a heading larger than one a level above it; running text wider than about 75 characters, or a lone reading pane much wider than its text; a page error; or a request that failed (an app's example entry or another kit that is not there is optional). Run it in a kit's CI after `breacan check`. It needs Chrome: `$CHROME`, `google-chrome` or `chromium` on the PATH (GitHub's Ubuntu runners have it), or Playwright's download. The engine's own test runs it on a sample kit (`tests/render.theme.toml`).

## Drift guard: `breacan lint`

With a kit's rules (`breacan lint --rules <file>`, else `breacan.rules.json` in the working directory, which the `rules` output writes), lint also flags a `var(--…)` in a kit namespace that the kit lacks (`theme ref`), a token used against its usage rule (`usage`: a text colour on a background its rule does not allow, or a token on a property its rule does not allow) and an emoji standing in for an icon in markup (`icon`). The contract gives Material's on-colours their backgrounds and `outline-variant` its border-only use; a token adds or changes its own in `$extensions["com.kickinrad.breacan"].usage` (`{ "on": [paths], "properties": ["border*", …] }`). A token an import marks `"needs-review": true` there is named by each build and listed in the rules. These follow the static gates of [ux-ui-agent-skills](https://github.com/plugin87/ux-ui-agent-skills) (MIT).

`breacan lint <path> [<path>...]` fails when a consumer's source hand-types a value the theme defines, instead of reading the theme's variable, or builds markup on Beer with classes and controls Beer doesn't have. A path is a file or a directory (walked; `node_modules`, `.git` and dot-directories are skipped). It scans `.css .scss .yaml .yml .py .js .mjs .ts .jinja .html .kt .kts`; other files are ignored.

| Rule | Finding |
| --- | --- |
| colour | a 3, 4, 6 or 8-digit hex (`#fff`, `#rrggbbaa`; not a `repo#123` reference); `rgb(`, `rgba(`, `hsl(`, `hsla(` followed by a digit; Kotlin `Color(0x…)` |
| motion | a literal duration (`120ms`, `6s`) in a CSS `transition` or `animation` declaration; any `cubic-bezier(`; Compose `tween(` with a number first argument |
| type size | CSS `font-size:` in px; a Kotlin `.sp` literal |
| radius | CSS `border-radius:` with a non-zero px; Compose `RoundedCornerShape(` with a `.dp` literal |
| spacing | a px value in a CSS `margin`, `padding` or `gap` declaration (`margin-top`, `row-gap` and the like too); a `.dp` literal in Compose `padding(` or `spacedBy(` |
| z-index | a CSS `z-index:` number; a Compose `.zIndex(` number |
| component | in an `.html` or `.jinja` file that loads Beer (it names `beercss` or `beer.css`): a class neither Beer nor the engine's `beer` output defines, and a `role` of `button`, `checkbox`, `switch`, `slider`, `tab`, `radio` or `menuitem`, a hand-made control where Beer has one. A templated class list is skipped. |

Zero values pass. Two skips: a file carrying the generated header, and a line carrying `lint: own <why>` with a non-empty reason (a consumer's named local value).

```
cards/control.yaml:68: motion: 120ms
```

One line per finding, `path:line: rule: matched text`, then exit 1. A clean run prints nothing and exits 0; a missing path fails, naming it.

## The `tailwind`, `obsidian` and `mealie` outputs

Five more built-in outputs for a declared kit (they read `ctx.name` and `VERSION`, and fail without a `kit`). Each reads the resolved tokens, the kit's token prefix is its name, the title is the theme's, and the base mode comes first with the other mode second (the mode names are the theme's, capitalised). Every path is an option; `tests/outputs/` is a small kit with golden files for all five.

| Output | Writes | Options (required first) |
| --- | --- | --- |
| `dtcg` | the kit's resolved tokens as DTCG 2025.10 files any tool reads: `<path>/<name>.tokens.json` for the base mode and `<path>/<name>.<mode>.tokens.json` for each other mode's differences and `<path>/<name>.<platform>.tokens.json` for each platform's, aliases resolved and each colour a 2025.10 colour object, without the Material component tokens the kit leaves alone. A kumiko project lists the first after `builtin:material` in `include` and each other in `media` under its query, then builds its own outputs | `path` (a directory other than `tokens/`, the project's own source); needs a declared kit |
| `tailwind` | one Tailwind v4 `@theme inline` file mapping its namespaces onto the kit's runtime CSS variables | `path`, `css` (the runtime CSS file, named in the header) |
| `obsidian` | a snippet per mode for the Minimal theme, its code colours included: `<out>-<mode>.css` | `out`; the monospace face is the theme's `mono` |
| `mealie` | `<out>.env` (Mealie's colour slots) and `<out>.css` (a full-look overlay) | `out`; the slots are the theme's `[mealie]` |

`mealie` reads theme.toml's `[mealie]`: `slots` and `overlay` map Mealie's seven slots (`primary`, `accent`, `secondary`, `success`, `info`, `warning`, `error`) to a palette colour each, and `stars` names the rating stars' colour. Its five layers are the palette colours of Material's `surface`, `surface-container-low`, `surface-container`, `surface-container-high` and `surface-container-highest`, its text `on-surface`'s and its quieter text `on-surface-variant`'s, each one colour in both modes. `obsidian` fills Minimal's hue slots from Material's accents and the kit's colour roles named for the other hues (`<name>.color.orange`, `yellow`, `green`, `cyan`), leaving a slot it lacks to Minimal; its third text tier and strong border take the kit's `on-surface-muted` and `comment` roles, else Material's `outline` and `outline-variant`.
