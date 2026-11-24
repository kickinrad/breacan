---
title: "Breacán: one look, every platform"
slug: breacan
type: plan
status: in-progress
priority: high
project: "[[Tokyo Mono]]"
run: here
appetite: project
assignee: claude
created: 2026-11-23
author: claude
tags: [breacan, kumiko, design-tokens, dtcg, tokyo, boombox]
---

# Breacán: one look, every platform

> [!abstract] TL;DR
> Kumiko becomes Breacán, a small fixed engine plus modules. It takes one look from any input, fills every role from a neutral base, and adapts it to each platform through a dial. It writes every output with its rules and checks.

## Outcome

Breacán (said BRAK-awn, Irish for tartan) replaces kumiko, the design-system plugin and the two Tokyo repos. A look goes in once, and each platform gets a kit as native as the kit asks. Even two seed colours give a complete kit: type, spacing, shape, motion, icons and component tokens come from the base.

Tokyo and Boombox run on it, every current consumer builds from it, and the repo is ready to go public. It happens now because kumiko has 15 outputs for 6 users and five names for one idea. It also has no clean way to add Apple, Fluent or a new client kit.

## Approach

**Flow.** Every build runs the same nine steps. This order follows how Fluent 2, Spectrum, Spotify Encore and Material layer their tokens:

1. **Input:** seeds, a website, a scheme or a brand guide, extracted into values.
2. **Primitives:** raw values with no meaning, such as tonal palettes, greys, font files and size steps.
3. **Roles:** the role contract, one shared list of named roles (`primary`, `on-surface`, `body-large`, `corner-medium`, `touch-min`, `motion-standard`, `icon-set`). It is the one stable API every output reads. It starts from Material's role names and adds what Apple and Fluent need.
4. **Base:** the Breacán-neutral base fills every role. Material's role model is the spine. Spacing, type and density scales follow Spectrum, motion and elevation tiers follow Fluent, and greys follow Radix.
5. **Theme:** the brand overrides roles.
6. **Platform:** each platform's native language overrides roles, keyed by platform as in Microsoft's token pipeline. Native follows the platform: iOS Apple, Android Material, Windows Fluent. A kit may pick another language.
7. **Resolve:** per kit and per platform, the dial picks theme or platform values for each foundation. Levels are Native, Tinted, Branded and Signature, with per-foundation overrides. System chrome stays native with a brand tint. The dial applies as a rule during resolution.
8. **Components:** component tokens, built only where a kit needs them. Component code comes from each stack's own library (Beer or shadcn on web, Expo libraries, Compose Material).
9. **Outputs and checks:** files per stack, then the receipt, contrast, lint and rules checks.

The playground shows four columns, Base, Theme, Platform and Kit, with the same specimen screen in each.

**Walkthroughs.** Four inputs become fixture kits and acceptance tests:

- **A. Two seed colours:** palettes come from the seeds and greys from the base. Type, space, shape, motion and icons come from the base. iOS at Tinted keeps the colour and takes SF Pro with Dynamic Type, 44 pt targets, SF Symbols and native components.
- **B. A website:** extracted colours, fonts, radii and spacing become primitives flagged `needs-review`. Confident matches fill roles, and the base fills the gaps.
- **C. A Base16 scheme:** base00 to base07 become the neutral ramp, accents fill roles, and ANSI roles map directly. The rest comes from the base.
- **D. A full brand guide:** the theme sets colour, type and icons. iOS at Branded keeps colour, type and shape and takes native motion and components. Web at Signature keeps everything.

**Engine and modules.** The engine stays small and fixed: load, stack layers, resolve, run modules, write files and the receipt.

Everything else is a module with one shape: `{ slot, name, reads, writes, run }`. The slots are source, foundation, language, output, check and preview. Each slot has at least two real modules in this Plan.

A preset is a named list of modules. The default preset holds DTCG with the resolver, theme.toml, the Leonardo colour engine, CSS, TS and DESIGN.md with rules. It also holds Claude Design, every check and the playground.

