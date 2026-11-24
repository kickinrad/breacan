// Fixture kit D (walkthrough D): a full brand guide with its own colour, type and icons, on iOS at Branded.
import apple from "./apple-stub.mjs";

export default {
  kit: { name: "kit-d" },
  include: ["builtin:base"],
  modules: ["dtcg"],
  dtcg: { path: "ports/tokens" },
  platforms: { ios: { language: apple, dial: "branded" } },
};
