<!--
SPDX-FileCopyrightText: 2026 William Tierney

SPDX-License-Identifier: Apache-2.0
-->

# @breacan/image

Reads an image into a starting palette: Material's quantiser and scorer pick its three strongest colours, named `image-1` to `image-3`. A theme's roles can use them.

```ts
import { defineConfig } from "breacan";
import image from "@breacan/image";

export default defineConfig({ addons: [image], options: { "@breacan/image": { file: "logo.png" } } });
```

Then `"color.accent.default" = "image-1"` under `[roles]` in `theme.toml`. See [the core page](../../docs/core.md).