**Standard in, standard out.** Breacán reads and writes DTCG 2025.10 with the Resolver module. Each kit compiles to a resolver document, so Terrazzo, Swatchbook and Style Dictionary can read it. theme.toml stays as a shorthand that compiles to standard files.

**Reuse.**

- kumiko's build, theme, derived-colour, contrast, header, lint, react-native and playground code, refactored into the engine and modules.
- `@terrazzo/parser` (MIT) to load DTCG and resolver files.
- Colour engines: `@adobe/leonardo-contrast-colors` (default) and `@material/material-color-utilities`, with culori for colour maths.
- The vendored androidx Material tokens and the `material-reference` skill, which become the Material language plugin.
- Dembrandt for websites, Terrazzo's `tz import` for Figma, and tinted-theming schemes and templates for Base16/24, rendered with Mustache.
- Google's `design.md` CLI to lint DESIGN.md, and Swatchbook for Storybook.
- Ideas, each after a licence check: blazon's usage rules on tokens and `needs-review` flags, and dyelot's hashed receipt. The ux-ui-agent-skills gate list seeds the rules lint.

**Seam.** The highest test seam is the `breacan` binary run in a real kit directory: `breacan build`, `breacan check`, `breacan lint`. Kumiko's tests already use it.

**Homes.**

- `kickinrad/breacan`: the renamed kumiko repo, private. It holds the engine, its modules, and a market with the `breacan` plugin and the language plugins.
- `kickinrad/tokyo`: the merged theme repo. It holds the palette, the app themes, the Material kit and a market of kit plugins.
- `boombox-design`: the private Boombox theme repo, with web, iOS and Android kits and its own market.

**Versions.** The engine releases a binary, so it versions at 0.x through release-please. A kit versions only when apps download its release assets, which Tokyo's apps do. Plugins and markets carry no version. Consumers install the latest engine through mise, with no pins.

**Safe migration.** Expand, migrate, contract:

- The `breacan` binary also answers to `kumiko`, reads `kumiko.config.mjs`, and keeps `--check`.
- Every repo gets a `pre-breacan` tag before it moves.
- A consumer moves only when its own CI is green on Breacán.
- An old repo is archived only after its last consumer has moved.
- The aliases go in the final contract step.

**Licence.** Apache-2.0 core with a CLA. Paid add-ons later live in a separate private repo.

**Decisions taken here.**

- The Leonardo colour engine stays the default inside the neutral base; Material's engine is the second option. Role names come from Material either way.
- v1 ships an Apple language plugin with foundations only: type, sizing, icons and a few rules linking Apple's HIG markdown.
- Figma import is proven on a free-plan styles file. Variables need a Figma Enterprise plan.
- Penpot runs on its free cloud tier.
- Each phase ships as its own reviewed pull request before the next phase starts.

## Out of scope

These become Issues in `kickinrad/breacan` in task 1:

- A Compose TV output for Skylight; Skylight keeps its vendored theme and moves only its lint.
- The Fluent language plugin, and Apple's components and full rules.
- SwiftUI and WinUI outputs.
- cttc-foundation, which runs the old `tokens` CLI under a client contract.

New themes and kits beyond moving Tokyo and Boombox, paid modules and any hosted service are out of scope. Moods are dropped.

## Acceptance

Each check is red at kumiko d0d1c10 and is proved from outside the engine. Task 1 records that red baseline.

1. **Install.** `mise use github:kickinrad/breacan` installs the binary, and `breacan --version` prints 0.x.
2. **Modules.**
   - An output module written in a scratch folder outside the repo builds when listed in a kit's config.
   - Removing the CSS module from a preset still builds every other output.
3. **Standard in and out.**
   - A plain DTCG and resolver folder with no theme.toml builds.
   - Every kit's resolver output loads in `@terrazzo/parser` with no errors, and in Swatchbook's loader with its axes found.
4. **Complete from colours.** Walkthrough A builds from two seeds alone. The base check confirms every contract role has a value in every mode and platform.
5. **Dial.** On fixture kit D:
   - Each level gives the resolved values listed in its golden file.
   - One per-foundation override changes only that foundation's tokens.
