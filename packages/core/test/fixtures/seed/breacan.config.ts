// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from "breacan";
import dtcg from "breacan/dtcg";
import scheme from "breacan/scheme";

export default defineConfig({
  addons: [scheme, dtcg],
  options: { breacan: { path: "styles/tokens.css" }, scheme: { seed: "#3b5bdb" }, dtcg: { path: "tokens-out" } },
});
