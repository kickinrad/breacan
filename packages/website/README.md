<!--
SPDX-FileCopyrightText: 2026 William Tierney

SPDX-License-Identifier: Apache-2.0
-->

# @breacan/website

Reads a live website into a starting point: its elected colours are the palette names `site-1` to `site-3`, and every colour, font, radius and space it finds is a `needs-review` primitive under `site`. Run `breacan site` once to keep the values in `design/site.json`; builds read that file and never the network. It needs Chrome.

```ts
import { defineConfig } from "breacan";
import website from "@breacan/website";

export default defineConfig({ addons: [website], options: { "@breacan/website": { url: "https://example.com" } } });
```

See [the core page](../../docs/core.md).