6. **Checks fail correctly.**
   - A planted day-mode contrast failure fails `breacan check`, naming the pair, ratio and mode.
   - A hand-edited output fails against the receipt.
   - A hard-coded hex in consumer code fails `breacan lint`.
   - A token used against its usage rule fails the rules check.
7. **Native output compiles.** The Boombox Expo app typechecks against the generated theme.
8. **Colour engines.** For a fixed seed, the Material engine's roles equal `material-color-utilities`' own scheme for that seed. Leonardo's roles meet every contrast target.
9. **App hubs.**
   - The Base24 output renders through tinted-theming's builder with one of its templates.
   - The Windows Terminal and Ghostty schemes validate against their schemas.
   - Every visible change to a Tokyo port has the owner's sign-off.
10. **Agent rules.**
    - Every DESIGN.md passes `design.md lint`.
    - Installing a kit plugin in a consumer repo gives the agent its skill, rules and lint config.
    - The rules lint flags a planted breach.
11. **Imports.** Walkthroughs B and C build from a real website and a tinted-theming scheme. An image gives a palette, and a Figma styles file imports.
12. **Editor.** A colour changed in the local editor appears in the token file and in the playground.
13. **Penpot.** The Breacán Penpot plugin pushes Tokyo's tokens into a Penpot file. It pulls one edited colour back, and `git diff` shows only that token changed.
14. **One home per thing.**
    - tokyo-mono and tokyo-material are archived, with tags intact.
    - tokyo-mono-site, the dotfiles, Porchlight, Skylight and the stacks Astro template run Breacán in CI and pass.
    - `rg -i 'kumiko|tokens\.config|tokens (--check|lint)'` across those repos, tokyo, boombox-design and breacan finds only changelogs and Plans.
15. **Market and routing.** The Breacán market installs in Claude Code and Codex, the design-system plugin is gone from domains, and `dispatch list design tokens` names Breacán.
16. **Vault.** A Breacán ADR supersedes ADR-019 to ADR-021 and ADR-023 where they conflict. The Breacán hub replaces the Kumiko hub, and `systems.toml` points at the new source.
17. **Public-ready.** LICENSE, NOTICE and the CLA are present, `reuse lint` passes, CI's licence audit shows no copyleft, and the trademark search is on record.

**What else shows it right:** Terrazzo's parser, `design.md lint`, tinted-theming's builder, JSON schemas, and `tsc` in the real Expo app. Also the owner's look at the playground columns, and the `reviewer` agent on each phase's pull request.

## Tasks

### Phase 1: core, Tokyo and agent rules

1. [x] **Baseline and Issues** (prefactor). Record every kit's outputs and every consumer's CI result at d0d1c10 as golden files and red evidence. File the out-of-scope Issues. Route: implementation-light. Demo: goldens committed; Issues listed. Blocked by: none.
2. [x] **Rename, expand** (prefactor). Rename the repo and binary, with the `kumiko` alias, the old config name and `--check` kept. Add AGENTS.md. Route: implementation. Demo: every consumer's CI green unchanged; acceptance 1. Blocked by: 1.
3. [x] **Output contract** (prefactor). Put the targets behind the module shape and presets. Delete material-you, compose-tv and `builtin:material-tv`, which no consumer builds. Keep storybook, dev and audit until their replacements land. Route: implementation-hard. Demo: tokyo outputs byte-identical to the goldens; acceptance 2. Blocked by: 2.
4. [x] **Standard load, one kit first.** Load tokyo-material's tokens through `@terrazzo/parser` and write its resolver. Then compile theme.toml to DTCG and a resolver, then replace `--check` with the receipt, keeping the header rule. Route: implementation-hard. Demo: acceptance 3. Blocked by: 3.
5. [x] **Role contract and neutral base.** Write the contract and the base that fills it, with the base check. Route: implementation-hard. Demo: acceptance 4 on a web-only kit. Blocked by: 4.
6. [x] **Seed starter.** Leonardo and Material colour modules and `breacan new --seed`. Route: implementation. Demo: walkthrough A on web; acceptance 8. Blocked by: 5.
7. [x] **Checks.** Usage rules on tokens with `needs-review`, and the rules lint seeded from the gate list, beside the existing contrast and consumer lint. Route: implementation. Demo: acceptance 6. Blocked by: 4.
8. [x] **Agent outputs.** DESIGN.md, the kit plugin output (skill index, rules, lint config) and Claude Design on the module shape. Route: implementation. Demo: acceptance 10. Blocked by: 5, 7.
9. [x] **Breacán plugin and market.** Skills to make kits and build with them, the breacan-material language plugin from `material-reference`, the design-system plugin removed from domains, and dispatch routing. Route: implementation. Demo: acceptance 15. Blocked by: 8.
10. [ ] **Tokyo merge.** Build `kickinrad/tokyo` with the palette, the Material kit and its kit-plugin market. Ports come from Base24, the terminal set and templates (Obsidian, Mealie, Home Assistant included). Fix the swapped day contrast notes (secondary 4.41, tertiary 4.31) and replace `audit` with the checks in CI. Route: implementation. Demo: acceptance 9; walkthrough C from the Tokyo scheme. Blocked by: 9.
11. [ ] **Consumers migrate.** Move tokyo-mono-site, the dotfiles through chezmoi, Porchlight (lint and Home Assistant template), Skylight (lint only) and the stacks Astro template. Each moves alone, on green CI. Route: implementation. Demo: each consumer's CI green on Breacán. Blocked by: 10.
12. [ ] **Vault, phase 1.** Curator writes the Breacán ADR and hub and updates `systems.toml`; forge's `references/system.md` example moves to the new name. Route: here. Demo: acceptance 16. Blocked by: 11.

