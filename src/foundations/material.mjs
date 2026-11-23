// Material's colour engine (material-color-utilities, Apache-2.0): the first seed makes Material's tonal-spot scheme,
// every colour role in both schemes, greys included. A second or third seed replaces the secondary or tertiary
// palette with that seed's own tones.
// Options: seeds (one to three hex colours).
import { DynamicScheme, Hct, SchemeTonalSpot, TonalPalette, argbFromHex, hexFromArgb } from "@material/material-color-utilities";
import { contract } from "../contract.mjs";
import { seedsOf } from "./seeds.mjs";

const ROLES = contract().filter((path) => path.startsWith("md.sys.color.")).map((path) => path.slice("md.sys.color.".length));
const camel = (role) => role.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());

export const schemeFor = (seeds, isDark) => {
  const [primary, secondary, tertiary] = seeds.map((seed) => Hct.fromInt(argbFromHex(seed)));
  const spot = new SchemeTonalSpot(primary, isDark, 0);
  if (!secondary && !tertiary) return spot;
  return new DynamicScheme({
    sourceColorHct: primary, variant: spot.variant, contrastLevel: 0, isDark, platform: spot.platform, specVersion: spot.specVersion,
    primaryPalette: spot.primaryPalette, neutralPalette: spot.neutralPalette, neutralVariantPalette: spot.neutralVariantPalette,
    secondaryPalette: secondary ? TonalPalette.fromHct(secondary) : spot.secondaryPalette,
    tertiaryPalette: tertiary ? TonalPalette.fromHct(tertiary) : spot.tertiaryPalette,
  });
};

export default {
  slot: "foundation",
  name: "material",
  reads: [],
  writes: {},
  async run({ options }) {
    const seeds = seedsOf(options, "material");
    const tree = (scheme) => ({ md: { sys: { color: Object.fromEntries(ROLES.map((role) => [role, { $type: "color", $value: hexFromArgb(scheme[camel(role)]) }])) } } });
    return { light: tree(schemeFor(seeds, false)), dark: tree(schemeFor(seeds, true)) };
  },
};
