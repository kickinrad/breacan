// DTCG 2025.10 tokens/*.tokens.json is the only value source. The engine loads and stacks the layers, resolves
// them, runs the config's modules (src/modules.mjs) and writes or checks their files.
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import material from "./material.mjs";
import { readTokens, resolve as resolveTokens, typography } from "./resolve.mjs";
import { checkHeader, stamp } from "./header.mjs";
import { checkContrast, contrastPairs } from "./checks/contrast.mjs";
import { derive } from "./derived.mjs";
import { loadTheme, withMedia } from "./theme.mjs";
import { optionsFor, render, resolveModules, withDefaults } from "./modules.mjs";
import { loadResolver } from "./resolver.mjs";
import { colours, shared } from "./base.mjs";
import { checkContract } from "./contract.mjs";
import { checkReceipt, readReceipt, receipt, RECEIPT } from "./receipt.mjs";
import { wantsHeader } from "./header.mjs";
import pkg from "../package.json" with { type: "json" };

// Built-in include layers, named in a config's `include` beside its file globs.
const layers = { [material.name]: material };

const cssTypes = new Set(["color", "dimension", "duration", "fontFamily", "fontWeight", "number", "string", "typography", "shadow", "cubicBezier"]);
// One resolved token as targets see it: value is the CSS scalar.
const entry = (token) => {
  if (!cssTypes.has(token.type)) throw new Error(`No lossless CSS scalar mapping for ${token.path} (${token.type})`);
  if (!["string", "number"].includes(typeof token.css) || String(token.css).includes("[object Object]")) {
    throw new Error(`No CSS scalar for ${token.path} (${token.type}); resolve this token before handoff`);
  }
  return {
    path: token.path, segments: token.segments, name: token.name, type: token.type, value: token.css, raw: token.raw,
    alias: token.alias, description: token.description, derived: token.extensions?.["com.kickinrad.derived"] === true || undefined,
    usage: token.extensions?.["com.kickinrad.breacan"]?.usage, review: token.extensions?.["com.kickinrad.breacan"]?.["needs-review"] === true || undefined,
    typography: token.type === "typography" ? typography(token.raw) : undefined,
  };
};
// An include may be a glob; its matches join in sorted order.
const expand = (patterns) => patterns.flatMap((pattern) => /[*?[{]/.test(pattern) ? [...new Bun.Glob(pattern).scanSync()].sort() : [pattern]);
// A layer is { file } or { tree, file } (file then names it in an error); `strict` makes a token set twice an error.
const resolveLayers = async (layers, options) => resolveTokens(await Promise.all(layers.map(async (layer) => ({
  ...layer, tree: layer.tree ?? await readTokens(layer.file),
}))), options);

const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
// A declared kit adds its root, version and name to every target's ctx; none declared, ctx is unchanged.
const loadKit = async (kit) => {
  if (kit === undefined) return {};
  if (!kit || typeof kit !== "object" || typeof kit.name !== "string" || !kit.name) {
    throw new Error("kit.name is required when kit is set");
  }
  let version;
  try { version = (await readFile("VERSION", "utf8")).trim(); }
  catch (error) { if (error.code === "ENOENT") throw new Error("VERSION is missing; a kit needs one"); throw error; }
  if (!semver.test(version)) throw new Error(`VERSION must hold a semantic version, not "${version}"`);
  return { root: resolve(kit.root ?? "design"), version, name: kit.name };
};

// The local files a module imports, transitively (`./` and `../` specifiers), so a config split into helpers is held
// by the receipt too.
const localImports = (file, seen = new Set()) => {
  if (!file || seen.has(resolve(file))) return [];
  seen.add(resolve(file));
  let text;
  try { text = readFileSync(file, "utf8"); } catch { return []; }
  // Bun's own scanner (comments and strings are not imports) and resolver (extensionless and directory imports).
  const found = new Bun.Transpiler({ loader: "js" }).scanImports(text).map(({ path }) => path).filter((spec) => /^\.{1,2}\//.test(spec))
    .flatMap((spec) => { try { return [relative(".", Bun.resolveSync(spec, dirname(resolve(file))))]; } catch { return []; } });
  return found.flatMap((each) => [each, ...localImports(each, seen)]);
};

// `preview` (breacan dev): read theme.toml from `theme` (its text), write nothing, and return contrast failures beside
// the outputs instead of failing on them. `configFile` is the config's path, an input the receipt holds; by default
// the one in this directory.
export const build = async (config = {}, { check = false, preview = false, theme: themeText,
  configFile = ["breacan.config.mjs", "kumiko.config.mjs"].find((file) => existsSync(file)) } = {}) => {
  const modules = resolveModules(config);
  const foundations = modules.filter((module) => module.slot === "foundation");
  const kit = await loadKit(config.kit);

  // The layers, lowest first: built-in trees, include files, the kit's theme.toml, then the project's own tokens/
  // files, where a token set twice is an error. Each other mode adds its media layers on top.
  const theme = await loadTheme(kit, themeText);
  // Sorted: directory listing order varies by filesystem and runtime, and output order must not.
  const listed = (await readdir("tokens").catch((error) => { if (error.code === "ENOENT") return []; throw error; })).sort();
  // A resolver in tokens/ governs the folder: its default input is the base layer, each other mode a media layer.
  const resolvers = listed.filter((file) => file.endsWith(".resolver.json"));
  if (resolvers.length > 1) throw new Error(`tokens/ holds ${resolvers.length} resolvers; a kit reads one`);
  const standard = resolvers.length ? await loadResolver(`tokens/${resolvers[0]}`) : undefined;
  const media = withMedia(theme, config.media, standard?.media);
  let modes = theme.modes ?? standard?.modes;
  // builtin:base fills every contract role: Material beneath, the base's shared values, then its colours in the
  // scheme of the kit's base mode, and the other scheme under the colour-scheme query. A kit with no modes takes
  // light, with dark under (prefers-color-scheme: dark).
  // A colour engine (a foundation module) builds on the base, which fills every role it leaves.
  const base = (config.include ?? []).includes("builtin:base") || foundations.length > 0;
  const engines = await Promise.all(foundations.map(async (module) => module.run({ options: optionsFor(module, {}, config[module.name]) })));
  const schemeQuery = Object.keys(media).find((query) => /prefers-color-scheme:\s*(light|dark)/.test(query));
  if (base && !modes) {
    modes = { base: "light", media: { "(prefers-color-scheme: dark)": "dark" } };
    media["(prefers-color-scheme: dark)"] = [];
  }
  const baseScheme = /prefers-color-scheme:\s*light/.test(schemeQuery ?? "") ? "dark" : "light";
  if (base) {
    const query = schemeQuery ?? "(prefers-color-scheme: dark)";
    const other = baseScheme === "dark" ? "light" : "dark";
    media[query]?.unshift({ tree: colours(other), file: "builtin:base" }, ...engines.map((engine, i) => ({ tree: engine[other], file: foundations[i].name })));
  }
  const mediaPaths = new Set(Object.values(media).flat().filter((layer) => layer.file).map((layer) => resolve(layer.file)));
  const baseFiles = standard ? [] : listed.filter((file) => file.endsWith(".tokens.json")).map((file) => `tokens/${file}`)
    .filter((file) => !mediaPaths.has(resolve(file)));
  const builtins = [];
  const include = [];
  for (const spec of config.include ?? []) {
    if (!spec.startsWith("builtin:")) { include.push(...expand([spec]).map((file) => ({ file }))); continue; }
    if (spec === "builtin:base") continue;
    if (!layers[spec]) throw new Error(`Unknown built-in include ${spec}`);
    builtins.push({ tree: layers[spec].tokens(), file: spec });
  }
  if (base) {
    if (!builtins.some((layer) => layer.file === material.name)) builtins.push({ tree: material.tokens(), file: material.name });
    builtins.push({ tree: shared(), file: "builtin:base" }, { tree: colours(baseScheme), file: "builtin:base" },
      ...engines.map((engine, i) => ({ tree: engine[baseScheme], file: foundations[i].name })));
  }
  include.unshift(...builtins);
  if (theme.tree) include.push({ tree: theme.tree, file: "theme.toml" });
  if (standard) include.push({ tree: standard.tree, file: `tokens/${resolvers[0]}` });
  const source = baseFiles.map((file) => ({ file, strict: true }));
  const modeLayers = (query) => [...include, ...source.map(({ file, tree }) => ({ file, tree })), ...media[query]];

  // The derived roles come first, from everything else, so the build reads what this run computes.
  if (theme.derived) {
    const queries = Object.keys(media);
    if (queries.length !== 1) throw new Error(`theme.toml: [derived] needs exactly one other mode; the kit has ${queries.length}`);
    const first = async (layers) => (await resolveLayers(layers, { lenient: true })).flatMap((token) => {
      try { return [entry(token)]; } catch { return []; }
    });
    const derived = derive(theme.derived, theme.name, { tokens: await first([...include, ...source]), other: await first(modeLayers(queries[0])) });
    source.push({ tree: derived.base, file: "the derived roles", strict: true });
    media[queries[0]].push({ tree: derived.media, file: "the derived roles", strict: true });
  }

  const resolved = await resolveLayers([...include, ...source]);
  const paths = new Set(resolved.map((token) => token.path));
  // A theme that maps Material's colour roles maps the ones it picks: once the layers merge, every one must be set.
  if (Object.keys(theme.roles ?? {}).some((role) => role.startsWith("md.sys.color."))) {
    const missing = Object.entries(material.tokens().md.sys.color).filter(([key, token]) => "$value" in token && !paths.has(`md.sys.color.${key}`))
      .map(([key]) => `md.sys.color.${key}`);
    if (missing.length) throw new Error(`theme.toml: no layer sets ${missing.length} Material colour role${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`);
  }
  // A token no layer but a built-in one sets is marked `builtin`, so a target can tell Material's untouched tokens
  // from a project's own.
  const own = new Set();
  const collect = (node, path = []) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    if ("$value" in node) return own.add(path.join("."));
    for (const [key, child] of Object.entries(node)) if (!key.startsWith("$")) collect(child, [...path, key]);
  };
  for (const layer of [...include, ...source, ...Object.values(media).flat()]) {
    if (!layer.file?.startsWith("builtin:")) collect(layer.tree ?? await readTokens(layer.file));
  }
  const tokens = resolved.map(entry).map((token) => own.has(token.path) ? token : { ...token, builtin: true });

  // Each other mode resolves once, when a target or the contrast check first asks for it. A target passes back the
  // layers it was given in ctx.media.
  const cache = new Map();
  const mediaTokens = (layers) => {
    const query = Object.keys(media).find((each) => media[each] === layers);
    if (!query) throw new Error("mediaTokens takes one of ctx.media's values");
    if (!cache.has(query)) cache.set(query, resolveMedia(query));
    return cache.get(query);
  };
  const resolveMedia = async (query) => {
    const own = await Promise.all(media[query].map(async (layer) => layer.tree ?? await readTokens(layer.file)));
    const visit = (node, path = []) => {
      if (!node || typeof node !== "object" || Array.isArray(node)) return;
      if ("$value" in node) { if (!paths.has(path.join("."))) throw new Error(`Media token ${path.join(".")} does not override a base token`); return; }
      for (const [part, child] of Object.entries(node)) if (!part.startsWith("$")) visit(child, [...path, part]);
    };
    own.forEach((tree) => visit(tree));
    return (await resolveLayers(modeLayers(query))).map((token) => {
      try { return entry(token); }
      catch (error) { throw new Error(`Media token: ${error.message}`); }
    });
  };

  const review = tokens.filter((token) => token.review);
  if (review.length && !preview) console.log(`${review.length} token${review.length === 1 ? " needs" : "s need"} review (flagged by an import): ${review.map((token) => token.path).join(", ")}`);
  if (base) {
    const byMode = { [modes.base]: tokens };
    for (const [query, layers] of Object.entries(media)) byMode[modes.media[query] ?? query] = await mediaTokens(layers);
    checkContract(byMode);
  }
  const contrast = await checkContrast(theme.contrast && contrastPairs(theme, tokens), { tokens, media, mediaTokens, names: modes });
  if (contrast.length && !preview) throw new Error(`Contrast check failed:\n${contrast.map((line) => `  ${line}`).join("\n")}`);

  // Every file a module reads, and every folder it lists, is an input the receipt holds.
  const reads = new Set();
  const folders = new Set();
  const scan = (dir) => { try { return [...new Bun.Glob("**/*").scanSync({ cwd: dir, dot: true })].sort().map((file) => `${dir}/${file}`); } catch { return []; } };
  const list = (dir) => { folders.add(dir); return scan(dir).map((path) => path.slice(dir.length + 1)); };
  const readExisting = async (path) => {
    try { const text = await readFile(path, "utf8"); reads.add(path); return text; }
    catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
  };
  // Every module's files, written or checked by the one loop below. A module reads the config with its resolved module
  // names as `targets`, so a sibling's place is found the same way whether a preset or a list named it.
  const outputs = [];
  // What an earlier target in this run made at a path (stamped, as written), so a later one reads it current.
  const built = (path) => outputs.find((output) => resolve(output.path) === resolve(path))?.content;
  const moduleConfig = { ...config, targets: modules.map((module) => module.name),
    ...Object.fromEntries(modules.map((module) => [module.name, withDefaults(module, config[module.name])])) };
  for (const module of modules.filter((each) => each.slot === "output")) {
    const base = { tokens, media, mediaTokens, config: moduleConfig, readExisting, list, built, ...kit,
      ...(kit.name && { title: theme.title ?? kit.name }), ...(modes && { modes }), ...(theme.modes && { theme }) };
    const files = await module.run({ ...base, render: (name) => render(name, base), options: optionsFor(module, base, config[module.name]) });
    outputs.push(...(kit.name ? stamp(files, kit, module.name) : files));
  }
  if (preview) {
    // Each mode's tokens by name, the base first, for breacan dev's panel.
    const byMode = { [modes?.base ?? "base"]: tokens };
    for (const [query, files] of Object.entries(media)) byMode[modes?.media[query] ?? query] = await mediaTokens(files);
    return { outputs, contrast, theme, modes: byMode };
  }
  // The inputs: the config, VERSION, every file in the kit folder and tokens/, the layers' files and what modules read.
  const candidates = [configFile, ...localImports(configFile), ...(theme.files ?? []), kit.name && "VERSION", ...(kit.root ? scan(kit.root) : []), ...scan("tokens"), ...[...folders].flatMap(scan)].filter(Boolean);
  const layerFiles = [...include, ...source, ...Object.values(media).flat()].map((layer) => layer.file).filter((file) => file && !file.startsWith("builtin:"));
  const inputs = [...candidates, ...layerFiles, ...(standard?.files ?? []), ...reads];
  const header = (output) => Boolean(kit.name && !output.shared && wantsHeader(output.path));
  if (check) {
    const held = await readReceipt();
    if (held !== undefined) {
      // Every input this build found is a candidate, globbed includes too, so one the receipt lacks is caught.
      const written = new Set(outputs.map((output) => resolve(output.path)));
      await checkReceipt(held, inputs.filter((path) => !written.has(resolve(path)) && existsSync(path)), outputs.map((output) => output.path));
      return outputs;
    }
    // No receipt yet (a kit last built by kumiko): every output must match a fresh build.
    for (const output of outputs) {
      const existing = await readExisting(output.path);
      if (header(output)) checkHeader(output.path, existing);
      if (existing !== output.content) throw new Error(`${output.path} is stale; run breacan`);
    }
    return outputs;
  }
  for (const { path, content } of outputs) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
  await writeFile(RECEIPT, await receipt({ engine: pkg.version, inputs, outputs, header }));
  return outputs;
};
