// A website's look. Dembrandt (MIT) renders the page in Chromium and reads its computed styles; the colours, fonts,
// corner radii and spacing it finds become primitives under `site`, each marked `needs-review` for a person to
// confirm. Only what it elects with confidence fills roles: its primary, secondary and accent colours seed a colour
// engine, and its heading and body fonts become the brand and plain typefaces. The base fills every other role.
// The values are read once into a snapshot file in the kit, which every later build reads (`breacan build --refresh`
// reads the page again). It drives the Chrome `breacan audit` finds: $CHROME, else one on the PATH, else Playwright's.
// Options: url, snapshot (the file's path, `design/site.json`), engine (`leonardo`, the default, or `material`).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { chrome } from "../render.mjs";
import { engineOf, seeded } from "./seeded.mjs";

const REVIEW = { "com.kickinrad.breacan": { "needs-review": true } };
const flag = (type, $value) => ({ $type: type, $value, $extensions: REVIEW });
const px = (value) => flag("dimension", { value, unit: "px" });
const hexOf = (css) => {
  const rgb = css?.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  return rgb ? `#${rgb.slice(1, 4).map((part) => Number(part).toString(16).padStart(2, "0")).join("")}` : /^#[0-9a-f]{6}$/i.test(css ?? "") ? css.toLowerCase() : undefined;
};
const numbered = (items) => Object.fromEntries(items.map((item, i) => [i + 1, item]));
// Whole pixels, each named by its value (a name cannot hold a dot): 19.92 and 20 are one step.
const byValue = (values) => Object.fromEntries([...new Set(values.map(Math.round))].filter((value) => value > 0).sort((a, b) => a - b).map((value) => [value, px(value)]));
// The most used family among the styles whose context starts with `context`.
const family = (styles, context) => styles.filter((style) => style.context.startsWith(context) && style.family).sort((a, b) => b.count - a.count)[0]?.family;

// What a build keeps of a page: only what the tokens below read, as plain values, so the file reads in a diff.
const snapshotOf = (url, found) => {
  const { semantic = {}, palette = [] } = found.colors;
  const styles = found.typography.styles;
  return {
    url,
    seeds: [...new Set([semantic.primary, semantic.secondary, semantic.accent].map(hexOf).filter(Boolean))].slice(0, 3),
    colors: [...new Set(palette.map((colour) => hexOf(colour.normalized)).filter(Boolean))],
    fonts: [...new Set(styles.map((style) => style.family).filter(Boolean))],
    brand: family(styles, "heading"),
    plain: family(styles, "body"),
    radii: found.borderRadius.values.map((radius) => radius.numericValue),
    spacing: found.spacing.commonValues.map((space) => space.numericValue),
  };
};

// shortcut: dembrandt prints its progress, and a redirect warning, with console.log; it is silenced while it runs,
// until dembrandt takes a writer of its own.
const extract = async (url) => {
  const { chromium } = await import("playwright-core");
  const { extractBranding } = await import("dembrandt/extractors");
  const spinner = new Proxy({}, { get: (_, key) => (key === "text" ? "" : () => spinner) });
  const browser = await chromium.launch({ executablePath: chrome() });
  const log = console.log;
  console.log = () => {};
  try { return snapshotOf(url, await extractBranding(url, spinner, browser, {})); } finally { console.log = log; await browser.close(); }
};

export default {
  slot: "source",
  name: "site",
  reads: [],
  writes: {},
  async run({ options, refresh, read }) {
    const { url, snapshot = "design/site.json" } = options;
    if (typeof url !== "string" || !/^https?:\/\//.test(url)) throw new Error('site option "url" must be an http or https address');
    engineOf("site", options);
    // The page is read once and kept: a build reads the snapshot, so the same kit builds the same offline, and the
    // network is touched only when the snapshot is missing or a refresh is asked for.
    if (refresh || !existsSync(snapshot)) {
      mkdirSync(dirname(snapshot), { recursive: true });
      writeFileSync(snapshot, `${JSON.stringify(await extract(url), null, 2)}\n`);
    }
    const kept = JSON.parse(await read(snapshot));
    if (kept.url !== url) throw new Error(`site: ${snapshot} holds ${kept.url}, not ${url}; run breacan build --refresh`);
    const extra = {
      site: {
        color: numbered(kept.colors.map((hex) => flag("color", hex))),
        font: numbered(kept.fonts.map((name) => flag("fontFamily", name))),
        radius: byValue(kept.radii),
        space: byValue(kept.spacing),
      },
      ...((kept.brand || kept.plain) && { md: { ref: { typeface: { ...(kept.brand && { brand: { $type: "fontFamily", $value: kept.brand } }), ...(kept.plain && { plain: { $type: "fontFamily", $value: kept.plain } }) } } } }),
    };
    return seeded("site", options, kept.seeds, extra);
  },
};