### Phase 2: dial, Apple and Boombox

13. [ ] **Dial on one foundation.** The platform layer and resolve rule for type only, end to end, with a fixture Apple stub. Route: implementation-hard. Demo: type differs by level on fixture kit D. Blocked by: 12.
14. [ ] **Dial for every foundation.** Levels, per-foundation overrides and the chrome rule across all foundations and component tokens. Route: implementation-hard. Demo: acceptance 5. Blocked by: 13.
15. [ ] **breacan-apple.** Foundations-only Apple language plugin with HIG links. Route: implementation. Demo: walkthrough A on iOS. Blocked by: 14.
16. [ ] **Expo output.** The typed Expo theme from the react-native code, per platform. Route: implementation. Demo: a fixture Expo project typechecks. Blocked by: 14.
17. [ ] **Boombox moves.** boombox-design becomes the Boombox theme repo with web, iOS and Android kits at their levels. The Swatchbook Storybook config replaces the storybook output, which is then deleted. Route: implementation. Demo: acceptance 7; walkthrough D. Blocked by: 15, 16.
18. [ ] **Playground columns.** Base, Theme, Platform and Kit side by side. Route: implementation. Demo: the owner reviews Tokyo and Boombox in the playground. Blocked by: 17.

### Phase 3: inputs, editing and public-ready

19. [ ] **Scheme imports.** Base16/24 and iTerm2 sources. Route: implementation. Demo: walkthrough C from a tinted-theming scheme. Blocked by: 18.
20. [ ] **Website, image and Figma imports.** Dembrandt with `needs-review`, an image palette, and `tz import` for Figma. Route: implementation. Demo: acceptance 11. Blocked by: 19.
21. [ ] **Local editor.** Live swatches and contrast that save back to token files; the dev server is then deleted. Route: implementation. Demo: acceptance 12. Blocked by: 18.
22. [ ] **Penpot plugin.** Push and pull a kit's tokens through Penpot's plugin API, mapping Penpot themes to resolver sets. Route: implementation-hard. Demo: acceptance 13. Blocked by: 21.
23. [ ] **Contract.** Remove the `kumiko` alias, the old config name and `--check`; archive tokyo-mono and tokyo-material. Route: implementation-light. Demo: acceptance 14. Blocked by: 11, 17.
24. [ ] **Public-ready.** LICENSE, NOTICE, CLA, SPDX headers, the licence audit in CI and the trademark search; Curator updates the hub. Route: here. Demo: acceptance 17. Blocked by: 22, 23.

## Run

