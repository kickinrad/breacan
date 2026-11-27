// Builds the theme's ports from design/theme.toml with `breacan` (github:kickinrad/breacan): run `breacan build`,
// check with `breacan check`. The terminal and editor themes are templates/ with the palette filled in.
export default {
  modules: ['template', 'obsidian', 'mealie'],
  kit: { name: 'tokyo-mono' },
  template: { from: 'templates', to: '.' },
  obsidian: { out: 'ports/obsidian/tokyo-mono' },
  mealie: { out: 'ports/mealie/tokyo-mono' },
};
