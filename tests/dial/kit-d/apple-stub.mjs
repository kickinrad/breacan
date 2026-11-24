// A fixture Apple language for the dial tests, with stub values for every foundation and for system chrome. Type is
// SF Pro on Material's fifteen type roles, at Dynamic Type's default (Large) sizes in points, with Apple's tracking for
// each text style. The rest are round iOS-like stand-ins. The real breacan-apple plugin replaces it.
const STYLES = {
  "large-title": [34, 41, 0.4], "title-1": [28, 34, 0.38], "title-2": [22, 28, -0.26], "title-3": [20, 25, -0.45],
  headline: [17, 22, -0.43], body: [17, 22, -0.43], callout: [16, 21, -0.31], subheadline: [15, 20, -0.23],
  footnote: [13, 18, -0.08], "caption-1": [12, 16, 0], "caption-2": [11, 13, 0.07],
};
// Each Material role's Apple text style and weight.
const ROLES = {
  "display-large": ["large-title", 400], "display-medium": ["large-title", 400], "display-small": ["title-1", 400],
  "headline-large": ["title-1", 400], "headline-medium": ["title-2", 400], "headline-small": ["title-3", 400],
  "title-large": ["title-3", 600], "title-medium": ["headline", 600], "title-small": ["subheadline", 600],
  "body-large": ["body", 400], "body-medium": ["callout", 400], "body-small": ["footnote", 400],
  "label-large": ["subheadline", 500], "label-medium": ["caption-1", 500], "label-small": ["caption-2", 500],
};
const pt = (value) => ({ $type: "dimension", $value: { value, unit: "px" } });
const SF_PRO = { $type: "fontFamily", $value: ["SF Pro", "-apple-system", "system-ui", "sans-serif"] };
const colour = (hex) => ({ $type: "color", $value: hex });
const ms = (value) => ({ $type: "duration", $value: { value, unit: "ms" } });
const tree = (path, leaves) => path.split(".").reduceRight((node, key) => ({ [key]: node }), leaves);

export default {
  slot: "language",
  name: "apple-stub",
  run: () => ({
    type: {
      md: {
        ref: { typeface: { brand: SF_PRO, plain: SF_PRO } },
        sys: {
          typescale: Object.fromEntries(Object.entries(ROLES).map(([role, [style, weight]]) => {
            const [size, lineHeight, tracking] = STYLES[style];
            return [role, { size: pt(size), "line-height": pt(lineHeight), tracking: pt(tracking), weight: { $type: "fontWeight", $value: weight } }];
          })),
        },
      },
    },
    colour: tree("md.sys.color", {
      primary: colour("#007aff"), "on-primary": colour("#ffffff"), secondary: colour("#8e8e93"), tertiary: colour("#5856d6"),
      error: colour("#ff3b30"), surface: colour("#ffffff"), "on-surface": colour("#000000"),
      "surface-container": colour("#f2f2f7"), outline: colour("#c6c6c8"),
    }),
    shape: tree("md.sys.shape.corner", { "extra-small": pt(6), small: pt(8), medium: pt(10), large: pt(13), "extra-large": pt(20) }),
    spacing: tree("breacan.sys", { "touch-min": pt(44), spacing: { 300: pt(16), 400: pt(20) } }),
    motion: tree("md.sys.motion", {
      duration: { medium2: ms(350), long2: ms(500) },
      easing: { standard: { $type: "cubicBezier", $value: [0.25, 0.1, 0.25, 1] } },
    }),
    elevation: tree("md.sys.elevation", Object.fromEntries([0, 1, 2, 3, 6, 12].map((value, level) => [`level${level}`, pt(value)]))),
    icons: tree("breacan.sys", { "icon-set": { $type: "string", $value: "SF Symbols" } }),
    components: tree("md.comp.button-medium", { "container-height": pt(50), "leading-space": pt(20) }),
    // Bars, sheets and system controls, tinted with {breacan.sys.tint}: the brand's colour, which the dial sets.
    chrome: tree("breacan.comp", {
      bar: { "container-color": colour("#f9f9f9"), tint: { $type: "color", $value: "{breacan.sys.tint}" } },
      sheet: { "container-color": colour("#ffffff"), corner: pt(10) },
      control: { tint: { $type: "color", $value: "{breacan.sys.tint}" } },
    }),
  }),
};
