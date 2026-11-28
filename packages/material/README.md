<!--
SPDX-FileCopyrightText: 2026 William Tierney

SPDX-License-Identifier: Apache-2.0
-->

# @breacan/material

The Breacán material addon gives a theme Material 3's baseline values through the `material` base. List it in `breacan.config.ts` with `addons: [material]`, then set `base = "material"` in `theme.toml`.

`mapping.json` is the base's mapping table: one row per core role, with its source (published, derived or kept), its Material token and a citation. The renderer, components and `md.sys.*` output come with the addon's later tasks in [the Plan](../../plans/breacan-addons.md). [The core's reference](../../docs/core.md#the-material-base) describes the base.
