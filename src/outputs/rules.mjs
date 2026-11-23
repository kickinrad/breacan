// Rules: the kit's lint config, breacan.rules.json, which `breacan lint` reads in a consumer's repo. It names every
// CSS variable the kit defines (so a reference to one it lacks is a finding), each variable's usage rules (the
// contract's, then the kit's own from $extensions["com.kickinrad.breacan"].usage, which win) and the tokens an import
// flagged as needing review.
import { usage } from "../contract.mjs";

export default {
  slot: "output",
  name: "rules",
  reads: ["tokens"],
  writes: { path: "breacan.rules.json" },
  async run({ tokens, options, name, version }) {
    const byPath = new Map(tokens.map((token) => [token.path, token]));
    const variable = (path) => byPath.has(path) ? `--${byPath.get(path).name}` : undefined;
    const rules = {};
    const defaults = usage();
    for (const token of tokens) {
      const rule = { ...defaults[token.path], ...token.usage };
      if (!Object.keys(rule).length) continue;
      rules[`--${token.name}`] = { ...(rule.on && { on: rule.on.map(variable).filter(Boolean) }), ...(rule.properties && { properties: rule.properties }) };
    }
    const content = {
      ...(name && { kit: name, version }),
      variables: tokens.map((token) => `--${token.name}`).sort(),
      usage: Object.fromEntries(Object.entries(rules).sort(([a], [b]) => a.localeCompare(b))),
      review: tokens.filter((token) => token.review).map((token) => token.path).sort(),
    };
    return [{ path: options.path, content: `${JSON.stringify(content, null, 2)}\n` }];
  },
};
