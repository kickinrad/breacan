# Sources

Breacán reads a kit's values from token files, built-in layers and `theme.toml`. Modules add more: some read a look from outside, and colour engines generate one. All of them stack into one set of tokens before any output runs ([Configuration](config.md#layer-order)).

## Token files

The project's own tokens are DTCG 2025.10 files in `tokens/*.tokens.json`. They sit above every other layer, and a token set in two of them fails the build.

## A resolver in tokens/

A DTCG 2025.10 resolver in `tokens/` (`*.resolver.json`) governs that folder. Breacán reads it through [Terrazzo's parser](https://terrazzo.app/docs/reference/js-api/).

- Its default input is the base mode.
- A single `mode` modifier gives each other context as a media layer, under the query that `$extensions["com.kickinrad.breacan"].media` names.
- `tokens/` may hold one resolver. Two or more fail.

The `dtcg` output writes a resolver beside its files, so another kit, Terrazzo or Swatchbook reads a kit as one document.

## Includes

`include` entries are file globs or the names of layers built into the binary. Built-in layers sit beneath file includes. An unknown built-in name fails with `Unknown built-in include`.

### builtin:material

`builtin:material` is Google's Material 3 token set: `md.ref`, `md.sys` and `md.comp`. A kit starts from Material and writes only what it changes.

The data is `material/material.tokens.json`, generated from the Compose Material 3 token files in [androidx/androidx](https://github.com/androidx/androidx) (Apache-2.0, The Android Open Source Project). `material/manifest.json` records the androidx commit and names each source file. The binary embeds the data, so it needs no `material/` folder beside it.

`src/material-guidance.tokens.json` adds the Material values the Compose token files lack, such as the slider's handle and icon sizes, the focus indicator and the shadow role. Each value names its source. It only adds, so a path the vendored data already holds fails.

[CONTRIBUTING.md](../CONTRIBUTING.md#update-the-material-tokens) says how to update the vendored data.

### builtin:base

`builtin:base` adds the Breacán-neutral base, which fills every role in the role contract (`src/contract.mjs`). The contract holds Material's colour, type, shape, motion, elevation and state roles. It adds `breacan.sys` spacing, `touch-min`, `icon-set` and `density`.

The base draws on four design systems:

- Greys and accents are [Radix Colors](https://www.radix-ui.com/colors): blue, slate, violet and red, with step 11 as the accent.
- Type and spacing follow Adobe Spectrum.
- Durations, easings and elevation follow Fluent 2.
- Material sits beneath it all.

The base gives the kit's base mode the colours of its colour scheme, and the other scheme to the colour-scheme media query. A kit with no modes is light, with dark under `(prefers-color-scheme: dark)`.

Any source or colour engine module turns the base on, even without the include. With the base on, the build fails when any contract role lacks a value in any mode.

## Source modules

A source module reads a look from outside. Each gives colour roles in both schemes over the base, and later modules sit over earlier ones.

### scheme

`scheme` reads one or two [tinted-theming](https://github.com/tinted-theming/schemes) Base16 or Base24 files, one per variant:

```js
scheme: { files: ["night.yaml", "day.yaml"] }
```

- `base00` to `base07` become the neutral roles.
- `base0D`, `base0C`, `base0E` and `base08` become the primary, secondary, tertiary and error accents. Each moves toward the text colour until it holds 4.5:1.
- The sixteen ANSI colours become `scheme.ansi.0` to `scheme.ansi.15`, as tinted-theming's shell templates map them.
- With one file, the other variant keeps the base's colours.

The same list takes an iTerm2 colour scheme (`.itermcolors`):

- Its ANSI 0 to 15 become `scheme.ansi.0` to `scheme.ansi.15`, and ANSI 1 to 6 become the accents.
- Its background, foreground and selection become `base00`, `base05` and `base02`.
- The steps between come from mixing the background and foreground.
- The background decides whether the scheme is light or dark.

### site

`site` reads a website:

```js
site: { url: "https://example.com", snapshot: "design/site.json", engine: "leonardo" }
```

It opens the page in Chrome with [Dembrandt](https://github.com/dembrandt/dembrandt) (MIT). It looks for Chrome in `$CHROME`, then on the `PATH`, then in Playwright's download.

- The colours, font families, corner radii and spacing it finds become `site.color`, `site.font`, `site.radius` and `site.space` tokens. Each is marked `needs-review` ([Check, audit and lint](check-and-lint.md#review-flags)).
- Only what Dembrandt picks with confidence fills roles. Its primary, secondary and accent colours seed a colour engine.
- Its heading and body fonts become `md.ref.typeface.brand` and `plain`. The base fills the rest.

`site` reads the page once into its snapshot file, `design/site.json` by default. Every later build reads that file, so the kit builds the same way offline, and the receipt holds the snapshot like any input. `breacan build --refresh` reads the page again and rewrites the snapshot. A snapshot of another `url` fails the build and names the refresh.

### image

`image` reads a picture:

```js
image: { file: "brand/hero.png", engine: "leonardo" }
```

It finds up to three of the picture's best-scoring colours with Material's quantiser and scorer. They seed a colour engine and are written as `image.palette`. The build reads the image every time; the file is the kit's own.

`site` and `image` both take `engine: "material"` to use Material's colour engine instead of Leonardo.

## Colour engines

A colour engine is a `foundation` module. It gives every colour role it knows in both schemes, over the base. Each takes one to three `seeds`, as `#rrggbb`: primary, then secondary, then tertiary.

```js
modules: ["leonardo"],
leonardo: { seeds: ["#d9480f", "#2b8a3e"] },
```

- **`leonardo`** is the default, from [Adobe Leonardo](https://leonardocolor.io). Each seed becomes an accent family at set contrasts against the base's surface. The accent is 5.5:1 in light and 7:1 in dark. Its container is just off the surface, and the container's text is 10:1 or 11:1. Greys stay the base's.
- **`material`** uses [material-color-utilities](https://github.com/material-foundation/material-color-utilities). It makes Material's tonal-spot scheme from the first seed, greys included. A second or third seed replaces the secondary or tertiary palette.

## Starter kits

`breacan new` writes a starter kit around seed colours:

```sh
breacan new --seed <hex> [--seed <hex>…] [--engine leonardo|material] [<dir>]
```

The kit is named after its folder, which defaults to the working directory. It writes `breacan.config.mjs` with the `default` preset and the chosen engine, and a `VERSION` of `0.1.0` if there is none. It refuses to write over a folder that already holds `breacan.config.mjs`.

## Limits

- An iTerm2 scheme's cursor colour is not read, and every colour is read as sRGB whatever its colour space. Lift this when a role needs the cursor.
