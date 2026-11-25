// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// What the website and image sources share: seed colours become colour roles through one of the colour engines,
// and extra token trees (the source's own primitives) join each scheme's tree.
import leonardo from "../foundations/leonardo.mjs";
import material from "../foundations/material.mjs";

const engines = { leonardo, material };

// The engine an options' `engine` names (leonardo by default).
export const engineOf = (module, options) => {
  const engine = engines[options.engine ?? "leonardo"];
  if (!engine) throw new Error(`${module} option "engine" must be ${Object.keys(engines).join(" or ")}`);
  return engine;
};

// { light, dark } from `seeds` by the engine option's name (leonardo by default), with each scheme's `extra` merged
// beside the engine's own tree (`extra.md` holds `ref`, which the engine's `md` does not).
export const seeded = async (module, options, seeds, extra) => {
  const trees = seeds.length ? await engineOf(module, options).run({ options: { seeds } }) : { light: {}, dark: {} };
  const join = (tree) => ({ ...tree, ...extra, md: { ...tree.md, ...extra.md } });
  return { light: join(trees.light), dark: join(trees.dark) };
};
