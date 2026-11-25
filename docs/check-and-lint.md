# Check, audit and lint

Three verbs keep a kit and the apps on it honest. `breacan check` holds a kit's files to its last build. `breacan audit` checks the playground in a real browser. `breacan lint` catches app code that hand-types what the kit already defines.

## The receipt

Each `breacan build` writes `breacan.receipt.json`. It holds the sha256 of every input the build read and of every file it wrote. The code is `src/receipt.mjs`.

The inputs are:

- the config and `VERSION`;
- every file in the kit's folder, and any theme it extends;
- every file in `tokens/`;
- include files, and every file a module reads, such as a `site` snapshot.

The receipt stores each entry as `{ path, sha256 }` in a list. A path-to-digest map would look like a key and its value to secret scanners such as gitleaks, and block every consumer's commit.

## breacan check

`breacan check` holds the working tree to the receipt. It fails on:

- an input changed since the build, naming it;
- an output edited by hand, naming it;
- a set of outputs that differs from the receipt's;
- a generated file without its header ([Outputs](outputs.md#the-generated-header));
- a contrast pair under its floor ([theme.toml](theme-toml.md#contrast-floors)).

It does not compare bytes with a fresh build. A newer engine that writes the same files differently never fails a check, and the next build takes its bytes.

A project with no receipt yet, last built by kumiko, is checked against a fresh build instead. A file this engine writes that is not on disk is named as new, and the next build adds it.

Run `breacan check` in the kit's CI.

## Review flags

An import marks each token it is unsure of with `"needs-review": true` in `$extensions["com.kickinrad.breacan"]`. The `site` source marks everything it reads. Each build names the flagged tokens, and the `rules` output lists them.

## breacan audit

`breacan audit` opens the generated playground in headless Chrome and checks what a person would see.

```sh
breacan audit [<dir>]
```

It opens `index.html` from disk, from the config's `playground` path by default. It renders at 1280 and 412 px, under a reset like the one a host page that embeds it would add. It walks every destination and item in every mode.

It fails on each of these, one line each with the size, mode, place and finding:

- text under Material's contrast (4.5:1, or 3:1 for large text and icons) against the colour actually behind it;
- text in a face that is not one of the kit's type or mono faces, or a face that did not load;
- overlapping parts inside one control;
- sideways scroll;
- a heading larger than one a level above it;
- running text wider than about 75 characters, or a lone reading pane much wider than its text;
- a page error;
- a failed request. An app's example entry or another kit that is not there is optional.

Run it in a kit's CI after `breacan check`. It needs Chrome: `$CHROME`, `google-chrome` or `chromium` on the `PATH`, or Playwright's download. GitHub's Ubuntu runners have Chrome. Breacán's own tests run it on a sample kit, `tests/render.theme.toml`.

## breacan lint

`breacan lint` fails when an app's source hand-types a value the theme defines instead of reading the theme's variable. It also fails on markup built on Beer with classes and controls Beer does not have.

```sh
breacan lint [--rules <file>] <path> [<path>…]
```

A path is a file or a folder. Folders are walked, skipping `node_modules`, `.git` and other dot-folders. It scans `.css`, `.scss`, `.yaml`, `.yml`, `.py`, `.js`, `.mjs`, `.ts`, `.jinja`, `.html`, `.kt` and `.kts` files, and ignores the rest.

| Rule | Finding |
| --- | --- |
| colour | A 3, 4, 6 or 8-digit hex such as `#fff` or `#rrggbbaa`, but not a `repo#123` reference. `rgb(`, `rgba(`, `hsl(` or `hsla(` followed by a digit. Kotlin `Color(0x…)`. |
| motion | A literal duration such as `120ms` or `6s` in a CSS `transition` or `animation`. Any `cubic-bezier(`. Compose `tween(` with a number as its first argument. |
| type size | CSS `font-size:` in px. A Kotlin `.sp` literal. |
| radius | CSS `border-radius:` with a non-zero px. Compose `RoundedCornerShape(` with a `.dp` literal. |
| spacing | A px value in a CSS `margin`, `padding` or `gap` declaration, `margin-top` and `row-gap` included. A `.dp` literal in Compose `padding(` or `spacedBy(`. |
| z-index | A CSS `z-index:` number. A Compose `.zIndex(` number. |
| component | In an `.html` or `.jinja` file that loads Beer (it names `beercss` or `beer.css`): a class that neither Beer nor the `beer` output defines. A `role` of `button`, `checkbox`, `switch`, `slider`, `tab`, `radio` or `menuitem`, which is a hand-made control where Beer has one. A templated class list is skipped. |

Zero values pass. Two things skip a check:

- a file with the generated header;
- a line with `lint: own <why>` and a non-empty reason, for an app's own named local value.

Each finding is one line, `path:line: rule: matched text`, and the run exits 1:

```text
cards/control.yaml:68: motion: 120ms
```

A clean run prints nothing and exits 0. A missing path fails and names it.

### The kit's rules

With a kit's rules file, lint checks more. It reads `--rules <file>`, or else `breacan.rules.json` in the working directory, which the `rules` output writes.

- **theme ref:** a `var(--…)` in the kit's namespace that the kit lacks.
- **usage:** a token used against its usage rule. That is a text colour on a background its rule does not allow, or a token on a property its rule does not allow.
- **icon:** an emoji standing in for an icon in markup.

The contract gives Material's on-colours their backgrounds, and limits `outline-variant` to borders. A token adds or changes its own rule in `$extensions["com.kickinrad.breacan"].usage`, as `{ "on": [paths], "properties": ["border*", …] }`.

These checks follow the static gates of [ux-ui-agent-skills](https://github.com/plugin87/ux-ui-agent-skills) (MIT).

## Limits

- The receipt does not hold files the config itself imports. When a kit splits its config into helper files, hold those too.
