---
name: material-reference
description: Look up Material 3's own guidance and values. Use when a question needs layout (scaffold, breakpoints, panes, spacing), a component's anatomy and measurements, colour roles, motion, or what Material 3 Expressive changed. Not for a kit's own values (use the kit's skill) or making a kit (use make-kit).
---

# Material reference

Answer from Material's sources, in this order, and cite each value. This skill holds no Material value; it says where each one lives.

1. **Tokens first.** Breacán ([kickinrad/breacan](https://github.com/kickinrad/breacan); local checkout `~/projects/personal/kumiko`) vendors androidx's token files as DTCG JSON in `material/material.tokens.json`, the source of its Material language. `material/manifest.json` names the androidx commit and the source Kotlin files; each token's `$extensions["com.kickinrad.material"].src` names its file and line. A kit's CSS emits them as `--md-sys-*` and `--md-comp-<component>-<token>`. A number found there is the answer: cite the token path.
2. **The guidance site, by its content feed.** m3.material.io is an Angular app whose HTML holds no guideline text; the text loads as JSON.
   - Find the build: fetch `https://m3.material.io/` with curl, take the `/static/angular/main.<hash>.js` path from it, fetch that and grep `20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]_[0-9-]*`.
   - `https://m3.material.io/_dsm/content/m3/<build>/sitemap.json` lists every page: `sitemapArray[{pageCanonId, slug, tabs[{tabName, image[{image, altText}], video}], timestamp}]`.
   - A page is `.../<build>/<pageCanonId>.json`: `{title, slug, updatedTimestamp, sections[{name, contentBlocks[{contentChunks[...]}]}]}`. A chunk carries its text in `htmlValue` and a figure's caption in `footer`, which often holds the spec values.
   - When curl gets a 404, run a same-origin `fetch()` of the same URL from a browser tab open on m3.material.io (load the `browser-testing` skill). Fetch with curl's own defaults: spoofing a browser User-Agent or Referer is bot-check circumvention, so refuse it.
   - Expressive and layout announcements land on [the blog](https://m3.material.io/blog) first.
3. **Code-side references** when the site gives no number:
   - Material Components for Android: `https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/<Component>.md`.
   - androidx token source: `https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/<Name>Tokens.kt`.
   - [Android's canonical layouts](https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts).
   - Material Web (`@material/web`) is in maintenance mode; check its current tree before naming a component.
4. **Report.** Every value carries its source: the page title, section and `updatedTimestamp`, or the token path and androidx commit. When the site and an androidx token disagree, name both sides. A value enters a kit only through make-kit, as a token whose `$description` names the source.
