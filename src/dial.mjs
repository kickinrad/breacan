// The platform layer and the dial (flow steps 6 and 7). A kit lists its platforms in `platforms`, each with a
// language (a module { slot: "language", name, run() → { <foundation>: <DTCG tree> } }, the platform's native
// values) and a dial level. The level says, foundation by foundation, whether the platform keeps the theme's
// values or takes its language's; the rule runs during resolution, as the language layers that join the stack.
export const FOUNDATIONS = ["type"];
export const LEVELS = ["native", "tinted", "branded", "signature"];

// The foundations each level keeps from the theme. Native follows the platform; Tinted keeps only colour; Branded
// keeps colour, type and shape; Signature keeps the whole look.
const KEEPS = { native: [], tinted: [], branded: ["type"], signature: ["type"] };
const takesPlatform = (level, foundation) => !KEEPS[level].includes(foundation);

// Each platform's level and the layers its language adds over the theme: [{ platform, level, layers }].
export const platformLayers = (platforms = {}) => Promise.all(Object.entries(platforms).map(async ([platform, { language, dial } = {}]) => {
  if (!LEVELS.includes(dial)) throw new Error(`platforms.${platform}.dial must be one of ${LEVELS.join(", ")}, not ${JSON.stringify(dial)}`);
  if (language?.slot !== "language" || typeof language.run !== "function") {
    throw new Error(`platforms.${platform}.language must be a language module ({ slot: "language", name, run })`);
  }
  const foundations = await language.run({ platform });
  const unknown = Object.keys(foundations ?? {}).filter((foundation) => !FOUNDATIONS.includes(foundation));
  if (unknown.length) throw new Error(`Language ${language.name} sets ${unknown.join(", ")}; the foundations are ${FOUNDATIONS.join(", ")}`);
  const layers = FOUNDATIONS.filter((foundation) => foundations[foundation] && takesPlatform(dial, foundation))
    .map((foundation) => ({ tree: foundations[foundation], file: `${language.name} (${foundation})` }));
  return { platform, level: dial, layers };
}));
