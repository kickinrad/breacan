// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// An image's palette as a starting point. Material's quantiser (material-color-utilities, Apache-2.0) counts the
// picture's colours and its scorer ranks the ones fit to seed a scheme; the top three become the palette names
// `image-1` to `image-3`, which a theme's roles can use. Bun decodes any format it reads, and the pixels are read
// from a small PNG of it.
import { QuantizerCelebi, Score, argbFromRgb, hexFromArgb } from "@material/material-color-utilities";
import { defineAddon, defineInput } from "breacan";
import { PNG } from "pngjs";

const SIZE = 128;

const options = {
  file: { type: "string", description: "An image file, from the project root.", required: true },
} as const;

export default defineAddon({
  name: "@breacan/image",
  parts: [
    defineInput({
      name: "image",
      options,
      async load({ options: { file }, read }) {
        // shortcut: read() decodes text, so it only records the file as a build input; the bytes come from Bun.file.
        // Upgrade when the contract gains a binary read.
        let png;
        try {
          await read(file);
          png = PNG.sync.read(Buffer.from(await new Bun.Image(await Bun.file(file).bytes()).resize(SIZE, SIZE, { fit: "inside" }).png().bytes()));
        } catch (error) { throw new Error(`image: cannot read ${file} (${(error as Error).message})`, { cause: error }); }
        const pixels: number[] = [];
        for (let i = 0; i < png.data.length; i += 4) if (png.data[i + 3] === 255) pixels.push(argbFromRgb(png.data[i], png.data[i + 1], png.data[i + 2]));
        // Score answers its fallback when nothing is colourful enough to seed from; 0 says so.
        const seeds = Score.score(QuantizerCelebi.quantize(pixels, 128), { desired: 3, fallbackColorARGB: 0 });
        if (seeds[0] === 0) throw new Error(`image: ${file} has no colour strong enough to seed a scheme`);
        return { palette: Object.fromEntries(seeds.map((argb, i) => [`image-${i + 1}`, hexFromArgb(argb)])) };
      },
    }),
  ],
});
