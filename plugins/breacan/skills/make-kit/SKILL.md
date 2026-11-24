---
name: make-kit
description: Make or change design tokens and a design kit with Breacán. Use when starting a kit from seed colours, a scheme or a brand, editing a kit's tokens, theme.toml or notes.md, choosing its outputs, or fixing a failed breacan build or check. Not for building UI on an existing kit (use use-kit) or visual craft (use impeccable).
---

# Make a kit

A kit is one look that Breacán builds into every platform's files. The engine's [README](https://github.com/kickinrad/breacan#readme) is the authority for every config option, module and check; read the section you need before configuring.

1. **Start.** With seed colours, run `breacan new --seed <hex> [--seed <hex>…] [<dir>]` (add `--engine material` for Material's tonal scheme). The base fills type, spacing, shape, motion and icons, so two seeds already build whole. An existing kit keeps its `breacan.config.mjs`.
2. **Change the look in one place.** Seeds live in the engine's options. Palette, roles and faces live in `<kit root>/theme.toml`. Anything else goes in `tokens/*.tokens.json`, DTCG 2025.10. Write only what differs from the base, with a comment wherever a value departs from Material saying why. Never edit a generated file.
3. **Choose outputs.** Start from `preset: "default"`; add modules by name (`plugin`, `rules`, `tailwind`, `react-native`, `template`) and drop one with `without`.
4. **Build and check.** Run `breacan build`, commit every output and `breacan.receipt.json`, then `breacan check`. CI runs `breacan check`.
5. **Hand the kit to apps** with the `plugin` output, so each app's agent gets the kit's skill, DESIGN.md and lint rules.

If check names a contrast pair, change the colour in the source, not the floor; an exception in `[contrast]` needs a `why`. If check says an output was edited by hand, move the edit into the source and rebuild.

Finish with `breacan check` passing and the playground looked at in both modes.
