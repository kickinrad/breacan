---
title: "Breacán: a small core with addons"
slug: breacan-addons
type: plan
status: in-progress
priority: high
run: here
appetite: project
assignee: claude
created: 2026-11-27
author: claude
tags: [breacan, design-tokens, dtcg, addons, studio]
---

# Breacán: a small core with addons

> [!abstract] TL;DR
> Breacán will become a small npm core plus `@breacan/*` addons, with its own neutral role names and a studio that shows every platform. The Tokyo Mono and Boombox kits will run on it, each with a working studio. Every kumiko trace will go.

## Outcome

A novice will go from an empty folder to a built, previewed theme with two commands, `breacan init` and `breacan studio`. A senior engineer will see a core with five commands, typed addons and no special cases. The Tokyo Mono kits and the Boombox kit will build on the new core. Each kit will open in a studio that shows its web, Android and iOS renderings.

This Plan replaces `plans/breacan_plan.md`. Its open tasks 20 (Figma import) and 22 (Penpot) move to Issues.

## Decisions

The owner settled each line below in the grill step. The decision record (task 1) holds the detail.

- The core and every addon ship as npm packages. Addons import the core's helpers and name it as a peer dependency. The 113.7 MB binary retires. mise installs `npm:breacan` with its npm package manager set to bun, so a project without a package.json adds `bun` beside it.
- A project has `theme.toml` for its decisions and an optional `breacan.config.ts` for addons and paths. The build file appears only when a project adds an addon or moves a path.
- `breacan init` sets a project up in place, and `breacan add <addon>` installs an addon and wires it in with magicast. Every prompt also takes a flag.
- One addon shape provides any of four parts: an input, a base, an output or a command. Built-in parts use the same shape.
- A theme starts from a base, overrides it, and each platform output adapts it with the dial. One chainable `base` key replaces `extends`, `include` and `builtin:*`. The three layers compile to a DTCG resolver document, and the dial becomes a resolver modifier.
- The core defines its own small set of neutral roles, named `<property>.<role>.<emphasis>`. Each base fills them in the fill order and records the source of each value in a mapping table. The Material addon still writes `md.sys.*` names and `--md-sys-*` CSS variables. A theme sets a role that only one platform has, such as `md.sys.color.surface-container-high`, under `[platform.<name>.roles]`.
- Platform addons (`material`, `apple`) are outputs. Each one has the platform's values, a renderer, components, icons and docs, and each can serve as a base.
- Components and screens are described once as component tokens. Each output's renderer draws them for studio. Projects add live pages, their own components and mockups.
- Beer CSS goes. The web renderer's plain-CSS components become the kits' web components.
- Official addons are `@breacan/*`. Community addons are `breacan-*` or `@author/breacan-*`. An `index/` folder lists them by pull request, with a type of official, verified, community or paid.
- Core contributions use a DCO sign-off. Paid addons will live in a separate private repo, and none will be sold yet.
- Every kumiko trace goes.
- Every consumer that tracks `latest` is pinned to 0.33 before the first breaking release, each with an Issue to unpin when it migrates. The first kit release on the new core is a major version.

## Vocabulary

Each term below replaces the retired names in brackets.

- **core:** the `breacan` package (engine, binary).
- **addon:** an npm package that adds parts (module, target).
- **built-in:** a part inside the core. **default addon:** one `init` installs (`studio`, `design-md`) (preset). **optional addon:** any other.
- **input:** a part that reads a starting point (source). **base:** what a theme starts from, and bases chain (extends, include, builtin, foundation). **platform base:** a base from a platform addon (language). **kit:** a theme published for other projects to use as a base.
- **theme:** a project's decisions in `theme.toml` (look). **palette:** a theme's named raw colours. **role:** a neutral name for a job, such as `color.text.muted` (contract role, `md.sys.*` in the core).
- **component token:** a part of a component and the role it uses (specimen). **screen:** components composed into a view (page, example).
- **mode:** a variant that a media query selects (media, scheme, variant, context). **platform:** where an output lands. **dial:** `native`, `tinted`, `branded` or `signature`.
- **output:** a part that writes files (target). **renderer:** the part of an output that draws for studio. **studio:** the preview and editor (playground, edit, dev).
- **receipt**, **contrast floor**, **fill order** (published, then derived, then kept), **mapping table**, **index** (registry).
- **Commands:** `init`, `add`, `build`, `check`, `lint`, and `studio` from its addon. `new`, `edit`, `audit`, `dev`, `--check` and `kumiko` retire.
- **theme.toml sections:** `base`, `[palette]`, `[modes]` (media), `[roles]`, `[fonts]` (faces), `[tokens]`, `[derived]`, `[contrast]`, `[platform.<name>]`. `[mealie]` moves into the mealie addon's options.