Lane: here, with the owner watching design calls. Branch `kata/breacan` in the kumiko checkout's `.worktrees/breacan`.

Assumption: the repo stays public through the rename, as kumiko is today. ADR-016 needs client CI to install it without credentials; the plan's "private" would break cttc-foundation and boombox-design.

- Task 1, baseline (implementation-light, Demo passed first try).
  - Goldens: `tests/kits/<kit>.golden.json` holds path → sha256 for every output of tokyo-mono (24), tokyo-material (83) and boombox-design (15), built from each repo's `origin/main` at kumiko d0d1c10. Each repo's committed outputs passed `--check` there. `tests/kits.test.ts` rebuilds them; Boombox runs only with `BOOMBOX_DESIGN` set, since its inputs stay private.
  - Consumer CI at the baseline, last main run: kumiko ci success (d0d1c10), tokyo-mono CI success (1dfc96d), tokyo-material CI success (e800d49), porchlight check success (41979f8), skylight check success (083ce48), stacks ci success (85f69a1), boombox-design CI success (b42f3bb). tokyo-mono-site has no CI. The dotfiles install `github:kickinrad/kumiko` in `dot_config/mise/config.toml` (chezmoi e967505).
  - Red evidence: `kickinrad/breacan` does not resolve; `kumiko --version` exits 1 as unknown; no source reads a resolver, Terrazzo or Leonardo; `design-system` is still in domains. Every other acceptance check names a feature that does not exist yet.
  - Issues: [#95](https://github.com/kickinrad/kumiko/issues/95) Compose TV, [#96](https://github.com/kickinrad/kumiko/issues/96) Fluent and Apple, [#97](https://github.com/kickinrad/kumiko/issues/97) SwiftUI and WinUI, [#98](https://github.com/kickinrad/kumiko/issues/98) cttc-foundation.
- Task 2, rename and expand (implementation, Demo passed second try: one audit test still named the old verb).
  - The binary is `breacan` with verbs `build`, `check`, `lint`, `audit`, `dev` and `--version`. No verb, `--check` and `kumiko.config.mjs` still work. The release asset is `breacan-linux-x64.tar.gz` holding the binary as `breacan` and `kumiko`; mise puts both on the PATH (proved with mise's http backend on a local tarball).
  - Generated headers keep "Generated by kumiko", so no consumer goes stale on the new release.
  - Evidence: 258 tests pass from source and against `dist/breacan`. `dist/kumiko --check` and `dist/breacan check` pass in tokyo-mono, tokyo-material and boombox-design; `kumiko lint` passes in clean Skylight and Porchlight exports.
  - Waiting for the owner: the GitHub rename of `kickinrad/kumiko` to `kickinrad/breacan`, done at the phase 1 ship.
- Task 3, output contract (implementation-hard, Demo passed after three fixes).
  - Every output is a module `{ slot, name, reads, writes, run }` in `src/outputs/`; `src/modules.mjs` resolves `preset`, `without` and `modules` (or `targets`). Only the `output` slot runs; each other slot joins when its first two modules land.
  - `writes` maps each location option to its default; the engine fills defaults, checks required ones and the kit, and hands modules sibling options already filled.
  - The playground and Claude Design make a missing css or beer sibling in memory, so the default preset less css still builds. DESIGN.md is a `shared` output with no do-not-edit header, since its body is hand-written; before this, a kit could not build it at all.
  - Deleted: `compose-tv`, `material-you` and `builtin:material-tv`. The vendored tv-card defaults stay in `material/` for #95.
  - Evidence: 257 tests pass; the three kits build byte-identical to their goldens; `tests/modules.test.ts` proves acceptance 2.
- Task 4, standard load (implementation-hard, Demo passed second try: a variable name clashed).
  - The `dtcg` output also writes `<name>.resolver.json`: one `base` set and a `mode` modifier whose `$extensions["com.kickinrad.breacan"].media` maps each context to its query. tokyo-material's golden gains that one file; the rest is unchanged.
  - A resolver in `tokens/` governs the folder, read through `@terrazzo/parser` (`src/resolver.mjs`). theme.toml compiles to DTCG and a resolver through the `dtcg` output.
  - `breacan check` holds the tree to `breacan.receipt.json` (inputs and outputs by sha256, header rule kept) instead of rebuilding to compare, so a newer engine never fails a consumer's check. With no receipt it falls back to the old compare.
  - Evidence: 267 tests pass from source and on the compiled binary. `tests/standard.test.ts` loads tokyo-material's resolver in Terrazzo's parser (two permutations) and Swatchbook's loader (axis `mode`: night, day), and builds a plain resolver folder with no theme.toml (acceptance 3). `tests/receipt.test.ts` covers acceptance 6's hand-edit case.
- Task 5, role contract and neutral base (implementation-hard, Demo passed first try).
  - `src/contract.mjs` lists the roles: Material's md.sys colour, type (15 roles by 5 properties), corner, motion, elevation and state roles, read from the vendored tokens, plus `breacan.sys` spacing, `touch-min`, `icon-set` and `density`.
  - `include: ["builtin:base"]` (`src/base.mjs`) fills them all over Material: Radix gray, blue, slate, violet and red (step 11 accents, step 4 containers), Spectrum type and spacing, Fluent 2 durations, easings and shadow tiers, a system font stack, 48px touch target.
  - Design calls for the owner: blue as the base accent, bold headings, 48px touch target, Material's corners kept.
  - Evidence: a web kit with nothing but the base builds light with dark under its query, every colour role present, each on-role at 4.5:1 or more on its role in both modes (`tests/base.test.ts`, acceptance 4 on web).
- Task 6, seed starter (implementation, Demo passed first try).
  - The `foundation` slot opens with two colour engines: `leonardo` (default; accents at 5.5:1 light and 7:1 dark against the base surface, containers at 1.25 and 1.35, container text at 10 and 11) and `material` (tonal spot from the first seed; later seeds replace secondary and tertiary palettes).
  - `breacan new --seed <hex>… [--engine material] [<dir>]` writes a starter config and VERSION on the default preset.
  - Shortcut: Leonardo 1.1 warns about its own internal `colorspace` argument; `src/foundations/leonardo.mjs` hides that one message while it runs.
  - Evidence: `tests/seed.test.ts` builds walkthrough A on web from two seeds (every default output, every colour role, check passes), proves Leonardo meets its targets, and proves the Material engine equals `SchemeTonalSpot` for #6750a4 role by role in both schemes (acceptance 8).
- Task 7, checks (implementation, Demo passed after re-planting the contrast failure on a pair the check covers).
  - Usage rules: the contract gives Material's on-colours their backgrounds and `outline-variant` its border-only use; a token adds its own in `$extensions["com.kickinrad.breacan"].usage`. A token marked `needs-review` is named by each build and listed in the rules.
  - The `rules` output writes `breacan.rules.json`; `breacan lint` reads it and adds `theme ref`, `usage` and `icon` (emoji) findings, from the static gates of plugin87/ux-ui-agent-skills (MIT, checked).
  - Contrast failures now name the mode (`the day mode (prefers-color-scheme: light)`).
  - Evidence: `tests/checks.test.ts` proves all four parts of acceptance 6 from outside the engine.
- Task 8, agent outputs (implementation, Demo passed after two base fixes that design.md lint found).
  - `design-md` on the contract writes the roles, type, corners, spacing and a component per on-colour pair, plus a body of usage rules when the file has none; off the contract it is unchanged (the 2.1.0 golden holds).
  - `plugin` adds `references/index.md`, `DESIGN.md` (on the contract) and `breacan.rules.json`, starts a SKILL.md when the kit has none, and no longer needs notes.md or theme.toml. tokyo-material's golden gains index.md and breacan.rules.json.
  - Base fixes from the lint: quieter text (`on-surface-variant`) and quieter fixed text now move toward step 12 until they hold 4.5:1 on every surface or fixed fill.
  - `scripts/golden.mjs` refreshes a golden from a kit folder.
  - Evidence: `tests/agent.test.ts`: both engines' DESIGN.md and the plugin copy pass `design.md lint` with no errors or warnings, the plugin copied into a consumer carries its skill, rules and lint config, its rules flag a planted breach, and `claude plugin validate` passes (acceptance 10).
- Task 9, Breacán plugin and market (implementation; in progress, waiting on merge and promotion).
  - The repo holds the Breacán market (`.claude-plugin/` and `.agents/plugins/` marketplaces) with `breacan` (skills `make-kit` and `use-kit`) and `breacan-material` (`material-reference`, now pointing at this repo's `material/`).
  - domains branch `feat/breacan` (8328495) deletes design-system, including its unread impeccable `context/` (no `IMPECCABLE_CONTEXT_DIR` is set anywhere), and makes WordPress depend on `breacan@breacan`. workflows branch `feat/breacan` (014a17b) points the stack skill at Breacán.
  - Evidence: `claude plugin validate` passes the market and both plugins; `market-closure.py` passes over every market with the three branches in place; domains' own check passes. Runtime parity fails before and after on existing drift, none of it Breacán's.
  - Review (`reviewer`, FAIL, 2 Must): a new include-glob match escaped the receipt, and a receipt with no outputs checked nothing. Both fixed with tests: every input the build finds is a candidate, the receipt's shape is validated, and its outputs must equal the build's.
  - Review round 2 (FAIL, 1 Must, 2 Should): a receipt holding `null` fell back to the old compare; a theme `extends` outside the kit folder and helpers the config imports escaped the receipt. All three fixed with tests.
  - Review round 3 (FAIL, 1 Must): the config-import scan broke directory imports and missed extensionless ones. It now uses Bun's own import scanner and resolver, with a test for both and for a commented-out import.
  - Review round 4 (FAIL, 2 Must): that scanner read JSON and typed TypeScript as plain JavaScript and failed the build. It now picks the language by extension, treats data files as plain inputs, and names an import it cannot resolve; tests cover JSON and typed TypeScript.
  - Shipped: PR #99 merged and released as 0.21.0; 0.21.1 (#101) fixed a kit with no receipt failing its check on the files Breacán adds, which broke tokyo-material's CI on 0.21.0. Review went four FAIL rounds, all on the receipt's config-import tracking; the owner chose to merge after round 4's fix.
  - Acceptance 1: `mise use github:kickinrad/breacan` installs 0.21.0 and `breacan --version` prints it; `github:kickinrad/kumiko` still installs and runs as `kumiko`. tokyo-mono and tokyo-material CI pass on 0.21.1.
  - Market installed in Claude Code and Codex (`claude plugin install`, `codex plugin add`; chezmoi d5a0e9e holds it). domains #33 and workflows #153 merged; design-system uninstalled from both runtimes. The make-kit and plugin descriptions now say "design tokens", so `dispatch list design tokens` finds Breacán. `~/projects/markets/breacan` links to this checkout, so dispatch ranks it with the other markets: `make-kit` is first.
- Task 10, Tokyo merge (implementation; in progress, waiting on the owner's look).
  - The owner kept the name: kickinrad/tokyo-mono takes Tokyo Material into `material/` with its history ([PR #124](https://github.com/kickinrad/tokyo-mono/pull/124)), extending the root palette directly. Both repos are tagged `pre-breacan`. One market lists both plugins; CI checks both kits and releases the kit as `material-v<VERSION>`.
  - New ports: Base24 schemes and a Ghostty theme with the Windows Terminal colours. `scripts/check-ports.sh` validates Windows Terminal against Microsoft's schema and renders tinted-terminal's templates from the Base24 schemes (acceptance 9, first two parts); Ghostty's own validation runs where Ghostty is installed, and its CI install route waits on the owner.
  - The swapped Day contrast notes are fixed (secondary 4.41, tertiary 4.31). Every existing port and kit output is byte-identical.
  - Walkthrough C: the `scheme` source (this repo, `src/sources/scheme.mjs`) builds a whole kit from Tokyo's Base24 schemes (`tests/scheme.test.ts`).

## Related

- [[Work Model]]: nouns, homes, and status.
- [[Orchestration]]: the loop and lanes.
- Superseded shape: `tokyo-mono/plans/kumiko_plan.md`; `markets/workflows/plans/systems_plan.md`.
