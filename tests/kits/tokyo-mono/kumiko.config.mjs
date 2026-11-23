// Builds the theme's ports from design/theme.toml with `kumiko` (github:kickinrad/kumiko): run `kumiko`,
// check with `kumiko --check`. The terminal and editor themes are templates/ with the palette filled in.
export default {
  targets: ['template', 'obsidian', 'mealie'],
  kit: { name: 'tokyo-mono' },
  template: { from: 'templates', to: '.' },
  obsidian: { out: 'ports/obsidian/tokyo-mono' },
  mealie: { out: 'ports/mealie/tokyo-mono' },
};
