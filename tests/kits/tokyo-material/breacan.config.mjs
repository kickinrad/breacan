// Builds the kit's outputs from design/theme.toml with `breacan` (github:kickinrad/breacan): run `breacan build`,
// check with `breacan check` and `breacan audit`. This file says where each output goes; the values are theme.toml's.
// An app builds its own platform's files from the dtcg output, so the kit makes only these.
export default {
  targets: ['css', 'beer', 'dtcg', 'playground', 'claude-design', 'plugin'],
  include: ['builtin:material'],
  kit: { name: 'tokyo-material' },
  // The web stylesheets sit beside the playground, which shows them, and go out with each release.
  css: {
    path: 'docs/playground/tokyo-material.css',
    scheme: 'dark',
    prelude: [
      '/* Tokyo Material design tokens as CSS custom properties. --md-* are Material 3 names (the vendored spec with',
      ' * the kit\'s exceptions on top); --tokyo-material-* are the kit\'s additions. Each colour is one light-dark() on',
      ' * :root, Night or Day as the system prefers; data-theme="light" or "dark" on any element pins a mode. Needs a',
      ' * Baseline 2024 browser. Material\'s component tokens are here where Beer\'s layer reads them. */',
    ].join('\n'),
  },
  beer: { path: 'docs/playground/tokyo-material-beer.css' },
  // The universal tokens: any tool reads them, and an app's breacan includes them after builtin:material.
  dtcg: { path: 'ports/tokens' },
  playground: { path: 'docs/playground' },
  // The kit's Claude Design System: publish ports/claude-design/project/ to the artifact each release (CONTRIBUTING).
  'claude-design': { path: 'ports/claude-design' },
  // The kit's agent plugin, which Claude Code and Codex install from this repo's marketplaces. The skill, evals and
  // interop are hand-owned; the manifest and the skill's references are generated.
  plugin: {
    path: 'plugins/tokyo-material',
    description: 'Build UI on Tokyo Material, and adopt, tweak and update the kit in an app: its rules, components and token names.',
    repository: 'https://github.com/kickinrad/tokyo-material',
    author: { name: 'Wils', email: 'wils@bestfootforward.business' },
  },
};
