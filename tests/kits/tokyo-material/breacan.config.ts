// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The new core's config for the kit, beside the old breacan.config.mjs: the css output goes where the old one did.
import { defineConfig } from "breacan";

export default defineConfig({
  options: { breacan: { path: "docs/playground/tokyo-material.css" } },
});
