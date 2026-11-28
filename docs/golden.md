<!--
SPDX-FileCopyrightText: 2026 William Tierney

SPDX-License-Identifier: Apache-2.0
-->

# The golden harness

`tests/kits.test.ts` builds three frozen kits, Tokyo Mono, Tokyo Material and Boombox, with the old CLI and the new core, and holds each addon's files to a golden. Each addon task proves itself against its own golden.

## Goldens

`tests/kits/golden/<addon>.json` maps kit → output path → sha256, as the old CLI builds them. The Tokyo goldens are frozen at d0d1c10. Boombox's moved once, when 09d8393 renamed the generated header from "kumiko" to "Breacán"; only that line of each file differs.

`tests/kits/golden/new/<addon>.json` holds a kit's files where the new core's bytes differ from the old golden, and the PR that adds one says why. A kit with no entry there must match the old golden byte for byte. That is how tokyo-mono's `ports/` files are held: the `template`, `obsidian` and `mealie` goldens have no new entry, so each must stay identical when the new core builds them.

An addon's name is the name of its output part. `tests/golden.ts` (`owner`) says which addon owns a path, and a path no addon owns fails the old CLI's build. The old modules `beer` and `playground` have goldens until task 19 deletes them, and the old `plugin` module is the addon `agent-plugin`.

## Running it

- `bun test tests/kits.test.ts` runs both CLIs. `GOLDEN_CLI=old` or `GOLDEN_CLI=new` runs one. `BREACAN_BIN=dist/breacan` points the old CLI at the compiled binary.
- The new core runs the addons it has an output part for and skips the rest, naming each: `the new core has no "dtcg" output yet`. A task that ports an output removes its skip by adding the part.
- `bun scripts/golden.mjs --cli old|new [kit...]` rewrites goldens and prints each digest that moved. `--cli new` writes only the kits whose bytes differ from the old golden.
- Boombox runs when `BOOMBOX_DESIGN` names a checkout of boombox-design's `pre-breacan` tag. Make one with `git archive pre-breacan | tar -x -C "$(mktemp -d)"`.

## Fixture inputs

Each Tokyo kit holds its old inputs (`breacan.config.mjs`, `design/`) beside the new project: `theme.toml` and, for Tokyo Material, `breacan.config.ts`. Each CLI gets a copy without the other's root files. Boombox's inputs stay private, so the harness migrates them each run: the tag's `kumiko.config.mjs` becomes the old config (`targets` renamed `modules`, `storybook` dropped), and `tests/migrate-theme.ts` makes its `theme.toml` from `design/theme.toml`.

## Limits

- The new-shape `theme.toml` holds the night palette and three of the four neutral roles. The new core has no modes, faces, tokens, derived roles or contrast settings, and `color.on-accent.default` comes from a derived Material role. Each task that adds a section extends `tests/migrate-theme.ts` and the Tokyo fixtures.
- The new core's `css` golden is the neutral stylesheet: every core role, with the kit's palette and three roles over it. Tokyo Material's and Boombox's differ from the old ones until the Material addon ports them.
- The new core builds `src/styles/tokens.css` for a kit whose config sets no css path, since `css` is a built-in. Tokyo Mono's is in `golden/new/css.json`, its only entry, because it has no old golden.
- A test per kit and CLI fails when a build writes a path no addon owns, or an addon with no golden for the kit. Each addon's test compares the whole built map, not only the golden's paths.
- The new core's `dtcg` output writes no mode file yet, so Tokyo Material's `golden/new/dtcg.json` lacks `tokyo-material.day.tokens.json`. Modes bring it back, and the new entry is then removed if the bytes match.
- A fixture's new-shape files are a copy: the new core's studio and addons read them, but nothing checks they stay equal to the old inputs.
