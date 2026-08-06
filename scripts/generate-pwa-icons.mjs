// Generates PWA icons (app icon, maskable icon, apple touch icon, favicon)
// by rasterizing the site's official In-Betweens mark SVGs at each target size.
// Run: node scripts/generate-pwa-icons.mjs
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
const publicDir = path.join(__dirname, "..", "public");

// Builds a .ico container embedding PNG-compressed images directly
// (supported by all modern OSes/browsers since Windows Vista).
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  pngBuffers.forEach((png, i) => {
    const entryOffset = 6 + i * 16;
    const size = png.width >= 256 ? 0 : png.width;
    header.writeUInt8(size, entryOffset); // width
    header.writeUInt8(size, entryOffset + 1); // height
    header.writeUInt8(0, entryOffset + 2); // color count
    header.writeUInt8(0, entryOffset + 3); // reserved
    header.writeUInt16LE(1, entryOffset + 4); // planes
    header.writeUInt16LE(32, entryOffset + 6); // bit count
    header.writeUInt32LE(png.buffer.length, entryOffset + 8); // bytes in resource
    header.writeUInt32LE(offset, entryOffset + 12); // image offset
    offset += png.buffer.length;
  });

  return Buffer.concat([header, ...pngBuffers.map((p) => p.buffer)]);
}

const APP_ICON_SVG = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="In-Betweens">
  <rect width="512" height="512" fill="#314b29"></rect>
  <g transform="translate(256 256) scale(2.9) translate(-60 -60)">
    <g fill="#fbf6ea">
    <path d="M60 8 C74 26, 74 42, 60 58 C46 42, 46 26, 60 8 Z"></path>
    <path d="M112 60 C94 74, 78 74, 62 60 C78 46, 94 46, 112 60 Z"></path>
    <path d="M60 112 C46 94, 46 78, 60 62 C74 78, 74 94, 60 112 Z"></path>
    <path d="M8 60 C26 46, 42 46, 58 60 C42 74, 26 74, 8 60 Z"></path>
    </g>
    <circle cx="60" cy="60" r="11" fill="#c18a45"></circle>
  </g>
</svg>`;

const FAVICON_SVG = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" role="img" aria-label="In-Betweens">
  <rect width="120" height="120" fill="#fbf6ea"></rect>
  <g transform="translate(60 60) scale(1.12) translate(-60 -60)" fill="#314b29">
    <path d="M60 8 C74 26, 74 42, 60 58 C46 42, 46 26, 60 8 Z"></path>
    <path d="M112 60 C94 74, 78 74, 62 60 C78 46, 94 46, 112 60 Z"></path>
    <path d="M60 112 C46 94, 46 78, 60 62 C74 78, 74 94, 60 112 Z"></path>
    <path d="M8 60 C26 46, 42 46, 58 60 C42 74, 26 74, 8 60 Z"></path>
  </g>
  <circle cx="60" cy="60" r="11" fill="#c18a45"></circle>
</svg>`;

const targets = [
  { name: "icon-192.png", size: 192, svg: APP_ICON_SVG },
  { name: "icon-512.png", size: 512, svg: APP_ICON_SVG },
  { name: "icon-maskable-512.png", size: 512, svg: APP_ICON_SVG },
  { name: "apple-touch-icon.png", size: 180, svg: APP_ICON_SVG },
  { name: "favicon-32.png", size: 32, svg: FAVICON_SVG },
  { name: "favicon-16.png", size: 16, svg: FAVICON_SVG },
];

await mkdir(outDir, { recursive: true });

const icoSizes = [];
for (const t of targets) {
  const png = await sharp(Buffer.from(t.svg), { density: 384 })
    .resize(t.size, t.size)
    .png()
    .toBuffer();
  await writeFile(path.join(outDir, t.name), png);
  console.log("wrote", t.name);
  if (t.name === "favicon-16.png" || t.name === "favicon-32.png") {
    icoSizes.push({ width: t.size, buffer: png });
  }
}

icoSizes.sort((a, b) => a.width - b.width);
const ico = buildIco(icoSizes);
await writeFile(path.join(publicDir, "favicon.ico"), ico);
console.log("wrote favicon.ico");
