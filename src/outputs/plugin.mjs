// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// Plugin: the kit's agent plugin, one directory that Claude Code and Codex both install, written under options.path:
// .claude-plugin/plugin.json (the manifest) and, beside the kit's own skills/<name>/SKILL.md, its references:
// components.md (each component with its Material 3 guidance and, with a beer output, Beer's markup), DESIGN.md (the
// roles and their rules, for a kit on the contract), breacan.rules.json (the lint config `breacan lint --rules`
// reads), notes.md and theme.toml (the kit's own, when it has them) and index.md, which lists them. The kit writes
// SKILL.md itself, so its wording changes with the kit, not with the engine; Breacán starts one when there is none.
// Options: path (a directory); optional description (the manifest's one line, which by default says the plugin builds
// UI on the kit), repository (a URL, where the kit's files are) and author ({ name, email?, url? }).
import { join } from "node:path";
import specimens from "../web/components.js";
import { text } from "../header.mjs";

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const M3 = "https://m3.material.io/";
const BEER_DOCS = "https://github.com/beercss/beercss/blob/main/docs/";

const guidance = (m3) => m3 ? `[Material 3](${M3}${m3.includes("/") ? m3 : `components/${m3}/overview`})` : "";

export default {
  slot: "output",
  name: "plugin",
  reads: ["tokens", "kit"],
  writes: { path: null },
  async run(ctx) {
    const { options, config, readExisting, root, name, version, title } = ctx;
    const dir = options.path;
    if (options.description !== undefined && (typeof options.description !== "string" || !options.description.trim())) throw new Error("plugin's description must be a non-empty string");
    if (!NAME.test(name) || name.length > 64) throw new Error(`plugin needs a kit name in kebab-case of at most 64 characters, not "${name}"`);
    const skillDir = join(dir, "skills", name);
    const skill = await readExisting(join(skillDir, "SKILL.md"));
    const notes = await readExisting(join(root, "notes.md"));
    const themeToml = await readExisting(join(root, "theme.toml"));
    const onContract = ctx.tokens.some((token) => token.path === "md.sys.color.primary") && ctx.tokens.some((token) => token.path === "breacan.sys.touch-min");

    const targets = config.targets.filter((target) => typeof target === "string");
    const material = (config.include ?? []).some((each) => each === "builtin:material" || each === "builtin:base") || onContract;
    const web = targets.includes("beer");
    const components = `# ${title}'s components

The components the kit themes, in ${material ? "Material 3's" : "their"} families.${web ? " On the web each is Beer CSS's markup on the kit's theme." : ""}${targets.includes("playground") ? ` The playground (\`${config.playground?.path}/\`) shows each live.` : ""}

| Component | Family |${material ? " Guidance |" : ""}${web ? " Web markup |" : ""}
| --- | --- |${material ? " --- |" : ""}${web ? " --- |" : ""}
${specimens.filter((item) => web || item.m3).map((item) => `| ${item.name} | ${item.family} |${material ? ` ${guidance(item.m3) || "none in Material 3"} |` : ""}${web ? ` [Beer ${item.doc}](${BEER_DOCS}${item.doc}.md) |` : ""}`).join("\n")}
`;

    const manifest = {
      name,
      description: options.description ?? `Build UI on the ${title} kit: its rules, components and token names.`,
      ...(options.author && { author: options.author }),
      ...(options.repository && { repository: options.repository }),
      keywords: [name, ...(material ? ["material-3"] : []), "design-system", "ui"],
    };

    const references = [
      ["components.md", "each component the kit themes, with its guidance", components],
      ...(onContract ? [["DESIGN.md", "the kit's roles and values, and the rules for using them", await ctx.render("design-md")]] : []),
      ["breacan.rules.json", "the lint config: run `breacan lint --rules <this file> <paths>` on the code you change", await ctx.render("rules")],
      ...(notes === undefined ? [] : [["notes.md", "the kit's own rules", notes]]),
      // TOML has comments, so the copy carries the header the stamp gives the formats it knows.
      ...(themeToml === undefined ? [] : [["theme.toml", "the kit's values as it writes them", `# ${text({ name, version }, "plugin")}\n${themeToml}`]]),
    ];
    const index = `# ${title}'s references\n\n${references.map(([file, purpose]) => `- [${file}](${file}): ${purpose}.`).join("\n")}\n`;
    const starter = `---\nname: ${name}\ndescription: Build UI on the ${title} kit. Use when building or changing any UI in a project that uses ${title}.\n---\n\n# ${title}\n\nBuild with the kit's tokens, never a value of your own. Read [references/index.md](references/index.md) first, then the reference the work needs. Before you finish, run \`breacan lint --rules references/breacan.rules.json\` (from this folder's path) on the files you changed, and fix every finding.\n`;
    return [
      { path: join(dir, ".claude-plugin/plugin.json"), content: `${JSON.stringify(manifest, null, 2)}\n` },
      { path: join(skillDir, "references/index.md"), content: index },
      ...references.map(([file, , content]) => ({ path: join(skillDir, "references", file), content, ...(file === "DESIGN.md" && { shared: true }) })),
      // The kit's own skill wins; with none, a starter it can take over (no header, since the kit then owns it).
      ...(skill === undefined ? [{ path: join(skillDir, "SKILL.md"), content: starter, shared: true }] : []),
    ];
  },
};
