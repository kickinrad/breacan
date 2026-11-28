// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The new core's config for the kit, beside the old breacan.config.mjs: the css output goes where the old one did, and the dtcg addon writes ports/tokens.
import { defineConfig } from "breacan";
import dtcg from "breacan/dtcg";

export default defineConfig({
  addons: [dtcg],
  options: { breacan: { path: "docs/playground/tokyo-material.css" } },
});
