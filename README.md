# Breacán

Breacán is a command-line tool that turns one design look into ready-to-use files for every platform.

You describe a look once: a few seed colours, a colour scheme, a website or a full set of design tokens. Breacán fills in what you leave out from a neutral base, such as type, spacing, shape, motion and icons. It then writes CSS, a Beer CSS or Tailwind theme, a React Native module, `DESIGN.md`, an agent plugin and more. It checks every colour pair for contrast on the way. Use it to keep a website, a phone app and an AI agent on one look without copying values between them by hand.

Its input and output are [DTCG 2025.10](https://www.designtokens.org) design tokens, the W3C community group's standard format, so other token tools read what it writes. The name is said BRAK-awn, Irish for tartan.

## Install

Breacán is one standalone binary, released on GitHub for Linux x64. Install it with [mise](https://mise.jdx.dev):

```sh
mise use github:kickinrad/breacan
breacan --version
```

## Usage

A kit is one look and the files Breacán builds from it, kept in one folder. Make a kit from two seed colours, build it and check it:

```sh
breacan new --seed "#d9480f" --seed "#2b8a3e" ember
cd ember
breacan build
breacan check
```

`breacan new` prints `breacan new: the ember kit is in ember; run breacan build there`. `breacan build` and `breacan check` print nothing when they pass. The folder then holds:

```text
ember/
├── breacan.config.mjs        what to build, written by breacan new
├── VERSION                   0.1.0
├── breacan.receipt.json      the hash of every input and output
├── DESIGN.md                 the look in Google's DESIGN.md format, for agents
├── src/styles/tokens.css     CSS custom properties, light and dark
├── src/styles/beer.css       a Beer CSS theme on those properties
├── ports/tokens/             DTCG token files and a resolver, for other tools
├── ports/claude-design/      a Claude Design System artifact
└── docs/playground/index.html  one page that shows the whole kit
```

Open `docs/playground/index.html` in a browser to see the kit. The orange seed is now the primary colour family and the green one the secondary, in light and dark. The base fills every other role. The config Breacán wrote is short:

```js
export default {
  preset: "default",
  kit: { name: "ember" },
  modules: ["leonardo"],
  leonardo: { seeds: ["#d9480f","#2b8a3e"] },
  dtcg: { path: "ports/tokens" },
  "claude-design": { path: "ports/claude-design" },
  playground: { path: "docs/playground" },
};
```

Commit the outputs and the receipt, and run `breacan check` in CI.

## How it works

Every build runs the same nine steps:

1. **Input.** Breacán reads the look you give it: seed colours, a Base16 scheme, a website, an image, or your own token files.
2. **Primitives.** It turns that input into raw values with no meaning yet, such as tonal palettes and greys.
3. **Roles.** It maps those values onto one shared list of named roles, such as `primary`, `on-surface`, `body-large` and `touch-min`. The roles are Material 3's, plus what other platforms need. Every output reads them.
4. **Base.** A neutral base gives every role a value, so even two colours build a whole kit. Greys come from Radix, type and spacing from Adobe Spectrum, and motion from Fluent 2.
5. **Theme.** Your `theme.toml` and `tokens/` files override any role.
6. **Platform.** Each platform's own design language, such as Apple's for iOS, offers native values.
7. **Dial.** For each platform, the dial decides which parts of the look stay yours and which take the platform's.
8. **Components.** Component tokens, such as a button's height, build on the roles.
9. **Outputs and checks.** Breacán writes each output's files and the receipt, and fails on a contrast pair under its floor.

## What it reads and writes

| Source | Gives |
| --- | --- |
| `tokens/*.tokens.json` | Your own DTCG tokens, the top layer. |
| `tokens/*.resolver.json` | A DTCG resolver that governs `tokens/` and its modes. |
| `theme.toml` | A whole kit in one file: palettes, roles, faces and contrast floors. |
| `include` files | Other token files, as base layers. |
| `builtin:material` | Google's Material 3 tokens, built into the binary. |
| `builtin:base` | The neutral base that fills every role. |
| `scheme` | A Base16, Base24 or iTerm2 colour scheme. |
| `site` | A website's colours, fonts, corners and spacing. |
| `image` | A picture's strongest colours. |
| `leonardo`, `material` | Colour engines that grow seed colours into full palettes. |

| Output | Writes |
| --- | --- |
| `dtcg` | DTCG token files and a resolver. |
| `css` | CSS custom properties. |
| `beer` | A Beer CSS theme. |
| `tailwind` | A Tailwind v4 theme. |
| `react-native` | A typed TypeScript module for React Native and Expo. |
| `design-md` | `DESIGN.md` in Google's format. |
| `claude-design` | A Claude Design System artifact. |
| `plugin` | An agent plugin for Claude Code and Codex. |
| `rules` | The lint rules apps check their code against. |
| `playground` | One page that shows the kit. |
| `obsidian` | Obsidian snippets for the Minimal theme. |
| `mealie` | A Mealie theme. |
| `template` | Your own templates, filled with the kit's colours. |

## Platforms and the dial

A kit can list the platforms it ships on, each with a design language and a dial level. Breacán has built-in languages for Apple (iOS) and Material (Android).

The dial has four levels: `native` takes everything from the platform, `tinted` keeps your colours, `branded` keeps colour, type and shape, and `signature` keeps your whole look. Below `signature`, system bars and sheets stay native, tinted with your primary colour.

```js
platforms: { ios: { language: "apple", dial: "tinted" } }
```

## Commands

| Command | Does |
| --- | --- |
| `breacan build [--refresh]` | Builds every output in `breacan.config.mjs`. `--refresh` reads a `site` source again. |
| `breacan check` | Fails if an input changed or an output was edited since the last build. |
| `breacan new --seed <hex>… [<dir>]` | Writes a starter kit around one to three seed colours. |
| `breacan edit [--port <n>]` | Serves a local editor that previews changes live and saves them to the kit. |
| `breacan audit [<dir>]` | Checks the playground in headless Chrome for contrast, fonts and layout. |
| `breacan lint [--rules <file>] <path>…` | Fails on app code that hand-types a value the kit defines. |
| `breacan --version` | Prints the version. |

## Reference

- [Configuration](docs/config.md): every key in `breacan.config.mjs`, and the layer order.
- [theme.toml](docs/theme-toml.md): palettes, roles, faces, tokens, derived roles and contrast floors.
- [Sources](docs/sources.md): token files, built-in layers, the base, schemes, websites, images and colour engines.
- [Outputs](docs/outputs.md): each output's options and files, and the generated header.
- [Platforms and the dial](docs/platforms.md): languages, foundations, levels and system chrome.
- [breacan edit](docs/edit.md): the local editor and its endpoints.
- [Check, audit and lint](docs/check-and-lint.md): the receipt, the browser audit and the lint rules.
- [Writing a module](docs/modules.md): your own output, source or language.

The [breacan plugin](plugins/breacan/README.md) gives Claude Code and Codex skills to make a kit and to build apps on one.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). There is nothing to sign.

## License

Apache-2.0, copyright William Tierney. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
