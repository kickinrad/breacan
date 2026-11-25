// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// Columns: one specimen screen in four sets of variables, side by side: the base alone, the theme (the kit's own
// look), a platform's language alone at Native, and the kit on that platform at its own dial. Each column is the
// same markup under its own style attribute, the variables the css output writes for that set in the shown mode
// (the page's data, columns), so a difference between columns is a difference between token sets and nothing else.
// Beer's own variables map from the kit's on :root, where a column's would not reach them, so each column sets them again.
import { appBar, button, card, chip, field, iconButton, list, listItem, row, switchRow } from "./components.js";
import { esc, scheme } from "./playground.js";

// The screen every column shows: the page's own builders, so it draws as the kit's components do.
const specimen = () => `${appBar("Specimen", { actions: [iconButton("search", "Search")] })}<div class="padding">
${card("filled", `<h5>Mountain loop</h5><p>12 km, moderate. Best before noon.</p>${row(chip("Hiking", { icon: "hiking" }), chip("Views"))}<nav>${button("Save", "text")}${button("Directions", "tonal")}</nav>`)}
<div class="space"></div>${field("Search", { prefix: "search" })}
${list([listItem({ icon: "description", headline: "Budget", supporting: "Edited today", trailing: "2 MB" }), listItem({ avatar: "A", headline: "Ada", supporting: "Lunch on Thursday?", trailing: "9:41" })])}
${switchRow("Notifications", "Tell me about replies", { checked: true })}
<nav>${button("Filled")}${button("Outlined", "outlined")}</nav></div>`;

// The platform picker's chips, where the kit lists more than one platform.
const picker = (platforms, chosen) => Object.keys(platforms).length < 2 ? "" : `${row(...Object.keys(platforms).map((name) =>
  `<button class="chip${name === chosen ? " fill" : ""}" data-platform="${esc(name)}"><span>${esc(name)}</span></button>`))}<div class="space"></div>`;

export const columns = (data, mode, platform) => {
  const { base, theme, platforms = {} } = data.columns;
  const chosen = platforms[platform] ? platform : Object.keys(platforms)[0];
  const on = chosen && platforms[chosen];
  const shown = [
    ["Base", "The neutral base alone", base, true],
    ["Theme", "The base with the kit's own look", theme],
    ...(on ? [["Platform", `${chosen} at Native`, on.native, true], ["Kit", `${chosen} at ${on.level}`, on.kit, true]] : []),
  ];
  const colorScheme = `color-scheme: ${scheme(data.modes[mode])};`;
  const font = "font-family: var(--md-sys-typescale-body-medium-font); font-size: var(--md-sys-typescale-body-medium-size); line-height: var(--md-sys-typescale-body-medium-line-height);";
  const width = shown.length > 2 ? "s12 m6 l3" : "s12 m6";
  return `${picker(platforms, chosen)}<div class="grid">${shown.map(([name, caption, set, other]) =>
    `<section class="${width}"><h6 class="small no-margin">${name}</h6><p class="small-text no-margin">${esc(caption)}</p><div class="small-space"></div><div class="surface border"${other ? " data-other-set" : ""} style="${esc([colorScheme, ...set[mode], ...data.columns.beer, font, "overflow: hidden; border-radius: var(--md-sys-shape-corner-large);"].join(" "))}">${specimen()}</div></section>`).join("")}</div>`;
};
