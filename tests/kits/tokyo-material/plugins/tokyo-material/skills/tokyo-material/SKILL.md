---
name: tokyo-material
description: "Build UI on Tokyo Material, Wils's default kit: Material 3 on its own theme. Use when building or changing any UI, even a quick one-file page, unless the user or the project selects another kit; when adding the kit to an app or moving an app to a new kit release; or for the kit's colours, tokens, type or shapes."
---

# Tokyo Material

Wils's default UI kit: every Material 3 component on the Tokyo Mono palette, with a few named exceptions. On the web
each component is Beer CSS's markup.

When the user or the project selects another kit or design system (in its agent instructions, its dependencies or its
own tokens), use that one and stop here. One UI, one kit.

## Adopt

An app takes the kit from its newest release, and keeps the files it downloads or builds in its own repo. Every kit
file is generated: its first line names the kit version, and it stays exactly as released.

- **Plain web:** link Beer, then the kit's two stylesheets:

  ```html
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;500;700&display=swap">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cascadia+Code:wght@400;500;700&display=swap">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block">
  <style>@import url("https://cdn.jsdelivr.net/npm/beercss/dist/cdn/beer.min.css") layer(beer);</style>
  <link rel="stylesheet" href="tokyo-material.css">
  <link rel="stylesheet" href="tokyo-material-beer.css">
  <script type="module" src="https://cdn.jsdelivr.net/npm/beercss/dist/cdn/beer.min.js"></script>
  ```

  Put the two files beside the page with `gh release download -R kickinrad/tokyo-material -p '*.css'`; in the kit's
  own checkout they sit at `docs/playground/`. Each colour follows the system's mode, and `data-theme="light"` or
  `"dark"` on any element pins one; a Baseline 2024 browser reads it. A quick or one-file page loads the kit the same
  way: "in a hurry", "inline styles" and "no dependencies" all still mean these links and Beer's markup. When the page
  cannot load the two files, say so and ask.
- **Everything else**, web on another stack (Tailwind, a component library) or any other platform: the app builds its
  own files with `kumiko`. Download the kit's token files with `-p '*.tokens.json'`, list `tokyo-material.tokens.json`
  after `builtin:material` in `include`, put `tokyo-material.day.tokens.json` under `media` for
  `(prefers-color-scheme: light)`, and list the targets the stack needs (`css`, `tailwind` and the rest; kumiko's
  README names them). The app commits its outputs and runs `kumiko --check` in CI.

## Build

1. **Read the kit.** [notes.md](references/notes.md) is its character and rules: every screen follows them and adds
   none of its own. [theme.toml](references/theme.toml) is its choices; a token at a Material path is an exception,
   and its `why` says why. Every other value is Material 3's. In the kit's own checkout, read `design/` instead.
2. **Pick each control from [components.md](references/components.md)** before writing code, and read the Material 3
   guidance and the Beer markup of any you have not used. Use the component's own markup, behaviour and states, and
   add only the theme. When none fits, tell the user what is missing.
3. **Write token names.** Every colour, size, shape, type and motion value is a token name: `md.*` for Material 3,
   `tokyo-material.*` for the kit's own. In CSS a name is its path with dashes: `md.sys.color.primary` is
   `var(--md-sys-color-primary)`. Inline styles only lay out the page, and they use token names too. The modes are
   `night` and `day`; a value that differs by mode keeps one name.
4. **Name your choices:** say which component each part uses and its source, in the answer or the change description.

Done when every part of the UI is a component from components.md, named with its source, and every value is a token
name.

## Tweak

A value only one app needs stays in that app, in an **override** the app owns: a stylesheet loaded after the kit's,
or, with kumiko, the app's own token file listed after the kit's in `include`. Each override names what it changes and
why. The kit's files stay as released, so an update never wipes a tweak.

When the kit itself is wrong for every app (a contrast failure, a missing component, a broken state), draft an Issue
for `kickinrad/tokyo-material` with the case and show it to the user to file. Until a release fixes it, cover it with
an override that names the Issue.

## Update

1. **Find the gap.** The first line of the app's kit files names its version; `gh release list -R
   kickinrad/tokyo-material` names the newest.
2. **Read the release notes** for every release in between. At 0.x a minor release can break things.
3. **Take the new release** the way the app adopted it: download the stylesheets again, or download the token files
   again and run `kumiko`.
4. **Recheck:** run the app's own checks and look at its screens in both modes. Delete each override the kit now
   covers, and each one whose Issue a release has fixed.

An app stays on an older release only for a breakage it has seen and named, and moves up when the kit fixes it.

Done when the app's kit files name the newest release, its checks pass, and every override left still earns its place.

## References

- [Material 3](https://m3.material.io/): [components](https://m3.material.io/components),
  [styles](https://m3.material.io/styles) and [foundations](https://m3.material.io/foundations).
- [Beer CSS](https://github.com/beercss/beercss/tree/main/docs): the markup of each web component.
- [kumiko](https://github.com/kickinrad/kumiko#readme): the build tool, its config and its targets.
- [Claude Design System](https://claude.ai/artifact/DhVvb2ANewmkqi6Kpp5E9c): the kit for Claude Design.
- The playground, `docs/playground/index.html` in the kit's checkout: every component live in both modes. Open it
  from disk.
