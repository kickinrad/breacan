// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// A website's look as a starting point. Dembrandt (MIT) renders the page in Chromium and reads its computed styles.
// Its primary, secondary and accent colours become the palette names `site-1` to `site-3`, which a theme's roles can
// use. Every colour, font, corner radius and spacing it finds becomes a primitive under `site`, each marked
// `needs-review` for a person to confirm; its heading and body fonts are `site.brand` and `site.plain`.
// The page is read once, by the command `breacan site`, into a snapshot file the project keeps; every build and
// check reads that file, so the same project builds the same offline and the network is touched only on request.
// Drives Chrome: $CHROME, else one on the PATH, else Playwright's download.
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { defineAddon, defineCommand, defineInput } from "breacan";
import { srgb } from "breacan/color";

const options = {
  url: { type: "string", description: "The page to read, an http or https address.", required: true },
  snapshot: { type: "string", description: "Where the page's values are kept, from the project root.", default: "design/site.json" },
} as const;

const REVIEW = { "com.kickinrad.breacan": { "needs-review": true } };
const flag = (type: string, $value: unknown) => ({ $type: type, $value, $extensions: REVIEW });
const px = (value: number) => flag("dimension", { value, unit: "px" });
const hexOf = (css?: string) => {
  const rgb = css?.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  return rgb ? `#${rgb.slice(1, 4).map((part) => Number(part).toString(16).padStart(2, "0")).join("")}` : /^#[0-9a-f]{6}$/i.test(css ?? "") ? css!.toLowerCase() : undefined;
};
const numbered = (items: unknown[]) => Object.fromEntries(items.map((item, i) => [i + 1, item]));
// Whole pixels, each named by its value (a name cannot hold a dot): 19.92 and 20 are one step.
const byValue = (values: number[]) => Object.fromEntries([...new Set(values.map(Math.round))].filter((value) => value > 0).sort((a, b) => a - b).map((value) => [value, px(value)]));
// The most used family among the styles whose context starts with `context`.
const family = (styles: any[], context: string): string | undefined => styles.filter((style) => style.context.startsWith(context) && style.family).sort((a, b) => b.count - a.count)[0]?.family;

interface Snapshot { url: string; seeds: string[]; colors: string[]; fonts: string[]; brand?: string; plain?: string; radii: number[]; spacing: number[] }

// What a snapshot keeps of a page: only what the tokens below read, as plain values, so the file reads in a diff.
const snapshotOf = (url: string, found: any): Snapshot => {
  const { semantic = {}, palette = [] } = found.colors;
  const styles = found.typography.styles;
  return {
    url,
    seeds: [...new Set([semantic.primary, semantic.secondary, semantic.accent].map(hexOf).filter(Boolean))].slice(0, 3) as string[],
    colors: [...new Set(palette.map((colour: any) => hexOf(colour.normalized)).filter(Boolean))] as string[],
    fonts: [...new Set(styles.map((style: any) => style.family).filter(Boolean))] as string[],
    brand: family(styles, "heading"),
    plain: family(styles, "body"),
    radii: found.borderRadius.values.map((radius: any) => radius.numericValue),
    spacing: found.spacing.commonValues.map((space: any) => space.numericValue),
  };
};

const chrome = () => {
  const found = [process.env.CHROME, ...["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome"].map((name) => Bun.which(name))].find(Boolean);
  if (found) return found;
  const cache = join(homedir(), ".cache/ms-playwright");
  const [downloaded] = existsSync(cache) ? [...new Bun.Glob("chromium-*/chrome-linux*/chrome").scanSync({ cwd: cache, absolute: true, onlyFiles: true })].sort().reverse() : [];
  if (downloaded) return downloaded;
  throw new Error("Chrome not found: set CHROME, or put google-chrome or chromium on the PATH");
};

const checkUrl = (url: string) => {
  if (!/^https?:\/\//.test(url)) throw new Error('website option "url" must be an http or https address');
};

// shortcut: dembrandt prints its progress, and a redirect warning, with console.log; it is silenced while it runs,
// until dembrandt takes a writer of its own.
const extract = async (url: string) => {
  const { chromium } = await import("playwright-core");
  const { extractBranding } = await import("dembrandt/extractors");
  const spinner: any = new Proxy({}, { get: (_, key) => (key === "text" ? "" : () => spinner) });
  const browser = await chromium.launch({ executablePath: chrome() });
  const log = console.log;
  console.log = () => {};
  try { return snapshotOf(url, await extractBranding(url, spinner, browser, {})); } finally { console.log = log; await browser.close(); }
};

export default defineAddon({
  name: "@breacan/website",
  parts: [
    defineInput({
      name: "website",
      options,
      async load({ options: { url, snapshot }, read }) {
        checkUrl(url);
        if (!existsSync(snapshot)) throw new Error(`website: ${snapshot} is missing; run breacan site`);
        const kept: Snapshot = JSON.parse(await read(snapshot));
        if (kept.url !== url) throw new Error(`website: ${snapshot} holds ${kept.url}, not ${url}; run breacan site`);
        return {
          palette: Object.fromEntries(kept.seeds.map((hex, i) => [`site-${i + 1}`, hex])),
          tokens: {
            site: {
              color: numbered(kept.colors.map((hex) => flag("color", srgb(hex)))),
              font: numbered(kept.fonts.map((name) => flag("fontFamily", name))),
              radius: byValue(kept.radii),
              space: byValue(kept.spacing),
              ...(kept.brand && { brand: flag("fontFamily", kept.brand) }),
              ...(kept.plain && { plain: flag("fontFamily", kept.plain) }),
            },
          },
        };
      },
    }),
    defineCommand({
      name: "site",
      summary: "Read the website's colours, fonts and sizes into its snapshot file.",
      options,
      async run({ options: { url, snapshot } }) {
        checkUrl(url);
        await mkdir(dirname(snapshot), { recursive: true });
        await writeFile(snapshot, `${JSON.stringify(await extract(url), null, 2)}\n`);
        console.log(`wrote ${snapshot}`);
      },
    }),
  ],
});
