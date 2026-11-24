// breacan edit: serves the project on localhost (/ opens the playground, when the config has one) and the Kit panel,
// builds every edit in memory as the engine builds it, and pushes the result live to every page that listens to
// /_breacan/events. Save writes the edits into the kit's token files (theme.toml, else the colours of tokens/*.tokens.json),
// one changed value each, and rebuilds; a change to the kit's sources on disk rebuilds every output and sends "reload".
// `breacan dev` is a hidden alias for it, until the contract task removes aliases.
import { existsSync, watch } from "node:fs";
import { readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve, sep } from "node:path";
import { build } from "./build.mjs";
import { contrastPairs } from "./checks/contrast.mjs";
import { setValue } from "./toml-edit.mjs";
import { colours, setToken } from "./token-edit.mjs";
import { fontLinks, iconLink } from "./web/foundations.js";
import { bundle, inline, source } from "./outputs/playground.mjs";

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" };
const NO_STORE = { "Cache-Control": "no-store" };

// Watches each source folder for changes. An optional folder that is not there is skipped; any other failure to watch
// is reported, since edits on disk would otherwise go unseen.
export const watchSources = (sources, changed, report = (dir, error) => console.error(`breacan edit: not watching ${dir}: ${error.message}`)) => {
  for (const { dir, optional } of sources) {
    try {
      watch(dir, changed).on("error", (error) => report(dir, error));
    } catch (error) {
      if (!(optional && error.code === "ENOENT")) report(dir, error);
    }
  }
};

