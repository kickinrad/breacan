#!/usr/bin/env node

// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The core's command line. The tracer in the next task fills it; today it prints usage.
const usage = "usage: breacan <command>\n\nThe new core is being built. Use the 0.33 release of the old binary until it ships.";

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log(usage);
} else {
  console.error(`breacan: unknown command "${args[0]}"\n${usage}`);
  process.exitCode = 1;
}
