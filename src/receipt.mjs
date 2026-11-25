// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// The receipt: breacan.receipt.json, written by each build, holds the sha256 of every input the build read and every
// file it wrote. `breacan check` holds the working tree to it: an input changed since the build, or an output edited
// by hand, fails naming the file. A newer engine that would write different bytes does not fail a check; the next
// build takes it.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { checkHeader } from "./header.mjs";

export const RECEIPT = "breacan.receipt.json";

const sha = (text) => createHash("sha256").update(text).digest("hex");
const rel = (path) => relative(".", resolve(path)).split("\\").join("/");
const sorted = (entries) => Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));
const readOrUndefined = async (path) => {
  try { return await readFile(path); }
  catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
};

// The receipt's text for a build: `inputs` are paths, `outputs` the files as written, `header` says which carry the
// generated header the check holds them to.
export const receipt = async ({ engine, inputs, outputs, header }) => {
  const written = new Set(outputs.map((output) => rel(output.path)));
  const read = [...new Set(inputs.filter(Boolean).map(rel))].filter((path) => !written.has(path) && path !== RECEIPT);
  const hashed = await Promise.all(read.map(async (path) => [path, (await readOrUndefined(path)) ?? ""]));
  // Lists of { path, sha256 }, not path-to-digest maps: a path such as "tokens.json" beside a digest reads to secret
  // scanners (gitleaks' generic-api-key) as a key and its value, and would block every consumer's commit.
  const byPath = (a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return `${JSON.stringify({
    engine,
    inputs: hashed.filter(([, text]) => text !== "").map(([path, text]) => ({ path, sha256: sha(text) })).sort(byPath),
    outputs: outputs.map((output) => ({ path: rel(output.path), sha256: sha(output.content), ...(header(output) && { header: true }) })).sort(byPath),
  }, null, 2)}\n`;
};

const isMap = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
// A receipt's lists as path-keyed maps; 0.21 and 0.22 wrote the maps themselves, which still read.
const asMap = (list, value) => Array.isArray(list) && list.every((entry) => isMap(entry) && typeof entry.path === "string")
  ? Object.fromEntries(list.map((entry) => [entry.path, value(entry)])) : list;

export const readReceipt = async () => {
  const text = await readOrUndefined(RECEIPT);
  if (text === undefined) return undefined;
  let held;
  try { held = JSON.parse(text); }
  catch (error) { throw new Error(`${RECEIPT} is not valid JSON (${error.message}); run breacan build`); }
  if (!isMap(held)) return held;
  return { ...held, inputs: asMap(held.inputs, (entry) => entry.sha256), outputs: asMap(held.outputs, ({ path, ...entry }) => entry) };
};

// Holds the tree to the receipt. `candidates` are the input files that exist now, so a new one is caught too;
// `written` are the paths this build writes, which must be exactly the receipt's outputs.
export const checkReceipt = async (held, candidates, written) => {
  if (!isMap(held) || !isMap(held.inputs) || !isMap(held.outputs) || Object.values(held.outputs).some((entry) => !isMap(entry) || typeof entry.sha256 !== "string")) {
    throw new Error(`${RECEIPT} is not a receipt this engine reads; run breacan build`);
  }
  const outputs = new Set(Object.keys(held.outputs));
  const now = new Set(written.map(rel));
  for (const path of [...now].sort()) if (!outputs.has(path)) throw new Error(`${path} is not in the receipt; run breacan build`);
  for (const path of [...outputs].sort()) if (!now.has(path)) throw new Error(`${path} is in the receipt, but the build no longer writes it; run breacan build`);
  for (const path of [...new Set(candidates.map(rel))].filter((each) => !outputs.has(each) && each !== RECEIPT).sort()) {
    if (!(path in held.inputs)) throw new Error(`${path} is new since the last build; run breacan build`);
  }
  for (const [path, hash] of Object.entries(held.inputs)) {
    const text = await readOrUndefined(path);
    if (text === undefined) throw new Error(`${path} is gone since the last build; run breacan build`);
    if (sha(text) !== hash) throw new Error(`${path} changed since the last build; run breacan build`);
  }
  for (const [path, { sha256, header }] of Object.entries(held.outputs)) {
    const text = await readOrUndefined(path);
    if (text === undefined) throw new Error(`${path} is missing; run breacan build`);
    if (header) checkHeader(path, text.toString());
    if (sha(text) !== sha256) throw new Error(`${path} was edited by hand; change the kit's inputs and run breacan build`);
  }
};