export const edit = async ({ config, port = 4400 }) => {
  const root = await realpath(resolve("."));
  const kitRoot = resolve(config.kit?.root ?? "design");
  const themeFile = join(kitRoot, "theme.toml");
  const cssPath = config.css?.path;
  if (!config.kit || !cssPath) throw new Error("breacan edit needs a kit and a css output");
  const hasTheme = existsSync(themeFile);
  const output = (outputs, path) => outputs.find((each) => resolve(each.path) === resolve(path))?.content;

  let edits = {};
  let live;
  const clients = new Set();
  const send = (event, data) => { for (const client of clients) client.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };

  // The files the edits reach: theme.toml, else the tokens files that a build reads as they are (none when a resolver
  // governs tokens/). `draft` is the text of each file an edit changes, with the edits applied.
  const tokenFiles = async () => {
    const listed = (await readdir("tokens").catch(() => [])).sort();
    return listed.some((file) => file.endsWith(".resolver.json")) ? [] : listed.filter((file) => file.endsWith(".tokens.json")).map((file) => `tokens/${file}`);
  };
  const draft = async () => {
    const files = hasTheme ? [themeFile] : await tokenFiles();
    const saved = Object.fromEntries(await Promise.all(files.map(async (file) => [file, await readFile(file, "utf8")])));
    const changed = {};
    for (const [path, value] of Object.entries(edits)) {
      const file = hasTheme ? themeFile : files.find((each) => colours(JSON.parse(saved[each])).includes(path));
      if (!file) throw new Error(`${path} is not a colour a tokens file sets`);
      changed[file] = hasTheme ? setValue(changed[file] ?? saved[file], path, value) : setToken(changed[file] ?? saved[file], path, value);
    }
    return { changed, colors: hasTheme ? undefined : files.flatMap((file) => colours(JSON.parse(saved[file]))) };
  };
  // The saved kit with the edits applied, built in memory: the css output and its faces, the kit as a panel reads it
  // (each mode's tokens, what the kit's files set that a person tunes, the pairs it is held to), and the pairs that fall
  // under their floors.
  const preview = async () => {
    const { changed, colors } = await draft();
    const { outputs, contrast, theme, modes } = await build(config, { preview: true, theme: changed[themeFile], drafts: changed });
    const kit = {
      name: theme.name ?? config.kit.name,
      modes: Object.fromEntries(Object.entries(modes).map(([mode, tokens]) => [mode, tokens.map(({ path, value, type }) => ({ path, value, type }))])),
      tune: { faces: theme.faces, colors, tokens: (theme.values ?? []).filter(([path, each]) => path.startsWith(`${theme.name}.`) && ["dimension", "duration"].includes(each.$type) && !String(each.$value).startsWith("{")).map(([path]) => path) },
      pairs: theme.contrast ? contrastPairs(theme, Object.values(modes)[0]) : undefined,
    };
    live = { css: output(outputs, cssPath), fonts: [...new Set(Object.values(modes).flatMap(fontLinks))], kit, contrast, edits };
    send("live", live);
    return { changed, contrast };
  };
  // Writes every output from the files on disk.
  const rebuild = async () => { await build(config); edits = {}; await preview(); };

  await rebuild();
  // A change on disk (the kit's folder, tokens/) rebuilds and tells every listener to reload. A file as Save last wrote
  // it is already built, so the server's own write reloads nothing; once the file holds anything else, every later
  // change rebuilds, a revert to the saved text included.
  let pending;
  const wrote = new Map();
  const onDisk = async (_, file) => {
    const own = wrote.get(file);
    if (own) {
      if ((await readFile(own.path, "utf8").catch(() => undefined)) === own.text) return;
      wrote.delete(file);
    }
    clearTimeout(pending);
    pending = setTimeout(() => rebuild().then(() => send("reload", {}), (error) => send("problem", { message: error.message })), 100);
  };
  watchSources([{ dir: kitRoot, optional: true }, { dir: resolve("tokens"), optional: true }], onDisk);

  // The panel's page: the kit's draft css (replaced live), the panel's stylesheet on the kit's variables, its client.
  const panel = async () => {
    const color = await source("../color.mjs");
    const client = await Promise.all(["panel.js", "tune.js", "foundations.js"].map(async (file) => [file, await source(`../web/${file}`)]));
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kit</title>
<link rel="stylesheet" href="${iconLink("Material Symbols Outlined")}">
<style id="kit-css">\n${inline(live.css)}</style>
<style>\n${inline(await source("../web/panel.css"))}</style>
</head>
<body>
<div id="app"></div>
<script type="module">\n${inline(await bundle(client, color, "panel.js"))}</script>
</body>
</html>
`;
  };

  const json = (body, status = 200) => Response.json(body, { status, headers: NO_STORE });
  // A write from this page only: the browser sends Origin on a cross-site POST, and a JSON body needs a preflight this
  // server never grants, so no other site can edit or save.
  const ours = (request) => request.headers.get("origin") === `http://${request.headers.get("host")}` && request.headers.get("content-type") === "application/json";

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port,
    async fetch(request, server) {
      // Every route answers only to this server's loopback name. A DNS-rebinding page (its own name pointed at
      // 127.0.0.1) sends its own name as Host, so it can neither read the kit and the project's files nor write.
      const host = request.headers.get("host");
      if (!["127.0.0.1", "localhost"].some((name) => host === `${name}:${server.port}`)) return new Response("Unknown host", { status: 403 });
      const url = new URL(request.url);
      if (url.pathname === "/" && config.playground?.path) return Response.redirect(`/${config.playground.path.replace(/^\.?\//, "")}/index.html`, 302);
      if (url.pathname === "/_breacan/live") return json(live);
      if (url.pathname === "/_breacan/panel") return new Response(await panel(), { headers: { ...NO_STORE, "Content-Type": "text/html" } });
      if (url.pathname === "/_breacan/events") {
        // An event stream stays open while idle; Bun closes idle requests after 10s otherwise.
        server.timeout(request, 0);
        let client;
        return new Response(new ReadableStream({
          start(controller) { client = controller; clients.add(client); controller.enqueue(": breacan\n\n"); },
          cancel() { clients.delete(client); },
        }), { headers: { ...NO_STORE, "Content-Type": "text/event-stream" } });
      }
      if (url.pathname === "/_breacan/edit" && request.method === "POST") {
        if (!ours(request)) return json({ error: "Edits come from a page this server serves" }, 403);
        const before = edits;
        try {
          // { path: value } for every value the page has changed; a value of null drops that edit.
          edits = Object.fromEntries(Object.entries({ ...edits, ...(await request.json()) }).filter(([, value]) => value !== null));
          return json({ contrast: (await preview()).contrast });
        } catch (error) {
          edits = before;
          return json({ error: error.message }, 400);
        }
      }
      if (url.pathname === "/_breacan/save" && request.method === "POST") {
        if (!ours(request)) return json({ error: "Saves come from a page this server serves" }, 403);
        try {
          const { changed, contrast } = await preview();
          if (contrast.length) return json({ error: `Not saved: ${contrast.length} pair${contrast.length === 1 ? " is" : "s are"} under its floor`, contrast }, 409);
          const saved = Object.keys(edits);
          for (const [path, text] of Object.entries(changed)) {
            wrote.set(basename(path), { path, text });
            await writeFile(path, text);
          }
          await rebuild();
          return json({ saved });
        } catch (error) {
          return json({ error: error.message }, 400);
        }
      }
      // The project's own files, nothing outside it: the boundary holds on the real path, so a symlink cannot lead out.
      const file = await realpath(resolve(root, `.${decodeURIComponent(url.pathname)}`)).catch(() => "");
      if (!file.startsWith(root + sep)) return new Response("Not found", { status: 404 });
      const body = Bun.file(file);
      if (!(await body.exists())) return new Response("Not found", { status: 404 });
      return new Response(body, { headers: { "Content-Type": TYPES[extname(file)] ?? body.type, "Cache-Control": "no-store" } });
    },
  });
  return server;
};
