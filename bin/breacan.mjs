#!/usr/bin/env bun
// Build a kit's tokens into the outputs its breacan.config.mjs names. The old kumiko spellings fail naming their replacement.
import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pkg from "../package.json" with { type: "json" };
import { build } from "../src/build.mjs";

const USAGE = "breacan [build [--refresh] | check | new --seed <hex>… [<dir>] | lint <file>… | audit [<dir>] | edit [--port <n>] | --version]";
const fail = (message) => { console.error(message); process.exit(1); };
const exit = (findings) => { if (findings.length) console.log(findings.join("\n")); process.exit(findings.length ? 1 : 0); };

// The old spellings are gone; each fails naming its replacement.
if ([process.argv0, process.execPath].some((path) => basename(path, ".exe") === "kumiko")) fail("kumiko is now breacan: run the same command as breacan");
const [verb, ...rest] = process.argv.slice(2);
if (verb === undefined) fail(`breacan: name a verb; breacan build is what a bare breacan did (${USAGE})`);
if (verb === "--check") fail("breacan: --check is now the check verb: run breacan check");
if (verb === "dev") fail("breacan: dev is now the edit verb: run breacan edit");

if (verb === "--version") {
  if (rest.length) fail(`breacan: unknown ${rest[0]} (${USAGE})`);
  console.log(pkg.version);
  process.exit(0);
}
const port = verb === "edit" && rest[0] === "--port" && /^\d+$/.test(rest[1] ?? "") ? Number(rest[1]) : undefined;
const extra = verb === "lint" || verb === "audit" || verb === "new" ? undefined
  : verb === "edit" ? (port ? rest.slice(2) : rest)[0]
  : verb === "build" ? rest.find((arg) => arg !== "--refresh")
  : verb === "check" ? rest[0]
  : verb;
if (extra !== undefined) fail(`breacan: unknown ${extra} (${USAGE})`);

if (verb === "new") {
  const { create } = await import("../src/new.mjs");
  try {
    const { dir, name } = await create(rest);
    console.log(`breacan new: the ${name} kit is in ${dir}; run breacan build there`);
    process.exit(0);
  } catch (error) { fail(error.message); }
}

// breacan lint [--rules <file>] <path>…: the kit's rules come from --rules, else breacan.rules.json here if present.
if (verb === "lint") {
  const { lint } = await import("../src/lint.mjs");
  try {
    const at = rest.indexOf("--rules");
    const file = at >= 0 ? rest[at + 1] : existsSync("breacan.rules.json") ? "breacan.rules.json" : undefined;
    const paths = at >= 0 ? rest.filter((_, i) => i !== at && i !== at + 1) : rest;
    let rules;
    if (file) {
      try { rules = JSON.parse(readFileSync(file, "utf8")); } catch (error) { throw new Error(`breacan lint: cannot read rules ${file} (${error.message})`); }
    }
    exit(lint(paths, rules));
  } catch (error) { fail(error.message); }
}

const configPath = existsSync("breacan.config.mjs") ? resolve("breacan.config.mjs") : undefined;
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

if (!configPath) fail(existsSync("kumiko.config.mjs") ? "kumiko.config.mjs is now breacan.config.mjs: rename it" : "No breacan.config.mjs in this directory");
const config = await loadConfig();
if (verb === "edit") {
  const { edit } = await import("../src/edit.mjs");
  try {
    const server = await edit({ config, port });
    console.log(`breacan edit: http://localhost:${server.port}/ (the Kit panel is /_breacan/panel); it answers only to localhost and 127.0.0.1`);
  } catch (error) { fail(error.message); }
} else {
  try { await build(config, { check: verb === "check", refresh: verb === "build" && rest.includes("--refresh") }); } catch (error) { fail(error.message); }
}
