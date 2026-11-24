// iOS foundations for the dial. Point measurements use DTCG's px unit because the current output contract has no pt.
// A native renderer should use the named UIKit/SwiftUI APIs for adaptive colour, type, materials and motion.
// Only what Apple publishes as fixed values is here: colour swatches (light and dark), the 44 pt hit region, type
// sizes, SF Pro and SF Symbols. Corner, motion and elevation scales and component sizes are not published, so they
// stay with the theme.
// Text sizes are Dynamic Type's default (Large). React Native scales text with the user's setting at runtime.
//
// Colour swatches (default light and dark): https://developer.apple.com/design/human-interface-guidelines/color
// Dynamic Type Large and SF Pro: https://developer.apple.com/design/human-interface-guidelines/typography
// 44 x 44 pt hit region: https://developer.apple.com/design/human-interface-guidelines/accessibility
// Icons: https://developer.apple.com/design/human-interface-guidelines/sf-symbols
// Bars and sheets: https://developer.apple.com/design/human-interface-guidelines/toolbars
// https://developer.apple.com/design/human-interface-guidelines/tab-bars
// https://developer.apple.com/design/human-interface-guidelines/sheets
// Materials: https://developer.apple.com/design/human-interface-guidelines/materials

const pt = (value) => ({ $type: "dimension", $value: { value, unit: "px" } });
const colour = (hex) => ({ $type: "color", $value: hex });
const tree = (path, leaves) => path.split(".").reduceRight((node, key) => ({ [key]: node }), leaves);
const font = { $type: "fontFamily", $value: ["SF Pro", "-apple-system", "system-ui", "sans-serif"] };

// Apple HIG Typography, iOS/iPadOS Dynamic Type Large (the default size): size and leading in points.
const STYLES = {
  "large-title": [34, 41], "title-1": [28, 34], "title-2": [22, 28], "title-3": [20, 25],
  headline: [17, 22], body: [17, 22], callout: [16, 21], subhead: [15, 20],
  footnote: [13, 18], "caption-1": [12, 16], "caption-2": [11, 13],
};
// Material role names are the shared contract; the Apple text styles are their nearest semantic equivalents.
const ROLES = {
  "display-large": ["large-title", 400], "display-medium": ["large-title", 400], "display-small": ["title-1", 400],
  "headline-large": ["title-1", 400], "headline-medium": ["title-2", 400], "headline-small": ["title-3", 400],
  "title-large": ["title-3", 600], "title-medium": ["headline", 600], "title-small": ["subhead", 600],
  "body-large": ["body", 400], "body-medium": ["callout", 400], "body-small": ["footnote", 400],
  "label-large": ["subhead", 500], "label-medium": ["caption-1", 500], "label-small": ["caption-2", 500],
};

// HIG Color's default swatches, [light, dark]. Native UI should still use the dynamic system colours.
// Surface is systemBackground: white in light, black in dark.
const SWATCHES = {
  primary: ["#0088ff", "#0091ff"], "on-primary": ["#000000", "#000000"],
  secondary: ["#8e8e93", "#8e8e93"], tertiary: ["#6155f5", "#6d7cff"], error: ["#ff383c", "#ff4245"],
  surface: ["#ffffff", "#000000"], "on-surface": ["#000000", "#ffffff"],
  "surface-container": ["#f2f2f7", "#1c1c1e"], outline: ["#c7c7cc", "#48484a"],
};

export default {
  slot: "language",
  name: "apple",
  run: ({ mode } = {}) => ({
    colour: tree("md.sys.color", Object.fromEntries(Object.entries(SWATCHES)
      .map(([role, hexes]) => [role, colour(hexes[mode === "dark" ? 1 : 0])]))),
    type: {
      md: {
        ref: { typeface: { brand: font, plain: font } },
        sys: { typescale: Object.fromEntries(Object.entries(ROLES).map(([role, [style, weight]]) => {
          const [size, leading] = STYLES[style];
          return [role, { size: pt(size), "line-height": pt(leading), weight: { $type: "fontWeight", $value: weight } }];
        })) },
      },
    },
    // HIG Accessibility specifies a 44x44 pt default hit region.
    spacing: tree("breacan.sys", { "touch-min": pt(44) }),
    icons: tree("breacan.sys", { "icon-set": { $type: "string", $value: "SF Symbols" } }),
    // HIG Materials and Sheets: bars use system material; sheets and controls remain native with the kit tint.
    chrome: tree("breacan.comp", {
      bar: { material: { $type: "string", $value: "Liquid Glass" }, tint: { $type: "color", $value: "{breacan.sys.tint}" } },
      "tab-bar": { material: { $type: "string", $value: "Liquid Glass" }, tint: { $type: "color", $value: "{breacan.sys.tint}" } },
      sheet: { presentation: { $type: "string", $value: "system sheet" }, tint: { $type: "color", $value: "{breacan.sys.tint}" } },
      control: { tint: { $type: "color", $value: "{breacan.sys.tint}" }, "touch-min": pt(44) },
    }),
  }),
};
