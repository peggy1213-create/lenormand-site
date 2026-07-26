// Converts source card PNGs/JPGs into WebP for public/cards/.
// Usage: node scripts/convert-images.mjs
//
// Source: source-images/{NN}-{Name}.png (case-insensitive name) + back.png
// Output: public/cards/{NN}-{slug}.webp + back.webp
// The output slug is just the lowercased source name — this matches the
// card slugs in src/data/cards.ts (see docs/deck-data.md).

import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC_DIR = path.resolve(import.meta.dirname, "..", "source-images");
const OUT_DIR = path.resolve(import.meta.dirname, "..", "public", "cards");

const LONGEST_EDGE = 800;
const QUALITY = 85;

const CARD_PATTERN = /^(\d{2})-([a-z]+)\.(png|jpe?g)$/i;
const BACK_PATTERN = /^back\.(png|jpe?g)$/i;

async function convert(srcPath, outName) {
  const outPath = path.join(OUT_DIR, outName);
  await sharp(srcPath)
    .resize({
      width: LONGEST_EDGE,
      height: LONGEST_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: QUALITY })
    .toFile(outPath);
  console.log(`  ${path.basename(srcPath)} -> public/cards/${outName}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const entries = await readdir(SRC_DIR);

  const seenIds = new Set();
  let backConverted = false;

  console.log(`Converting images from ${SRC_DIR}`);
  for (const entry of entries) {
    const cardMatch = entry.match(CARD_PATTERN);
    const backMatch = entry.match(BACK_PATTERN);

    if (cardMatch) {
      const [, id, name] = cardMatch;
      const slug = name.toLowerCase();
      await convert(path.join(SRC_DIR, entry), `${id}-${slug}.webp`);
      seenIds.add(id);
    } else if (backMatch) {
      await convert(path.join(SRC_DIR, entry), "back.webp");
      backConverted = true;
    }
  }

  const missing = [];
  for (let i = 1; i <= 36; i++) {
    const id = String(i).padStart(2, "0");
    if (!seenIds.has(id)) missing.push(id);
  }
  if (missing.length > 0) {
    console.warn(`Warning: missing source images for card ids: ${missing.join(", ")}`);
  }
  if (!backConverted) {
    console.warn("Warning: no back.png/back.jpg found in source-images/");
  }

  console.log(`Done. Converted ${seenIds.size}/36 cards${backConverted ? " + back" : ""}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
