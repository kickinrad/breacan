// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// A colour engine's seeds option: one to three six-digit hex colours, primary first.
export const seedsOf = (options, engine) => {
  const { seeds } = options;
  if (!Array.isArray(seeds) || !seeds.length || seeds.length > 3 || seeds.some((seed) => typeof seed !== "string" || !/^#[0-9a-fA-F]{6}$/.test(seed))) {
    throw new Error(`${engine} option "seeds" must list one to three colours like #rrggbb`);
  }
  return seeds.map((seed) => seed.toLowerCase());
};
