// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// DESIGN.md (Google's format, github.com/google-labs-code/design.md): replaces only the schema-supported front matter
// groups; name, description, other keys and the body stay. A kit on the role contract writes its roles: the colour
// roles by name, the fifteen type roles, the corners and the spacing scale, a component for each on-colour pair the
// contract names, and, when the file has no body yet, a body that states the usage rules. Any other project writes
// its tokens by their names.
import YAML from "yaml";
import { CORNERS, SPACING, TYPE_ROLES, contract, usage } from "../contract.mjs";

const COLOR = "md.sys.color.";
// The contract's roles, as DESIGN.md groups, from one mode's tokens.
const contractGroups = (byPath) => {
  const value = (path) => byPath.get(path)?.value;
  const colors = Object.fromEntries(contract().filter((path) => path.startsWith(COLOR) && byPath.has(path)).sort().map((path) => [path.slice(COLOR.length), value(path)]));
  const typography = Object.fromEntries(TYPE_ROLES.map((role) => {
    const at = (property) => value(`md.sys.typescale.${role}.${property}`);
    return [role, { fontFamily: String(at("font")).split(",")[0].replace(/["']/g, "").trim(), fontSize: at("size"), fontWeight: Number(at("weight")), lineHeight: at("line-height"), letterSpacing: at("tracking") }];
  }));
  const rounded = Object.fromEntries(CORNERS.map((corner) => [corner, value(`md.sys.shape.corner.${corner}`)]));
  const spacing = Object.fromEntries(Object.keys(SPACING).map((step) => [step, value(`breacan.sys.spacing.${step}`)]));
  // One component per fill an on-colour sits on (its first rule), and the scrim, so every colour is referenced.
  const components = {};
  for (const [path, rule] of Object.entries(usage())) {
    const fill = rule.on?.[0]?.slice(COLOR.length);
    if (!fill || components[fill] || !byPath.has(path) || !byPath.has(rule.on[0])) continue;
    components[fill] = { backgroundColor: `{colors.${fill}}`, textColor: `{colors.${path.slice(COLOR.length)}}` };
  }
  for (const [fill, text] of [["surface-variant", "on-surface-variant"], ["background", "on-background"], ["inverse-surface", "inverse-on-surface"]]) {
    if (colors[fill] && colors[text]) components[fill] = { backgroundColor: `{colors.${fill}}`, textColor: `{colors.${text}}` };
  }
  if (colors.scrim) components.scrim = { backgroundColor: "{colors.scrim}" };
  return { colors, typography, rounded, spacing, components };
};

// The body a contract kit starts with: what each group is for, and its usage rules as do's and don'ts.
const contractBody = (title, groups) => {
  const rules = Object.entries(usage());
  const name = (path) => `\`${path.slice(COLOR.length)}\``;
  return `
## Overview

${title}, built by Breacán on its role contract. The tokens above are the kit's base mode; read the kit's resolver for the others.

## Colors

- **Accents:** ${["primary", "secondary", "tertiary", "error"].filter((role) => groups.colors[role]).map((role) => `\`${role}\` (${groups.colors[role]})`).join(", ")}. Each carries text in its \`on-\` colour, and its container carries text in its \`on-…-container\` colour.
- **Surfaces:** \`surface\` is the page; the \`surface-container\` steps rise from \`-lowest\` to \`-highest\`. Text on them is \`on-surface\`, quieter text \`on-surface-variant\`.

## Typography

Fifteen roles, display, headline, title, body and label, each large, medium and small. Body text is \`body-medium\`.

## Layout

Space in the spacing scale's steps (${Object.entries(groups.spacing).map(([step, size]) => `${step}: ${size}`).join(", ")}); never a value between them.

## Shapes

Corners from \`none\` to \`full\`; a component takes the step its kind uses, never a radius of its own.

## Do's and Don'ts

${rules.filter(([, rule]) => rule.on).map(([path, rule]) => `- Do put ${name(path)} only on ${rule.on.map(name).join(", ")}.`).join("\n")}
${rules.filter(([, rule]) => rule.properties).map(([path, rule]) => `- Don't use ${name(path)} for anything but ${rule.properties.join(", ")}.`).join("\n")}
- Don't hand-type a colour, size, radius or duration the kit defines; \`breacan lint\` flags it.
`;
};

export default {
  slot: "output",
  name: "design-md",
  reads: ["tokens"],
  writes: { path: "DESIGN.md" },
  async run({ tokens, options, readExisting, title, name }) {
    const { path } = options;
    const current = await readExisting(path) ?? "";
    const match = current.startsWith("---")
      ? current.match(/^---\r?\n([\s\S]*?)^---(?:\r?\n|$)/m) : null;
    if (current.startsWith("---") && !match) throw new Error(`Unclosed ${path} frontmatter`);
    const document = YAML.parseDocument(match ? match[1] : "");
    if (document.errors.length) throw new Error(`Invalid ${path} frontmatter: ${document.errors[0].message}`);
    document.contents ??= new YAML.YAMLMap();
    const existing = document.toJS();
    if (existing !== null && (typeof existing !== "object" || Array.isArray(existing))) {
      throw new Error(`Invalid ${path} frontmatter: expected a mapping`);
    }
    const byPath = new Map(tokens.map((token) => [token.path, token]));
    const contract = byPath.has(`${COLOR}primary`);
    const frontmatter = contract ? contractGroups(byPath) : { colors: {}, typography: {}, rounded: {}, spacing: {} };
    if (contract && !document.has("name")) document.set("name", title ?? name);
    for (const token of contract ? [] : tokens) {
        const slug = (token.segments.length > 1 && ["color", "colors", "typography"].includes(token.segments[0])
        ? token.segments.slice(1) : token.segments).join("-");
      if (token.type === "color") frontmatter.colors[slug] = token.value;
      if (token.type === "typography") frontmatter.typography[slug] = token.typography;
      if (token.type === "dimension") {
        const radiusAt = token.segments.findIndex((part) => ["radius", "rounded"].includes(part));
        const spaceAt = token.segments.findIndex((part) => ["space", "spacing"].includes(part));
        if (radiusAt >= 0) frontmatter.rounded[token.segments.slice(radiusAt + 1).join("-")] = token.value;
        else if (spaceAt >= 0) frontmatter.spacing[token.segments.slice(spaceAt + 1).join("-")] = token.value;
      }
    }
    for (const group of Object.keys(frontmatter)) {
      if (Object.keys(frontmatter[group]).length) document.setIn([group], frontmatter[group]);
    }
    document.deleteIn(["tokens"]);
    const body = match ? current.slice(match[0].length) : current;
    if (contract && !body.trim()) return [{ path, shared: true, content: `---\n${document.toString({ lineWidth: 0 })}---\n${contractBody(title ?? name ?? "This kit", frontmatter)}` }];
    return [{ path, shared: true, content: `---\n${document.toString({ lineWidth: 0 })}---\n${body}` }];
  },
};
