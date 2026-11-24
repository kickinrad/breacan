// The platform layer and the dial (flow steps 6 and 7). A kit lists its platforms in `platforms`, each with a
// language (a module { slot: "language", name, run() → { <foundation or chrome>: <DTCG tree> } }, the platform's
// native values) and a dial: a level, or { level, <foundation>: "theme" | "platform" } to set one foundation against
// its level. The dial says, foundation by foundation, whether the platform keeps the theme's values or takes its
// language's; the rule runs during resolution, as the language layers that join the stack.

// Each foundation and the token groups it owns. A language's tree for a foundation sets tokens in its groups only, so
// a foundation's dial setting moves that foundation's tokens and nothing else.
export const FOUNDATIONS = {
  colour: ["md.sys.color", "md.sys.state"],
  type: ["md.sys.typescale", "md.ref.typeface"],
  shape: ["md.sys.shape"],
  spacing: ["breacan.sys.spacing", "breacan.sys.touch-min", "breacan.sys.density"],
  motion: ["md.sys.motion"],
  elevation: ["md.sys.elevation"],
  icons: ["breacan.sys.icon-set"],
  components: ["md.comp"],
};
export const LEVELS = ["native", "tinted", "branded", "signature"];

// The foundations each level keeps from the theme. Native follows the platform; Tinted keeps only colour; Branded
// keeps colour, type and shape; Signature keeps the whole look.
const KEEPS = { native: [], tinted: ["colour"], branded: ["colour", "type", "shape"], signature: Object.keys(FOUNDATIONS) };

// System chrome (bars, sheets, system controls): the language's `chrome` tree, its tokens under breacan.comp. Below
// Signature it stays native, whatever the foundations say, and its tint is the brand's: the language aliases
// {breacan.sys.tint}, which the dial sets to the theme's primary colour. At Signature the kit's own components draw it.
const CHROME = ["breacan.comp"];

const leaves = (node, path = []) => Object.entries(node).filter(([key]) => !key.startsWith("$"))
  .flatMap(([key, child]) => child && typeof child === "object" && "$value" in child ? [[...path, key].join(".")] : leaves(child ?? {}, [...path, key]));
const within = (groups) => (path) => groups.some((group) => path === group || path.startsWith(`${group}.`));

// A platform's dial as { level, takes: foundation → whether it takes the platform's values }.
const readDial = (platform, dial) => {
  const { level, ...overrides } = typeof dial === "string" ? { level: dial } : dial ?? {};
  if (!LEVELS.includes(level)) throw new Error(`platforms.${platform}.dial must be one of ${LEVELS.join(", ")}, not ${JSON.stringify(level ?? dial)}`);
  for (const [foundation, side] of Object.entries(overrides)) {
    if (!FOUNDATIONS[foundation]) throw new Error(`platforms.${platform}.dial.${foundation} is not a foundation; the foundations are ${Object.keys(FOUNDATIONS).join(", ")}`);
    if (!["theme", "platform"].includes(side)) throw new Error(`platforms.${platform}.dial.${foundation} must be "theme" or "platform", not ${JSON.stringify(side)}`);
  }
  const takes = Object.fromEntries(Object.keys(FOUNDATIONS).map((foundation) =>
    [foundation, overrides[foundation] ? overrides[foundation] === "platform" : !KEEPS[level].includes(foundation)]));
  return { level, takes };
};

// Each platform's level and the layers its language adds over the theme: [{ platform, level, layers }]. `tint` is the
// theme's primary colour, the brand tint on system chrome.
export const platformLayers = (platforms = {}, { tint } = {}) => Promise.all(Object.entries(platforms).map(async ([platform, { language, dial } = {}]) => {
  const { level, takes } = readDial(platform, dial);
  if (language?.slot !== "language" || typeof language.run !== "function") {
    throw new Error(`platforms.${platform}.language must be a language module ({ slot: "language", name, run })`);
  }
  const trees = await language.run({ platform }) ?? {};
  const groups = { ...FOUNDATIONS, chrome: CHROME };
  for (const [part, tree] of Object.entries(trees)) {
    if (!groups[part]) throw new Error(`Language ${language.name} sets ${part}; it may set ${Object.keys(groups).join(", ")}`);
    const stray = leaves(tree).filter((path) => !within(groups[part])(path));
    if (stray.length) throw new Error(`Language ${language.name}'s ${part} sets ${stray.join(", ")}, outside ${groups[part].join(", ")}`);
  }
  const layers = Object.keys(FOUNDATIONS).filter((foundation) => trees[foundation] && takes[foundation])
    .map((foundation) => ({ tree: trees[foundation], file: `${language.name} (${foundation})` }));
  if (trees.chrome && level !== "signature") {
    if (!tint) throw new Error(`platforms.${platform}: system chrome takes the theme's md.sys.color.primary as its tint, and no layer sets it`);
    layers.push({ tree: { breacan: { sys: { tint: { $type: "color", $value: tint } } } }, file: "the dial (chrome tint)" },
      { tree: trees.chrome, file: `${language.name} (chrome)` });
  }
  return { platform, level, layers };
}));
