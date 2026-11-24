// Reads and edits a DTCG tokens file in place, so a saved edit changes one token's `$value` and nothing else: the
// file's spacing, key order and every other token stay as written.
// shortcut: a token name with a "." in it is not found; a `$value` that is an object or an alias is not edited.
const alias = /^\{[^{}]+\}$/;
const skip = (text, i) => { while (/\s/.test(text[i])) i++; return i; };
// Where the JSON value that starts at `i` ends.
const end = (text, i) => {
  if (text[i] === '"') { for (i++; text[i] !== '"'; i++) if (text[i] === "\\") i++; return i + 1; }
  if (text[i] === "{" || text[i] === "[") {
    for (let depth = 0; ; i++) {
      if (text[i] === '"') i = end(text, i) - 1;
      else if ("{[".includes(text[i])) depth++;
      else if ("}]".includes(text[i]) && --depth === 0) return i + 1;
    }
  }
  return i + text.slice(i).match(/^[^\s,}\]]*/)[0].length;
};
// The span [start, stop) of the member `name` of the object that starts at `start`.
const member = (text, start, name) => {
  if (text[start] !== "{") return undefined;
  for (let i = skip(text, start + 1); text[i] === '"'; ) {
    const keyEnd = end(text, i);
    const at = skip(text, skip(text, keyEnd) + 1);
    const stop = end(text, at);
    if (JSON.parse(text.slice(i, keyEnd)) === name) return [at, stop];
    i = skip(text, skip(text, stop) + 1);
  }
  return undefined;
};

// Every colour a tree sets as a literal, by token path (a group's $type reaches its tokens).
export const colours = (tree, path = [], type) => Object.entries(tree).flatMap(([key, node]) => {
  if (key.startsWith("$") || !node || typeof node !== "object") return [];
  if (!("$value" in node)) return colours(node, [...path, key], node.$type ?? type);
  return (node.$type ?? type) === "color" && typeof node.$value === "string" && !alias.test(node.$value) ? [[...path, key].join(".")] : [];
});

// `text` with the token at `path` holding `value`.
export const setToken = (text, path, value) => {
  let span = [skip(text, 0)];
  for (const name of [...path.split("."), "$value"]) {
    span = span && member(text, span[0], name);
    if (!span) throw new Error(`${path} is not a token this file sets`);
  }
  const old = JSON.parse(text.slice(...span));
  if (typeof old !== "string" || alias.test(old)) throw new Error(`${path} is not a literal string value`);
  return text.slice(0, span[0]) + JSON.stringify(value) + text.slice(span[1]);
};
