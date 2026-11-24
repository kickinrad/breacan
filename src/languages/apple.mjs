// iOS foundations for the dial. Point measurements use DTCG's px unit because the current output contract has no pt.
// A native renderer should use the named UIKit/SwiftUI APIs for adaptive colour, type, materials and motion.
// shortcut: default light appearance and Dynamic Type Large only, add variants when the dial resolves platform modes.
//
// Colour swatches and semantic roles: https://developer.apple.com/design/human-interface-guidelines/color
// Dynamic Type Large and SF Pro: https://developer.apple.com/design/human-interface-guidelines/typography
// Control size and bezel spacing: https://developer.apple.com/design/human-interface-guidelines/accessibility
// Corners and controls: https://developer.apple.com/design/human-interface-guidelines/buttons
// Layout spacing: https://developer.apple.com/design/human-interface-guidelines/layout
// Motion (purposeful, brief, optional): https://developer.apple.com/design/human-interface-guidelines/motion
// Depth through materials: https://developer.apple.com/design/human-interface-guidelines/materials
// Icons: https://developer.apple.com/design/human-interface-guidelines/sf-symbols
// Bars and sheets: https://developer.apple.com/design/human-interface-guidelines/toolbars
// https://developer.apple.com/design/human-interface-guidelines/tab-bars
// https://developer.apple.com/design/human-interface-guidelines/sheets

const pt = (value) => ({ $type: "dimension", $value: { value, unit: "px" } });
const colour = (hex) => ({ $type: "color", $value: hex });
const ms = (value) => ({ $type: "duration", $value: { value, unit: "ms" } });
const tree = (path, leaves) => path.split(".").reduceRight((node, key) => ({ [key]: node }), leaves);
const font = { $type: "fontFamily", $value: ["SF Pro", "-apple-system", "system-ui", "sans-serif"] };

// Apple HIG Typography, iOS/iPadOS Dynamic Type Large (default): size and leading in points.
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

export default {
  slot: "language",
  name: "apple",
  run: () => ({
    // HIG Color's current default light swatches. Native UI must use dynamic system colours instead of these hexes.
    colour: tree("md.sys.color", {
      primary: colour("#0088ff"), "on-primary": colour("#000000"),
      secondary: colour("#8e8e93"), tertiary: colour("#6155f5"), error: colour("#ff383c"),
      surface: colour("#ffffff"), "on-surface": colour("#000000"),
      "surface-container": colour("#f2f2f7"), outline: colour("#c7c7cc"),
    }),
    type: {
      md: {
        ref: { typeface: { brand: font, plain: font } },
        sys: { typescale: Object.fromEntries(Object.entries(ROLES).map(([role, [style, weight]]) => {
          const [size, leading] = STYLES[style];
          return [role, { size: pt(size), "line-height": pt(leading), weight: { $type: "fontWeight", $value: weight } }];
        })) },
      },
    },
    // HIG Buttons favors circular/capsule controls; these general corner steps are Breacán approximations,
    // not an Apple radius specification. Native controls choose their own continuous corners.
    shape: tree("md.sys.shape.corner", {
      "extra-small": pt(4), small: pt(8), medium: pt(12), large: pt(16), "extra-large": pt(22),
    }),
    // HIG Accessibility specifies a 44x44 pt default control and about 12 pt around a bezel.
    spacing: tree("breacan.sys", {
      "touch-min": pt(44), spacing: { 200: pt(8), 300: pt(12), 400: pt(16) },
      density: { $type: "number", $value: 0 },
    }),
    // HIG Motion gives principles, not a duration/easing scale. These are conservative design defaults.
    motion: tree("md.sys.motion", {
      duration: { short2: ms(150), medium2: ms(300), long2: ms(450) },
      easing: { standard: { $type: "cubicBezier", $value: [0.25, 0.1, 0.25, 1] } },
    }),
    // HIG Materials defines semantic depth, not numeric elevation. This scale is an approximation for tokens.
    elevation: tree("md.sys.elevation", Object.fromEntries([0, 1, 2, 4, 8, 12].map((value, level) => [`level${level}`, pt(value)]))),
    icons: tree("breacan.sys", { "icon-set": { $type: "string", $value: "SF Symbols" } }),
    // Foundations only: tokens describe native controls; actual button, field and switch code belongs to the stack.
    components: tree("md.comp", {
      "button-medium": { "container-height": pt(44), "leading-space": pt(12), "trailing-space": pt(12) },
      "outlined-text-field": { "container-height": pt(44) },
      "switch": { "selected-track-color": { $type: "color", $value: "{breacan.sys.tint}" } },
    }),
    // HIG Materials and Sheets: bars use system material; sheets and controls remain native with the kit tint.
    chrome: tree("breacan.comp", {
      bar: { material: { $type: "string", $value: "Liquid Glass" }, tint: { $type: "color", $value: "{breacan.sys.tint}" } },
      "tab-bar": { material: { $type: "string", $value: "Liquid Glass" }, tint: { $type: "color", $value: "{breacan.sys.tint}" } },
      sheet: { presentation: { $type: "string", $value: "system sheet" }, tint: { $type: "color", $value: "{breacan.sys.tint}" } },
      control: { tint: { $type: "color", $value: "{breacan.sys.tint}" }, "touch-min": pt(44) },
    }),
  }),
};
