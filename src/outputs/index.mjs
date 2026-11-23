// The built-in output modules, by name.
import beer from "./beer.mjs";
import claudeDesign from "./claude-design.mjs";
import css from "./css.mjs";
import designMd from "./design-md.mjs";
import dtcg from "./dtcg.mjs";
import mealie from "./mealie.mjs";
import obsidian from "./obsidian.mjs";
import playground from "./playground.mjs";
import plugin from "./plugin.mjs";
import reactNative from "./react-native.mjs";
import storybook from "./storybook.mjs";
import tailwind from "./tailwind.mjs";
import template from "./template.mjs";

export default Object.fromEntries([beer, claudeDesign, css, designMd, dtcg, mealie, obsidian, playground, plugin, reactNative,
  storybook, tailwind, template].map((module) => [module.name, module]));
