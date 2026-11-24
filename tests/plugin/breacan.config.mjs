// A second kit for the plugin output, unlike tests/playground: other names, modes, rules and outputs, and no Beer.
export default {
  targets: ["css", "obsidian", "plugin"],
  include: ["builtin:material"],
  kit: { name: "tern" },
  css: { path: "web/tern.css" },
  obsidian: { out: "notes/tern" },
  plugin: { path: "agent/tern", repository: "https://example.org/tern" },
};
