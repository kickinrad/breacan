// A website's look. Dembrandt (MIT) renders the page in Chromium and reads its computed styles; the colours, fonts,
// corner radii and spacing it finds become primitives under `site`, each marked `needs-review` for a person to
// confirm. Only what it elects with confidence fills roles: its primary, secondary and accent colours seed a colour
// engine, and its heading and body fonts become the brand and plain typefaces. The base fills every other role.
// Options: url, engine (`leonardo`, the default, or `material`). It drives the Chrome `breacan audit` finds:
// $CHROME, else one on the PATH, else Playwright's download.
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

// shortcut: dembrandt prints its progress, and a redirect warning, with console.log; it is silenced while it runs,
// until dembrandt takes a writer of its own.
const extract = async (url) => {
  const { chromium } = await import("playwright-core");
  const { extractBranding } = await import("dembrandt/extractors");
  const spinner = new Proxy({}, { get: (_, key) => (key === "text" ? "" : () => spinner) });
  const browser = await chromium.launch({ executablePath: chrome() });
  const log = console.log;
  console.log = () => {};
  try { return await extractBranding(url, spinner, browser, {}); } finally { console.log = log; await browser.close(); }
};

export default {
  slot: "source",
  name: "site",
  reads: [],
  writes: {},
  async run({ options, check }) {
    const { url } = options;
    if (typeof url !== "string" || !/^https?:\/\//.test(url)) throw new Error('site option "url" must be an http or https address');
    engineOf("site", options);
    // A check holds the files to the receipt and needs no values, so it never opens the browser or the network.
    if (check) return seeded("site", options, [], {});
    const found = await extract(url);
    const { semantic = {}, palette = [] } = found.colors;
    const seeds = [...new Set([semantic.primary, semantic.secondary, semantic.accent].map(hexOf).filter(Boolean))].slice(0, 3);
    const styles = found.typography.styles;
    const [brand, plain] = [family(styles, "heading"), family(styles, "body")];
    const fonts = [...new Set(styles.map((style) => style.family).filter(Boolean))];
    const extra = {
      site: {
        color: numbered([...new Set(palette.map((colour) => hexOf(colour.normalized)).filter(Boolean))].map((hex) => flag("color", hex))),
        font: numbered(fonts.map((name) => flag("fontFamily", name))),
        radius: byValue(found.borderRadius.values.map((radius) => radius.numericValue)),
        space: byValue(found.spacing.commonValues.map((space) => space.numericValue)),
      },
      ...((brand || plain) && { md: { ref: { typeface: { ...(brand && { brand: { $type: "fontFamily", $value: brand } }), ...(plain && { plain: { $type: "fontFamily", $value: plain } }) } } } }),
    };
    return seeded("site", options, seeds, extra);
  },
};