The roles:

- **Colour:** `color.surface.{default,raised,overlay,sunken,inverse}`, `color.text.{default,muted,subtle,inverse}`, `color.accent.{default,muted}`, `color.on-accent.{default,muted}`, `color.border.{default,subtle}`, `color.status.{danger,success,warning,info}`, `color.on-status.*`, `color.focus`, `color.scrim`. The optional `color.accent-2.*` and `color.accent-3.*` families fill from `color.accent.*`.
- **Type and fonts:** `type.{display,title,heading,body,label,caption}`, `font.{body,display,mono}`, `icon.set`.
- **Shape, space and size:** `corner.{control,container,overlay,full}`, `space.3xs` to `space.3xl` in nine steps, `size.touch`, `density`.
- **Elevation, motion and state:** `elevation.{raised,overlay}`, `motion.duration.{short,medium,long}`, `motion.easing.{standard,enter,exit}`, `state.{hover,pressed,focus,disabled}`.
- **Components:** `comp.<component>.<part>.<property>`, with Open UI's part names where Open UI has them.

## Approach

The work will reuse the code that already does each job:

- `src/resolve.mjs`, `src/receipt.mjs`, `src/checks/contrast.mjs`, `src/derived.mjs`, `src/dial.mjs` and `src/color.mjs` move into the core. The old CLI imports them from `packages/core` until task 19, so both keep working.
- `src/languages/apple.mjs` and `src/languages/material.mjs` become the platform addons' values. `src/toml-edit.mjs` and `src/token-edit.mjs` become studio's write-back.
- Each `src/outputs/*.mjs` moves into its addon with its options renamed to `path`.
- `@material/material-color-utilities` stays for tone maths. `magicast` edits `breacan.config.ts`.
- `@terrazzo/plugin-tailwind` replaces our Tailwind writer if its output matches the golden.

The seam is `breacan build` and `breacan check` on fixture projects. The golden harness in `tests/kits.test.ts` already runs it, and task 5d makes it run the new CLI with one golden file per addon.

The new core grows beside the old code as `packages/core` in a bun workspace (expand). The two kits move to it (migrate), then the old `src/`, the binary build and the old dependencies go (contract). The unmigrated consumers stay on 0.33 until each one moves.

## Out of scope

