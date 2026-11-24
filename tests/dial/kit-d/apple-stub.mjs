// A fixture Apple language for the dial tests: SF Pro on Material's fifteen type roles, at Dynamic Type's default
// (Large) sizes in points, with Apple's tracking for each text style. The real breacan-apple plugin replaces it.
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
  }),
};
