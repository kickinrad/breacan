// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// An image's palette as seeds. Material's quantiser (material-color-utilities, Apache-2.0) counts the picture's
// colours and its scorer ranks the ones fit to seed a scheme; the top three go to a colour engine, which makes every
// role from them. Bun decodes any format it reads, and the pixels are read from a small PNG of it.
// Options: file (an image path), engine (`leonardo`, the default, or `material`).
import { QuantizerCelebi, Score, argbFromRgb, hexFromArgb } from "@material/material-color-utilities";
import { PNG } from "pngjs";
import { engineOf, seeded } from "./seeded.mjs";

const SIZE = 128;

export default {
  slot: "source",
  name: "image",
  reads: [],
  writes: {},
  async run({ options }) {
    const { file } = options;
    if (typeof file !== "string") throw new Error('image option "file" must name an image file');
    engineOf("image", options);
    let png;
    try {
      png = PNG.sync.read(Buffer.from(await new Bun.Image(await Bun.file(file).bytes()).resize(SIZE, SIZE, { fit: "inside" }).png().bytes()));
    } catch (error) { throw new Error(`image: cannot read ${file} (${error.message})`); }
    const pixels = [];
    for (let i = 0; i < png.data.length; i += 4) if (png.data[i + 3] === 255) pixels.push(argbFromRgb(png.data[i], png.data[i + 1], png.data[i + 2]));
    // Score answers its fallback when nothing is colourful enough to seed from; 0 says so.
    const seeds = Score.score(QuantizerCelebi.quantize(pixels, 128), { desired: 3, fallbackColorARGB: 0 });
    if (seeds[0] === 0) throw new Error(`image: ${file} has no colour strong enough to seed a scheme`);
    const palette = Object.fromEntries(seeds.map((argb, i) => [i + 1, { $type: "color", $value: hexFromArgb(argb) }]));
    return seeded("image", options, seeds.map(hexFromArgb), { image: { palette } });
  },
};
