/**
 * Generate PWA icons from the Weiss & Goldring logo.
 *
 * Source: public/WGicon_circle.png (2048x2048 RGBA, transparent corners).
 * Run with: node scripts/genIcons.mjs
 *
 * - icon-192 / icon-512: transparent "any" purpose icons.
 * - maskable-512: flattened onto navy so Android masks (circle/squircle) look clean.
 * - apple-touch-icon: 180x180 flattened onto navy (iOS ignores transparency).
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = resolve(ROOT, 'public/WGicon_circle.png');
const OUT = resolve(ROOT, 'public/icons');

// Matches the logo's navy field so the circle blends seamlessly into the square.
const NAVY = { r: 10, g: 25, b: 41, alpha: 1 };

mkdirSync(OUT, { recursive: true });

async function transparentIcon(size) {
  await sharp(SRC)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(resolve(OUT, `icon-${size}.png`));
}

async function flattenedIcon(size, name) {
  await sharp(SRC)
    .resize(size, size, { fit: 'contain', background: NAVY })
    .flatten({ background: NAVY })
    .png()
    .toFile(resolve(OUT, name));
}

await transparentIcon(192);
await transparentIcon(512);
await flattenedIcon(512, 'maskable-512.png');
await flattenedIcon(180, 'apple-touch-icon.png');

console.log('PWA icons written to public/icons/');
