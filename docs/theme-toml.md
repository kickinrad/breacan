# theme.toml

A kit's `theme.toml` holds its whole look in one hand-written file. It sets a palette per mode, the colour each role takes, the faces, other tokens and the rules the build holds. It is `<kit root>/theme.toml`, and the build reads it only when the config sets `kit` ([Configuration](config.md)).

The build turns it into token layers in memory and writes nothing beside it. It sits above `include` and below the project's `tokens/` files. Each other mode's values join the `media` layers under that mode's query.

## Example

```toml
name = "acme"
title = "Acme"
tagline = "Ink on paper."
icon = "style"
extends = "base.toml"
default = "night"

[media]
day = "(prefers-color-scheme: light)"

[palette.night]
ink = "#101418"
blue = "#7aa2f7"

[palette.day]
ink = "#f6f6f6"
blue = "#2e7de9"

[roles]
"md.sys.color.surface" = "ink"
"md.sys.color.primary" = "blue"
"md.sys.color.scrim" = "night.ink"
"md.sys.color.inverse-surface" = "day.ink"

[roles.day]
"md.sys.color.inverse-surface" = "night.ink"

[faces]
brand = "Some Sans"
mono = ["Some Mono", "monospace"]

[tokens]
"acme.layout.gap" = "8px"
"acme.hero.weight" = { value = 600, type = "fontWeight", why = "Bolder over art" }
"md.sys.typescale.label-large.font" = { value = "{acme.typeface.mono}", why = "Labels in the mono face" }
```

## Top-level keys

| Key | Holds |
| --- | --- |
| `name` | The kit's name. It must equal `kit.name` in the config. |
| `title` | Optional. The name outputs show. It defaults to `name`. |
| `tagline` | Optional. One line in the kit's voice, shown under the name on the `claude-design` cover. |
| `icon` | Optional. A Material Symbol, the playground's mark on small screens. |
| `extends` | Optional. Another theme file beside this one, such as a copy of a parent theme at the version this kit builds on. Its `default`, `[media]`, `[palette]` and `[faces]` come first, and this file adds to them or changes them. |
| `default` | The base mode's name. It needs a `[palette.<default>]`. |
| `[media]` | Every other mode and its media query. Each needs its own palette. |
| `[palette.<mode>]` | The mode's colours, each a plain `#rrggbb` hex. |
| `[roles]` | Each token path and the palette colour it takes. |
| `[faces]` | The kit's faces. |
| `[tokens]` | Every other value, by token path. |
| `[derived]`, `[contrast]` | The roles the build computes, and the floors it holds (below). |
| `[mealie]` | The `mealie` output's colour slots ([Outputs](outputs.md#mealie)). |

Any other key fails, naming the expected keys.

## Palette and roles

The palette is written to `<name>.palette.<colour>`. A role names a colour in one of two ways:

- `"blue"` takes each mode's own `blue`.
- `"night.ink"` takes the night palette's `ink` in every mode.

`[roles.<mode>]` overrides a role in one mode, and the role must also be in `[roles]`.

A role the kit does not pick comes from its other layers: its own tokens, `include` and `builtin:material`. A theme that maps any Material colour role must leave none unset once the layers merge.

## Faces

`[faces]` takes `brand`, `plain`, `mono` and `icon`, each a family name or a stack. `brand` and `plain` fill Material's `md.ref.typeface` slots. `mono` and `icon` go under `<name>.typeface`.

## Tokens

A `[tokens]` entry is either a plain value or a table of `value`, `type` and `why`.

- A plain value is an alias, a length, a time, a number or a string.
- Tables nest by path, and a table without a `value` is a group.
- A value that replaces a token keeps that token's type.
- A new value takes its type from its unit: `px`, `rem` or `em` makes a dimension, and `ms` or `s` makes a duration. Otherwise it is a number or a string.
- A list needs a `type`.
- A path under `md.` changes Material, so it needs a `why`. The `why` becomes the token's `$description`.

## Derived roles

`[derived]` computes the roles a palette has no step for.

```toml
[derived]
accents = ["amber"]
container-opacity = 0.12
marks = { group = "track", darker = ["slow"] }
```

- `accents` lists the kit's own accents, `<name>.color.<accent>`, beside Material's four.
- `container-opacity` sets a container to its accent at this fraction over `surface-container-low`.
- `marks` is optional. Each `<name>.<group>.<item>.color` gets a mark role. In the other mode, the `darker` items take tone 40 of their hue.

The build computes Material's on-colours and containers for primary, secondary, tertiary, error and each listed accent. It also computes the fixed roles for primary, secondary and tertiary, and a mark for each item of the group.

These roles come first, before anything else resolves, so one run is final. They need exactly one other mode. They read Material's `surface`, `surface-container-lowest`, `surface-container-low`, `on-surface`, `inverse-surface`, `inverse-on-surface` and the accents. Each has the `com.kickinrad.derived` extension, and the playground marks it.

## Contrast floors

`[contrast]` sets the floors the build holds.

```toml
[contrast]
text = 4.5
graphics = 3

[[contrast.exceptions]]
fg = "md.sys.color.on-secondary"
bg = "md.sys.color.secondary"
min = 4.3
why = "A filled secondary carries a label, not body text"

[[contrast.pairs]]
fg = "acme.color.ink"
bg = "acme.color.paper"
min = 4.5
```

- `text` covers Material's text pairs: each on-colour on its colour, and `on-surface` on the page, the card and the top surface.
- `graphics` covers `outline` on every surface, the derived group's on-container, and its marks on the page, the card and the filled card.
- `[[contrast.exceptions]]` lowers one checked pair's floor and needs a `why`. An exception for a pair the build does not check fails.
- `[[contrast.pairs]]` adds any other pair the kit wants held.

The build resolves every pair in the base mode and in each other mode, and on each platform. A pair under its floor fails `breacan build` and `breacan check`, naming the pair, the mode, the ratio and the floor. A path that is not a colour token fails too.

## Errors

Each of these fails the build and names what is wrong:

- a role that names a colour its palette lacks;
- a mode with no palette;
- `[roles.<mode>]` for an unknown mode;
- an override of a role that `[roles]` does not set;
- a `name` that differs from `kit.name`.
