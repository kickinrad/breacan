// A small kit for the tailwind, obsidian and mealie outputs.
export default {
  modules: ["tailwind", "obsidian", "mealie"],
  include: ["builtin:material"],
  kit: { name: "acme" },
  tailwind: { path: "ports/tailwind/acme.css", css: "ports/css/acme.css" },
  obsidian: { out: "ports/obsidian/acme" },
  mealie: { out: "ports/mealie/acme" },
};
