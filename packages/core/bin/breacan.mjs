#!/usr/bin/env bun

// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The core's command line. Each verb is a command part of the project's addons, the core's own build and check first.
import { partsOf } from "../src/addon.ts";
import { builtins } from "../src/builtins.ts";
import { loadProject } from "../src/project.ts";

const usage = (commands) => `usage: breacan <command>\n\n${commands.map((each) => `  ${each.name.padEnd(8)}${each.summary}`).join("\n")}`;
const fail = (message) => { console.error(`breacan: ${message}`); process.exit(1); };

const [verb, ...args] = process.argv.slice(2);
if (verb === undefined || verb === "--help" || verb === "-h") {
  // Help needs no project: outside one it lists the core's commands.
  let commands = partsOf({ addons: [builtins] }, "command");
  try { commands = partsOf(await loadProject(process.cwd()), "command"); } catch {}
  console.log(usage(commands));
} else {
  try {
    const project = await loadProject(process.cwd());
    const command = partsOf(project, "command").find((each) => each.name === verb);
    if (!command) fail(`unknown command "${verb}"\n${usage(partsOf(project, "command"))}`);
    process.chdir(project.root);
    await command.run({ project, args });
  } catch (error) { fail(error.message); }
}