- SwiftUI, Compose and XAML file writers (#97), and the Fluent base and WinUI addon (#96).
- Migrating apps and sites: tokyo-mono-site, the stacks templates, skylight, cttc-foundation (#98) and the Boombox apps.
- Selling paid addons and running a hosted store.
- A Storybook addon, real native renders in CI, and Figma or Penpot import.
- Running the core on Node. `shortcut: Bun only, add Node when a user asks`.

## Acceptance

Each check fails at dc20337 and runs from outside the repo:

- [ ] In an empty folder, `bunx breacan init --seed "#3b5bdb" --yes` writes `theme.toml`, installs studio and design-md, and builds the CSS and DTCG files. `breacan check` then passes.
- [ ] `breacan add tailwind` installs `@breacan/tailwind`, adds it to `breacan.config.ts` and builds its file. A misspelled option fails with a message that lists the known options.
- [ ] A Playwright test opens `breacan studio` in `tokyo-mono/material`. It finds web, material and apple frames, each with every shared component and no unresolved role. A palette edit in studio writes `theme.toml`, rebuilds, and `breacan check` passes.
- [ ] The same studio test passes in `boombox-design`, on a branch that waits for the owner's approval.
- [ ] A coverage test gives every core role a value for the `material` and `apple` bases, and records published, derived or kept for each. Material publishes at least 90% of the colour roles, and Apple publishes at least half.
- [ ] Built by the npm package, tokyo-mono's `ports/` files stay byte-identical to dc20337's. The PR lists every other moved digest with its reason.
- [ ] `bun add breacan` in an empty folder installs under 15 MB. `bunx breacan --help` exits 0 on Linux and macOS in CI.
- [ ] In a folder with no package.json, `mise use npm:breacan bun` installs a `breacan` that runs `breacan lint`.
- [ ] `rg -i kumiko` finds nothing in the Breacán repo, the dotfiles, the markets plugins, the stacks templates or boombox-design. Released CHANGELOG entries stay as history.

## Tasks

Waves run in order. Tasks inside a wave run in parallel, one worktree each. Only the orchestrator regenerates `bun.lock`.

**Wave 0: prefactors**

- [ ] 0. The owner creates the `@breacan` npm organisation, claims `breacan`, and turns on trusted publishing for kickinrad/breacan. Route: here. Demo: GitHub Actions can publish with no stored token. Blocked by: none.
- [x] 1. Write the decision record for the core, addons, base chain and neutral roles through Curator. It supersedes the role-contract part of ADR-026. Route: here. Demo: Curator cites it. Blocked by: none.
- [x] 2. Pin every consumer that tracks `latest` to 0.33, each with an Issue to unpin: tokyo-mono, tokyo-mono-site, the astro, emdash and themeco-pro stacks templates, skylight and the dotfiles. boombox-design gets its pin by a PR the owner approves. Porchlight's unused kumiko line goes. Route: here. Demo: each repo's CI is green on the pin. Blocked by: none.
- [x] 3. Remove the kumiko traces and dead shims. These are the CLI guards, `targets`, the 0.21 receipt reader, the no-receipt check, the stale branches and the docs lines. Rename the local folder to `breacan`. Fix chezmoi, the material skill path, the markets link and the vault hub. Fix the stacks themeco-pro check and boombox-design's design-system skill (by PR). Ignore `.handoffs/`, stop `bun install` rewriting `bun.lock`, and fix #117. Route: implementation-light. Demo: the kumiko search is clean. Blocked by: 2.
- [ ] 4. Set up the bun workspace with `packages/core` and a package for every planned addon. Configure release-please for many packages so the core's release stays GitHub's Latest. Publish to npm with provenance, and add macOS to the CI matrix. Route: implementation. Demo: a 0.x prerelease of `breacan` installs from npm. Blocked by: 0, 2.

**Wave 1: the spine**

- [ ] 5a. Build a thin tracer: a few roles from `theme.toml` to CSS with a receipt, through the addon contract, `defineConfig` and the config loader. Route: implementation-hard. Demo: a fixture builds and checks. Blocked by: 4.
- [ ] 5b. Add the full role set, `[platform.<name>.roles]`, the Material base values, one mapping-table file per base, and the coverage test. Route: implementation-hard. Demo: coverage passes for material. Blocked by: 5a.
- [ ] 5c. Add rejection of unknown options (#84), `ctx.output(name)` and the `breacan/color` export. Port `scheme` and `dtcg` as the contract's first two users. Route: implementation. Demo: a misspelled option fails with the known list. Blocked by: 5a.
- [ ] 5d. Rework the golden harness: migrate the fixture inputs, let the harness pick the CLI, and write one golden file per addon. Migrate the Boombox fixture from the `pre-breacan` tag. Route: implementation. Demo: the harness runs both CLIs. Blocked by: 5a.
- [ ] 5e. Write the component spec (about 15 components and 4 screens) and the web renderer's plain-CSS components. Route: implementation-hard. Demo: the web rendering in a static page. Blocked by: 5b.

**Wave 2: addons, in parallel**

Each task ports its own tests from `tests/`.

- [ ] 6. Add `init`, `add`, `--help`, usage on a bare call and one line per written file. Route: implementation. Demo: the first two acceptance checks. Blocked by: 5b, 5c.
- [ ] 7. Port the `image` and `website` inputs. Route: implementation-light. Demo: each fixture builds. Blocked by: 5c.
- [ ] 8. Port `tailwind` and `react-native`. Try the Terrazzo Tailwind plugin against the golden first. Route: implementation. Demo: their goldens. Blocked by: 5b, 5c, 5d.
- [ ] 9. Port `template`, `obsidian` and `mealie`, with `[mealie]` moved into options. Route: implementation-light. Demo: tokyo-mono's ports stay byte-identical. Blocked by: 5c, 5d.
- [ ] 10. Port `design-md`, `claude-design` and `agent-plugin` with its rules. Route: implementation. Demo: their goldens. Blocked by: 5d, 5e.
- [ ] 11. Make `lint` generic, let addons add rules, add `.astro`, `.tsx`, `.jsx`, `.vue` and `.svelte`, and drop the Beer check. Route: implementation-light. Demo: lint flags a value in an `.astro` file. Blocked by: 5c.
- [ ] 13. Build the `apple` addon: its values, mapping cells with platform symbols, dial, renderer and docs. Route: implementation. Demo: coverage passes for apple. Blocked by: 5e.
- [ ] 14. Finish the `material` addon: its renderer, component tokens, docs and `md.sys.*` aliases. Route: implementation. Demo: `--md-sys-*` variables still build. Blocked by: 5e.
- [ ] 15. Build the studio: the static page, the live editor with write-back to `theme.toml`, live project pages from a dev server URL, and the Playwright test. Route: implementation-hard. Demo: the studio test on a fixture. Blocked by: 5e.
- [ ] 16. Add the `index/` folder with its YAML schema and a CI check, and list it from a bare `breacan add`. Route: implementation-light. Demo: a bad entry fails CI. Blocked by: 6.

**Wave 3: the kits**

- [ ] 17. Move the Tokyo Mono kits to the new core and release the kit as a major version. Replace every Beer use: the `tokyo-material-beer.css` release asset (`ci.yml:69`), the two evals, `references/components.md`, the Claude Design previews and the elevation note in `theme.toml:71`. Move the kit's `md.sys.*` keys to neutral roles or `[platform.material.roles]`, update the kit's agent skill, and unpin tokyo-mono. Route: implementation-hard. Demo: the Tokyo studio test. Blocked by: 9, 10, 13, 14, 15.
- [ ] 18. Move the Boombox kit to the new core on a branch, with react-native, apple and material, and remove its Beer output and stylesheet. Open the PR for the owner's review, because the owner approves every visible change in a client repo. Route: implementation-hard. Demo: the Boombox studio test. Blocked by: 8, 13, 14, 15.

**Wave 4: contract and docs**

- [ ] 19. Delete the old `src/`, its tests, the binary build, Beer, Leonardo, the apca-w3 stub, the Radix base, `audit` and the old playground and editor. Route: implementation-light. Demo: every acceptance check passes. Blocked by: 17, 18.
- [ ] 20. Rewrite the README for a novice's first screen, and write `docs/glossary.md` from the Vocabulary section. Update AGENTS.md, add the DCO to CONTRIBUTING and refresh `docs/`. Route: docs-sweep. Demo: a fresh agent follows the README to a built theme. Blocked by: 19.
- [ ] 21. Close the old Plan, update the vault hub through Curator, and archive what the new core replaced. Route: here. Demo: Curator answers from the new hub. Blocked by: 20.

## Run

Lane: here. This session orchestrates while the owner watches, and it merges in wave order.

- **Workers:** each task runs as a child session through `dispatch run <route> --provider claude`, in its own worktree under the repo's `.worktrees/`. One writer owns each worktree. Test-writing inside a task may route to `test-writing`.
- **Review:** each PR gets `delivery:reviewer` from another model family. Tasks 5a, 5b, 5e and 15 also get a Fable challenge before merge, because the contract and studio are hard to reverse.
- **Integration:** wait for green checks, then merge. Merge release-please's PR after each feat or fix, and wait for the npm release before a dependent task relies on it.
- **Worker brief:**
  - Never `rm` with a glob, and use `mktemp -d`.
  - Answer the mise trust prompt.
  - Keep commit subjects to 72 characters.
  - Explain every moved golden digest in the PR. The Boombox golden runs only with `BOOMBOX_DESIGN` set to a checkout of boombox-design's `pre-breacan` tag.
  - Record speculative review edges as Limits lines in `docs/`.

Log:

- 2026-11-27: build started; the Plan was committed to the repo and claimed (#155).
- 2026-11-27, task 1 (here, Demo first try): Curator wrote ADR-027, marked ADR-026 superseded in part (roles and module shape), and added it to the hub's Decisions table.
- 2026-11-27, task 2 (here, Demo passed after one fix): every consumer pins 0.33 with an Issue to unpin: tokyo-mono #127 (#126), tokyo-mono-site #18 (#17), skylight #46 (#45), porchlight #29 (#28), dotfiles #256 (#255), stacks #36 (#31), boombox-design #16 (#15, merged on Wils's approval). Porchlight's main already used `breacan lint`, so it was pinned, not dropped. Stacks first needed #32: the emdash creator now ships a `.claude/skills` link that Biome followed.
- 2026-11-27, task 3 (implementation-light, Demo first try): #156 (closes #117), core #132, stacks #34 and boombox-design #17 leave no old-name match outside CHANGELOG and plans. The folder is now `~/projects/personal/breacan`; dotfiles #257 moved the marketplace path and landed the unpushed local commit, and the vault hub was updated. The Plan's own old-name mentions go in task 21.

## Related

- The decision record from task 1, which supersedes part of ADR-026.
- `plans/breacan_plan.md`, which this Plan replaces.
- Issues #84, #89, #96, #97, #98 and #117.
