// `breacan new --seed <hex> [--seed <hex>…] [--engine leonardo|material] [<dir>]`: a starter kit in <dir> (here by
// default), named for the folder. Its look is the seeds alone; the base fills everything else. Writes nothing over
// an existing kit.
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { seedsOf } from "./foundations/seeds.mjs";

const ENGINES = ["leonardo", "material"];

export const create = async (args) => {
  const seeds = [];
  let engine = "leonardo";
  let dir = ".";
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--seed") seeds.push(args[++i]);
    else if (args[i] === "--engine") engine = args[++i];
    else if (args[i].startsWith("--")) throw new Error(`breacan new: unknown ${args[i]}`);
    else dir = args[i];
  }
  if (!ENGINES.includes(engine)) throw new Error(`breacan new: --engine is ${ENGINES.join(" or ")}, not ${engine}`);
  seedsOf({ seeds }, "breacan new: --seed");
  const name = basename(resolve(dir)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!name) throw new Error("breacan new: the folder's name gives no kit name");
  if (existsSync(join(dir, "breacan.config.mjs"))) throw new Error(`breacan new: ${dir} already holds a kit`);
  await mkdir(dir, { recursive: true });
  const config = `// The ${name} kit: run \`breacan build\`, then \`breacan check\`. Its look is the seeds; the base fills the rest.
export default {
  preset: "default",
  kit: { name: ${JSON.stringify(name)} },
  modules: [${JSON.stringify(engine)}],
  ${engine}: { seeds: ${JSON.stringify(seeds)} },
  dtcg: { path: "ports/tokens" },
  "claude-design": { path: "ports/claude-design" },
  playground: { path: "docs/playground" },
};
`;
  await writeFile(join(dir, "breacan.config.mjs"), config);
  if (!existsSync(join(dir, "VERSION"))) await writeFile(join(dir, "VERSION"), "0.1.0\n");
  return { dir, name };
};
