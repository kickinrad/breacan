// Every part of a build outside the engine is a module of one shape: { slot, name, reads, writes, run(ctx) }.
// `slot` says when the engine runs it, `reads` names what of ctx it needs, and `writes` maps each option that says
// where it writes to its default, null when the config must set it. A preset is a named list of built-in modules.
import outputs from "./outputs/index.mjs";
import leonardo from "./foundations/leonardo.mjs";
import materialColour from "./foundations/material.mjs";
import { needKit } from "./system.mjs";

// The slots that run today, in run order. Each new slot joins here when its first two modules land. A foundation
// gives every colour role in both schemes ({ light, dark } token trees) over the base; an output writes files.
export const SLOTS = ["foundation", "output"];
const builtin = { ...outputs, [leonardo.name]: leonardo, [materialColour.name]: materialColour };

// The kumiko target shape { name, build }, still read until every consumer has moved.
const normalize = (module) => module && typeof module.build === "function" && module.run === undefined
  ? { slot: "output", reads: [], writes: {}, ...module, run: module.build } : module;

export const presets = {
  // The web kit: tokens for any tool, the stylesheet, the agent's DESIGN.md and Claude Design, and the playground.
  default: ["dtcg", "css", "beer", "design-md", "claude-design", "playground"],
};

// The config's modules, in order: its preset's (less any `without` names), then its own `modules` (or the older
// `targets`). Each is a built-in by name or a module the config imports, listed as its object.
export const resolveModules = (config) => {
  if (config.preset !== undefined && !presets[config.preset]) throw new Error(`Unknown preset ${config.preset} (presets: ${Object.keys(presets).join(", ")})`);
  const without = new Set(config.without ?? []);
  const listed = [...(presets[config.preset] ?? []).filter((name) => !without.has(name)), ...(config.modules ?? config.targets ?? [])];
  if (!listed.length) throw new Error("breacan.config.mjs names no modules");
  return listed.map((spec) => {
    const module = normalize(typeof spec === "string" ? builtin[spec] : spec);
    if (!module) throw new Error(`Unknown token target ${spec}`);
    const name = module.name ?? spec;
    if (typeof module.run !== "function") throw new Error(`Token target ${name} has no build()`);
    if (!SLOTS.includes(module.slot)) throw new Error(`Module ${name} names slot "${module.slot}"; the slots are ${SLOTS.join(", ")}`);
    return module;
  });
};

// A built-in module's first file, made in memory with its default options, for a module that needs a sibling the
// config does not list (the playground's stylesheets).
export const render = async (name, ctx) => {
  const module = outputs[name];
  return (await module.run({ ...ctx, options: optionsFor(module, ctx) }))[0].content;
};

// A module's options with its `writes` defaults filled in; a required one left unset stays unset.
export const withDefaults = (module, given = {}) => ({ ...Object.fromEntries(Object.entries(module.writes ?? {})
  .filter(([, fallback]) => fallback !== null)), ...Object.fromEntries(Object.entries(given).filter(([, value]) => value !== undefined)) });

// A module's options, after checking what it reads and must be told.
export const optionsFor = (module, ctx, given = {}) => {
  if (module.reads?.includes("kit")) needKit(ctx, module.name);
  const options = withDefaults(module, given);
  const missing = Object.keys(module.writes ?? {}).find((key) => options[key] === undefined);
  if (missing) throw new Error(`${module.name} option "${missing}" is required`);
  return options;
};
