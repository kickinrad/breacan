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
2. [ ] **Rename, expand** (prefactor). Rename the repo and binary, with the `kumiko` alias, the old config name and `--check` kept. Add AGENTS.md. Route: implementation. Demo: every consumer's CI green unchanged; acceptance 1. Blocked by: 1.
3. [ ] **Output contract** (prefactor). Put the targets behind the module shape and presets. Delete material-you, compose-tv and `builtin:material-tv`, which no consumer builds. Keep storybook, dev and audit until their replacements land. Route: implementation-hard. Demo: tokyo outputs byte-identical to the goldens; acceptance 2. Blocked by: 2.
4. [ ] **Standard load, one kit first.** Load tokyo-material's tokens through `@terrazzo/parser` and write its resolver. Then compile theme.toml to DTCG and a resolver, then replace `--check` with the receipt, keeping the header rule. Route: implementation-hard. Demo: acceptance 3. Blocked by: 3.
5. [ ] **Role contract and neutral base.** Write the contract and the base that fills it, with the base check. Route: implementation-hard. Demo: acceptance 4 on a web-only kit. Blocked by: 4.
6. [ ] **Seed starter.** Leonardo and Material colour modules and `breacan new --seed`. Route: implementation. Demo: walkthrough A on web; acceptance 8. Blocked by: 5.
7. [ ] **Checks.** Usage rules on tokens with `needs-review`, and the rules lint seeded from the gate list, beside the existing contrast and consumer lint. Route: implementation. Demo: acceptance 6. Blocked by: 4.
8. [ ] **Agent outputs.** DESIGN.md, the kit plugin output (skill index, rules, lint config) and Claude Design on the module shape. Route: implementation. Demo: acceptance 10. Blocked by: 5, 7.
9. [ ] **Breacán plugin and market.** Skills to make kits and build with them, the breacan-material language plugin from `material-reference`, the design-system plugin removed from domains, and dispatch routing. Route: implementation. Demo: acceptance 15. Blocked by: 8.
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

## Related

- [[Work Model]]: nouns, homes, and status.
- [[Orchestration]]: the loop and lanes.
- Superseded shape: `tokyo-mono/plans/kumiko_plan.md`; `markets/workflows/plans/systems_plan.md`.
