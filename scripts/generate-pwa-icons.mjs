// Generates PWA icons (app icon, maskable icon, apple touch icon, favicon)
// from an inline SVG using the site's existing moss/gold/parchment palette.
// Run: node scripts/generate-pwa-icons.mjs
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");

const MOSS = "#314b29";
const MOSS_DARK = "#1e2f19";
const GOLD_LIGHT = "#f5d68a";
const GOLD = "#c18a45";
const PARCHMENT = "#faf1de";

// Star polygon path centered at origin, "radius" r (outer point distance).
function star(r) {
  const k = r * 0.28;
  return `M0,${-r} L${k},${-k} L${r},0 L${k},${k} L0,${r} L${-k},${k} L${-r},0 L${-k},${-k} Z`;
}

// Full-bleed icon: crescent moon + star mark on a moss background,
// evoking the Lenormand Moon/Stars cards. Mark sits within the ~80%
// maskable-safe zone so it survives OS icon masking (circle/squircle).
function markSvg(size) {
  const c = size / 2;
  const R = size * 0.24; // outer moon radius
  const R2 = size * 0.205; // cutout radius
  const dx = size * 0.1; // cutout offset -> crescent opens left
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="35%" cy="30%" r="85%">
      <stop offset="0%" stop-color="#3d6432"/>
      <stop offset="100%" stop-color="${MOSS_DARK}"/>
    </radialGradient>
    <linearGradient id="gilt" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${GOLD_LIGHT}"/>
      <stop offset="60%" stop-color="${GOLD}"/>
      <stop offset="100%" stop-color="#8f5e2b"/>
    </linearGradient>
    <mask id="moonMask">
      <rect x="-${R}" y="-${R}" width="${R * 2}" height="${R * 2}" fill="white"/>
      <circle cx="${dx}" cy="0" r="${R2}" fill="black"/>
    </mask>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <g transform="translate(${c} ${c})">
    <circle cx="0" cy="0" r="${R}" fill="url(#gilt)" mask="url(#moonMask)"/>
    <path d="${star(size * 0.052)}" fill="${PARCHMENT}" opacity="0.9"
      transform="translate(${size * 0.175} ${-size * 0.06})"/>
    <path d="${star(size * 0.03)}" fill="${PARCHMENT}" opacity="0.75"
      transform="translate(${size * 0.2} ${size * 0.14})"/>
  </g>
</svg>`;
}

// Maskable variant: same mark but nudged slightly toward center and the
// background extends edge-to-edge (already does), safe zone respected.
function maskableSvg(size) {
  return markSvg(size);
}

const targets = [
  { name: "icon-192.png", size: 192, svg: markSvg },
  { name: "icon-512.png", size: 512, svg: markSvg },
  { name: "icon-maskable-512.png", size: 512, svg: maskableSvg },
  { name: "apple-touch-icon.png", size: 180, svg: markSvg },
  { name: "favicon-32.png", size: 32, svg: markSvg },
  { name: "favicon-16.png", size: 16, svg: markSvg },
];

await mkdir(outDir, { recursive: true });

for (const t of targets) {
  const svg = Buffer.from(t.svg(t.size));
  const png = await sharp(svg).png().toBuffer();
  await writeFile(path.join(outDir, t.name), png);
  console.log("wrote", t.name);
}
