# Configuration

`breacan.config.mjs` tells Breacán what to read and which outputs to write. It is in the project's root, and every verb except `new` and `lint` reads it from the working directory.

## Example

```js
// breacan.config.mjs
export default {
  preset: "default",
  without: ["claude-design"],
  modules: ["tailwind"],
  include: ["builtin:material", "vendor/*.tokens.json"],
  media: { "(max-width: 850px)": ["tokens/responsive.tokens.json"] },
  kit: { name: "acme", root: "design" },
  css: { path: "src/styles/tokens.css", layer: "base", prelude: "", scheme: "dark" },
  tailwind: { path: "src/styles/tailwind.css", css: "src/styles/tokens.css" },
};
```

## Keys

| Key | Holds |
| --- | --- |
| `preset` | A named list of built-in modules. The one preset is `default`: `dtcg`, `css`, `beer`, `design-md`, `claude-design` and `playground`. An unknown name fails, listing the presets. |
| `without` | Names to leave out of the preset. |
| `modules` | More modules, after the preset's. Each is a built-in's name, or a module the config imports, listed as its object ([Modules](modules.md)). |
| `include` | Base layers beneath `tokens/`: file globs, `builtin:material` and `builtin:base` ([Sources](sources.md)). |
| `media` | Each media query and the token files that apply under it. |
| `kit` | The kit's name and folder (below). |
| `platforms` | Each platform's language and dial ([Platforms and the dial](platforms.md)). |
| `<module name>` | That module's options, such as `css: { path }` ([Outputs](outputs.md)). |

A config that names no modules fails. A name Breacán does not know fails as `Unknown token target`. The removed `storybook` output fails by name and points to Swatchbook.

## The kit

`kit` is optional, and most outputs need it.

- `name` is required once `kit` is set.
- `root` is the kit's folder, relative to the config. It defaults to `design`.
- `VERSION` in the working directory must hold a semantic version, such as `0.1.0`.

With a kit, the build reads `<root>/theme.toml` if there is one ([theme.toml](theme-toml.md)), and every generated text file starts with a header ([Outputs](outputs.md#the-generated-header)).

## Layer order

The build stacks its layers lowest first, and a higher layer overrides a lower one:

1. Built-in layers: `builtin:material`, then the base and any colour engine.
2. `include` files, in the order listed. A glob's matches join in sorted order.
3. The kit's `theme.toml`.
4. The project's `tokens/*.tokens.json`. A token set in two of these files fails.
5. For each other mode, its `media` files, under its query.

A media token must override a token the base mode already has, or the build fails.

## Each module's options

A module's options sit under its name. An option that says where a module writes has a default, or the config must set it; a missing required option fails as `<module> option "<key>" is required`. Each output's options are in [Outputs](outputs.md).
