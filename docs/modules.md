# Writing a module

Every part of Breacán outside the engine is a module of one shape. A project can write its own output, source or language, import it in `breacan.config.mjs`, and list its object beside the built-ins. The code is `src/modules.mjs`.

```js
// breacan.config.mjs
import sizes from "./tools/sizes.mjs";

export default {
  preset: "default",
  kit: { name: "acme" },
  modules: [sizes],
  sizes: { path: "ports/sizes.json" },
};
```

## The shape

```js
export default {
  slot: "output",
  name: "sizes",
  reads: ["tokens", "kit"],
  writes: { path: "ports/sizes.json" },
  async run(ctx) {
    const sizes = ctx.tokens.filter((token) => token.type === "dimension");
    return [{ path: ctx.options.path, content: `${JSON.stringify(sizes.map((t) => [t.path, t.value]))}\n` }];
  },
};
```

| Field | Holds |
| --- | --- |
| `slot` | When it runs: `source`, then `foundation`, then `output`. |
| `name` | Its name. The config sets its options under this name. |
| `reads` | What of `ctx` it needs. `kit` makes a missing kit an error. |
| `writes` | Each option that says where it writes, mapped to its default. `null` means the config must set it. |
| `run(ctx)` | Returns a list of `{ path, content }` files. |

A file may also set `lead: n`, to keep its first `n` lines above the generated header. It may set `shared: true` for a file that also holds hand-written text, which then gets no header ([Outputs](outputs.md#the-generated-header)).

The older output shape `{ name, build }` still works, with `build` taking the place of `run`.

A language is a fourth kind of module, `{ slot: "language", name, run }`, listed under `platforms` instead of `modules` ([Platforms and the dial](platforms.md#writing-a-language)).

## Slots

- A **source** reads a look from outside, such as a scheme file, a website or an image.
- A **foundation** generates a look, such as a colour engine.
- An **output** writes files.

A source or foundation returns colour roles in both schemes, as `{ light, dark }` token trees over the base. Later modules sit over earlier ones. Its `ctx` holds its `options`, `check`, `refresh`, and `read(path)`, which reads a file and adds it to the receipt's inputs.

## Presets

A preset is a named list of built-in modules. The one preset is `default`: `dtcg`, `css`, `beer`, `design-md`, `claude-design` and `playground`. The config's modules run in order: the preset's, less any `without` names, then its own `modules`.

## An output's ctx

| Field | Holds |
| --- | --- |
| `tokens` | The base mode's resolved tokens. |
| `media` | Each other mode's layers, by media query. |
| `mediaTokens(layers)` | Resolves one of `media`'s values into that mode's tokens. |
| `options` | This module's options, with `writes` defaults filled in. |
| `config` | The config, with every module's resolved name in `targets` and each module's options filled in, so an output can find a sibling's path. |
| `built(path)` | What an earlier output in this run wrote at a path, so a later output reads it current. |
| `render(name)` | A built-in output's first file, made in memory with its default options. |
| `readExisting(path)` | A file's text, or `undefined`. The file joins the receipt's inputs. |
| `list(dir)` | A folder's files. The folder joins the receipt's inputs. |
| `platforms` | Each platform's `tokens` and `media`, when the kit lists platforms. |

With a kit, `ctx` also holds:

- `root`, the kit's folder as an absolute path;
- `version`, from `./VERSION`;
- `name`;
- `title`, the theme's title or else the name;
- `theme`, the parsed `theme.toml`, when there is one;
- `modes`, as `{ base, media }`: the base mode's name, and each other mode's name by its media query.

Without a kit, `ctx` has none of these.

## A token

Each token in `tokens` holds:

- `path`, `segments` and `name` (the CSS variable name, without `--`);
- `type` and `value`, the CSS scalar;
- `raw`, the DTCG value, and `alias`;
- `description`, its `$description` if any;
- `derived`, `usage` and `review`, from its extensions;
- `typography`, for a typography token;
- `builtin`, when only a built-in layer sets it.

## Engine libraries

The built-in modules share these helpers in the engine's source:

- `src/color.mjs` holds the colour maths: `luminance`, `contrast`, `mix`, `bestOn`, `stateLayer`, `textSafe`, `hsl` and `rgb`.
- `src/motion.mjs` turns springs into CSS `linear()` easings.
- `src/type.mjs` holds the fifteen type styles.
