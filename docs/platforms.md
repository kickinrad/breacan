# Platforms and the dial

A kit can adapt itself to each platform it ships on. Each platform gets a language, which holds the platform's native values. It also gets a dial, which says how much of the kit's own look the platform keeps. The code is `src/dial.mjs`.

```js
platforms: {
  ios: { language: "apple", dial: "tinted" },
  android: { language: "material", dial: { level: "branded", motion: "theme" } },
}
```

## Foundations

The dial works one foundation at a time. Each foundation has its own token groups (`FOUNDATIONS` in `src/dial.mjs`):

| Foundation | Token groups |
| --- | --- |
| `colour` | `md.sys.color`, `md.sys.state` |
| `type` | `md.sys.typescale`, `md.ref.typeface` |
| `shape` | `md.sys.shape` |
| `spacing` | `breacan.sys.spacing`, `breacan.sys.touch-min`, `breacan.sys.density` |
| `motion` | `md.sys.motion` |
| `elevation` | `md.sys.elevation` |
| `icons` | `breacan.sys.icon-set` |
| `components` | `md.comp` |

## Dial levels

The level says, for each foundation, whether the platform keeps the theme's values or takes the language's. The language's values sit over the theme and the project's `tokens/`.

| Level | Keeps from the theme |
| --- | --- |
| `native` | nothing |
| `tinted` | colour |
| `branded` | colour, type and shape |
| `signature` | everything |

`dial: { level: "branded", motion: "theme" }` sets one foundation against its level. The value is `"theme"` or `"platform"`.

## System chrome

System chrome is the platform's bars, sheets and system controls. A language gives it as a `chrome` tree under `breacan.comp`.

Below `signature`, chrome stays the language's whatever the foundations say, tinted with the brand. The dial sets `breacan.sys.tint` to each mode's `md.sys.color.primary`, and the language's chrome uses it. At `signature`, the kit's own components draw the chrome.

## Built-in languages

**Apple** is `language: "apple"`, for iOS. It gives only what Apple publishes as fixed values:

- colour swatches in light and dark;
- SF Pro, and the text sizes of Dynamic Type's default (Large) setting;
- the 44 pt `touch-min`;
- SF Symbols;
- system chrome.

Setting `platforms: { ios: { language: "apple", dial: "tinted" } }` on a seed kit keeps its colours and takes iOS foundations. React Native scales text with the user's setting at runtime. The [breacan-apple plugin](../plugins/breacan-apple/README.md) links Apple's HIG guidance.

**Material** is `language: "material"`, for Android. It gives only what Material publishes as fixed values, from the vendored androidx tokens:

- baseline colour roles in light and dark;
- Roboto and the type scale;
- the shape corner scale;
- motion durations and easings;
- elevation levels;
- the 48 dp `touch-min`;
- Material Symbols.

It sets no system chrome and no component tokens.

## Writing a language

A language is a module `{ slot: "language", name, run }`, and the config lists its object as `language`. Breacán calls `run({ platform, mode, scheme })` once for the base mode and once for each other mode. `mode` is the kit's name for the mode, and `scheme` is `"light"` or `"dark"`, so a language gives each mode its own colours.

`run` returns an object with a DTCG tree for each foundation it sets, plus `chrome`. Each tree may set only its own foundation's groups, and a token outside them fails the build. `tests/dial/kit-d` is a fixture kit with a fixture Apple language.

A kit with platforms needs every mode's media query to name a colour scheme, such as `(prefers-color-scheme: light)`.

## What outputs see

Every platform's resolved modes meet the kit's contrast floors ([theme.toml](theme-toml.md#contrast-floors)).

- Outputs read a platform's base tokens as `ctx.platforms.<platform>.tokens`, and its other modes as `ctx.platforms.<platform>.media[mode]`.
- The `dtcg` output writes `<name>.<platform>.tokens.json` with each platform's differences in the base mode.
- The `react-native` output adds a theme per platform.
- The playground shows each platform in its Platform and Kit columns.

[Outputs](outputs.md) has the details of each.

## Limits

- The DTCG resolver has no platform modifier. Add one when a consumer reads a platform through the resolver.
- Per-foundation overrides do not reach chrome, which follows the level alone. Add a `chrome` override when a kit needs its own bars below `signature`.
