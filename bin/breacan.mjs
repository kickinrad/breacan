#!/usr/bin/env bun
// Build a kit's tokens into the outputs its breacan.config.mjs names. The binary also answers to `kumiko`, with
// `--check` and kumiko.config.mjs, until every consumer has moved (plans/breacan_plan.md, the contract task).
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pkg from "../package.json" with { type: "json" };
import { build } from "../src/build.mjs";

const USAGE = "breacan [build | check | lint <file>… | audit [<dir>] | dev [--port <n>] | --version]";
const fail = (message) => { console.error(message); process.exit(1); };
const exit = (findings) => { if (findings.length) console.log(findings.join("\n")); process.exit(findings.length ? 1 : 0); };

// The old spellings map onto the verbs: no verb builds, `--check` checks.
const args = process.argv.slice(2);
const [verb, ...rest] = args.length === 0 ? ["build"] : args[0] === "--check" ? ["check", ...args.slice(1)] : args;

if (verb === "--version") {
  if (rest.length) fail(`breacan: unknown ${rest[0]} (${USAGE})`);
  console.log(pkg.version);
  process.exit(0);
}
const port = verb === "dev" && rest[0] === "--port" && /^\d+$/.test(rest[1] ?? "") ? Number(rest[1]) : undefined;
const extra = verb === "lint" || verb === "audit" ? undefined
  : verb === "dev" ? (port ? rest.slice(2) : rest)[0]
  : verb === "build" || verb === "check" ? rest[0]
  : verb;
if (extra !== undefined) fail(`breacan: unknown ${extra} (${USAGE})`);

if (verb === "lint") {
  const { lint } = await import("../src/lint.mjs");
  try { exit(lint(rest)); } catch (error) { fail(error.message); }
}

// breacan.config.mjs, or the old kumiko.config.mjs while consumers move.
const configPath = ["breacan.config.mjs", "kumiko.config.mjs"].map((name) => resolve(name)).find((path) => existsSync(path));
const loadConfig = async () => (await import(pathToFileURL(configPath).href)).default ?? {};

// breacan audit [<dir>]: the playground (the config's playground path by default) in headless Chrome.
if (verb === "audit") {
  const { audit } = await import("../src/render.mjs");
  try {
    const dir = rest[0] ?? (configPath ? (await loadConfig()).playground?.path : undefined);
    if (!dir) throw new Error("breacan audit: name the playground's directory, or run it where breacan.config.mjs has a playground output");
    exit(await audit(resolve(dir)));
  } catch (error) { fail(error.message); }
}

if (!configPath) fail("No breacan.config.mjs in this directory");
const config = await loadConfig();
if (verb === "dev") {
  const { dev } = await import("../src/dev.mjs");
  try {
    const server = await dev({ config, port });
    console.log(`breacan dev: http://localhost:${server.port}/ (the bridge is http://localhost:${server.port}/_kumiko/bridge.js); it answers only to localhost and 127.0.0.1`);
  } catch (error) { fail(error.message); }
} else {
  try { await build(config, { check: verb === "check" }); } catch (error) { fail(error.message); }
}
