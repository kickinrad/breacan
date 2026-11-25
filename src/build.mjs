// DTCG 2025.10 tokens/*.tokens.json is the only value source. The engine loads and stacks the layers, resolves
// them, runs the config's modules (src/modules.mjs) and writes or checks their files.
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
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
import { platformLayers } from "./dial.mjs";
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

// `preview` (breacan edit): read theme.toml from `theme` (its text) and a tokens file from `drafts` (path to text), write
// nothing, and return contrast failures beside the outputs instead of failing on them. `configFile` is the config's path, an input the receipt holds; by default
// the one in this directory.
export const build = async (config = {}, { check = false, refresh = false, preview = false, theme: themeText, drafts = {},
  configFile = existsSync("breacan.config.mjs") ? "breacan.config.mjs" : undefined } = {}) => {
  const modules = resolveModules(config);
  // Sources, then foundations: each gives { light, dark } colour trees over the base.
  const foundations = ["source", "foundation"].flatMap((slot) => modules.filter((module) => module.slot === slot));
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
  // Every file a module reads, and every folder it lists, is an input the receipt holds; a source reads its own through `read`.
  const reads = new Set();
  const read = async (path) => { const text = await readFile(path, "utf8"); reads.add(path); return text; };
  const engines = await Promise.all(foundations.map(async (module) => module.run({ options: optionsFor(module, {}, config[module.name]), refresh, read })));
  const schemeQuery = Object.keys(media).find((query) => /prefers-color-scheme:\s*(light|dark)/.test(query));
  if (base && !modes) {
    modes = { base: "light", media: { "(prefers-color-scheme: dark)": "dark" } };
    media["(prefers-color-scheme: dark)"] = [];
  }
  const baseScheme = /prefers-color-scheme:\s*light/.test(schemeQuery ?? "") ? "dark" : "light";
  if (base) {
    const query = schemeQuery ?? "(prefers-color-scheme: dark)";
    const other = baseScheme === "dark" ? "light" : "dark";
    media[query]?.unshift({ tree: colours(other), file: "builtin:base" }, ...engines.map((engine, i) => ({ tree: engine[other], file: `module:${foundations[i].name}` })));
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
      ...engines.map((engine, i) => ({ tree: engine[baseScheme], file: `module:${foundations[i].name}` })));
  }
  include.unshift(...builtins);
  if (theme.tree) include.push({ tree: theme.tree, file: "theme.toml" });
  if (standard) include.push({ tree: standard.tree, file: `tokens/${resolvers[0]}` });
  const source = baseFiles.map((file) => ({ file, strict: true, ...(file in drafts && { tree: JSON.parse(drafts[file]) }) }));
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
  const collect = (node, path = [], into = own) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    if ("$value" in node) return into.add(path.join("."));
    for (const [key, child] of Object.entries(node)) if (!key.startsWith("$")) collect(child, [...path, key], into);
  };
  for (const layer of [...include, ...source, ...Object.values(media).flat()]) {
    if (!layer.file?.startsWith("builtin:")) collect(layer.tree ?? await readTokens(layer.file));
  }
  const mark = (token) => own.has(token.path) ? token : { ...token, builtin: true };
  const tokens = resolved.map(entry).map(mark);
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

  // Resolve each platform after each mode's theme layers, so the dial's selected language values win in both modes.
  const platforms = {};
  // A language is told each mode's colour scheme: the kit names its modes, but a mode's media query says light or dark,
  // and the base mode takes the opposite of the scheme query's.
  const schemeOf = (query, name) => {
    const scheme = /prefers-color-scheme:\s*(light|dark)/.exec(query)?.[1];
    if (!scheme) throw new Error(`platforms need each mode's colour scheme, and the mode ${name} has no prefers-color-scheme media query`);
    return scheme;
  };
  const schemes = config.platforms ? Object.fromEntries(Object.keys(media).map((query) => [query, schemeOf(query, modes?.media?.[query] ?? query)])) : {};
  // Each mode's primary colour is the tint on that mode's system chrome.
  const tintOf = (set) => set.find((token) => token.path === "md.sys.color.primary")?.value;
  const tints = config.platforms ? Object.fromEntries(await Promise.all(Object.keys(media).map(async (query) => [query, tintOf(await mediaTokens(media[query]))]))) : {};
  // The playground's columns: the Breacán-neutral base alone (Material's spec, the shared scales and one scheme's colours,
  // and the colour engine when the kit has one), and with a platform's language over it at Native, resolved in each mode
  // as a platform is (`columns.base`, and `native` on each platform).
  const neutral = (scheme) => [{ tree: material.tokens(), file: material.name }, { tree: shared(), file: "builtin:base" }, { tree: colours(scheme), file: "builtin:base" },
    ...engines.map((engine, i) => ({ tree: engine[scheme], file: `module:${foundations[i].name}` }))];
  const schemeIn = (query) => /prefers-color-scheme:\s*(light|dark)/.exec(query)?.[1] ?? baseScheme;
  const column = async (layersFor) => {
    const mine = new Set();
    const at = async (mode, scheme, tint) => {
      const extra = layersFor ? await layersFor({ mode, scheme, tint }) : [];
      for (const layer of extra) collect(layer.tree, [], mine);
      return (await resolveLayers([...neutral(scheme), ...extra])).map(entry).map((token) => mine.has(token.path) ? token : { ...token, builtin: true });
    };
    const result = { tokens: await at(modes?.base, baseScheme, tintOf(tokens)), media: {} };
    for (const query of Object.keys(media)) result.media[modes?.media?.[query] ?? query] = await at(modes?.media?.[query], schemeIn(query), tints[query]);
    return result;
  };
  const columns = modules.some((module) => module.name === "playground") ? { base: await column() } : undefined;
  for (const { platform, level, layersFor, nativeFor } of await platformLayers(config.platforms)) {
    const ownHere = new Set(own);
    const baseLayers = await layersFor({ mode: modes?.base, scheme: baseScheme, tint: tintOf(tokens) });
    for (const layer of baseLayers) collect(layer.tree, [], ownHere);
    const markHere = (token) => ownHere.has(token.path) ? token : { ...token, builtin: true };
    const platformModes = {};
    for (const [query] of Object.entries(media)) {
      const layers = await layersFor({ mode: modes?.media?.[query], scheme: schemes[query], tint: tints[query] });
      for (const layer of layers) collect(layer.tree, [], ownHere);
      platformModes[modes?.media?.[query] ?? query] = (await resolveLayers([...modeLayers(query), ...layers])).map(entry).map(markHere);
    }
    platforms[platform] = { level, tokens: (await resolveLayers([...include, ...source, ...baseLayers])).map(entry).map(markHere), media: platformModes, ...(columns && { native: await column(nativeFor) }) };
  }

  const review = tokens.filter((token) => token.review);
  if (review.length && !preview) console.log(`${review.length} token${review.length === 1 ? " needs" : "s need"} review (flagged by an import): ${review.map((token) => token.path).join(", ")}`);
  if (base) {
    const byMode = { [modes.base]: tokens };
    for (const [query, layers] of Object.entries(media)) byMode[modes.media[query] ?? query] = await mediaTokens(layers);
    checkContract(byMode);
  }
  const pairs = theme.contrast && contrastPairs(theme, tokens);
  const contrast = await checkContrast(pairs, { tokens, media, mediaTokens, names: modes });
  // Each platform's resolved modes meet the same floors, so a language's colours can't slip under them.
  for (const [platform, each] of Object.entries(platforms)) {
    const byQuery = Object.fromEntries(Object.keys(media).map((query) => [query, each.media[modes?.media?.[query] ?? query]]));
    contrast.push(...(await checkContrast(pairs, { tokens: each.tokens, media: byQuery, mediaTokens: (set) => set, names: modes })).map((line) => `platform ${platform}: ${line}`));
  }
  if (contrast.length && !preview) throw new Error(`Contrast check failed:\n${contrast.map((line) => `  ${line}`).join("\n")}`);

  // An output module's reads and lists join them.
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
      ...(kit.name && { title: theme.title ?? kit.name }), ...(modes && { modes }), ...(theme.modes && { theme }), ...(config.platforms && { platforms }), ...(columns && { columns }) };
    const files = await module.run({ ...base, render: (name) => render(name, base), options: optionsFor(module, base, config[module.name]) });
    outputs.push(...(kit.name ? stamp(files, kit, module.name) : files));
  }
  if (preview) {
    // Each mode's tokens by name, the base first, for breacan edit's panel.
    const byMode = { [modes?.base ?? "base"]: tokens };
    for (const [query, files] of Object.entries(media)) byMode[modes?.media[query] ?? query] = await mediaTokens(files);
    return { outputs, contrast, theme, modes: byMode };
  }
  // The inputs: the config, VERSION, every file in the kit folder and tokens/, the layers' files and what modules read.
  const candidates = [configFile, ...(theme.files ?? []), kit.name && "VERSION", ...(kit.root ? scan(kit.root) : []), ...scan("tokens"), ...[...folders].flatMap(scan)].filter(Boolean);
  const layerFiles = [...include, ...source, ...Object.values(media).flat()].map((layer) => layer.file).filter((file) => file && !file.startsWith("builtin:") && !file.startsWith("module:"));
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
    // No receipt yet (a kit last built before receipts): every output must match a fresh build. A file this engine writes
    // that is not there at all is one the last build never wrote, so it is named, not failed; the next build adds it.
    for (const output of outputs) {
      const existing = await readExisting(output.path);
      if (existing === undefined) { console.log(`${output.path} is new in breacan; run breacan build to add it`); continue; }
      if (header(output)) checkHeader(output.path, existing);
      if (existing !== output.content) throw new Error(`${output.path} is stale; run breacan build`);
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
