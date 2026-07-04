// Prebuild image guard (T021).
// Enforces the spec's hard limits on CMS-uploaded media so a non-technical
// writer's unoptimized phone photo can't reach production and blow the
// performance budget. astro:assets still resizes/compresses referenced images
// at build; this guard is the belt-and-suspenders enforcement of the raw limits.
import { readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const UPLOADS_DIR = fileURLToPath(new URL('../src/assets/uploads', import.meta.url));
const MAX_BYTES = 1_000_000; // 1MB
const MAX_WIDTH = 2000; // px
const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function listImages(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return []; // no uploads dir yet
  }
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listImages(full)));
    else if (ALLOWED.has(extname(entry.name).toLowerCase())) files.push(full);
  }
  return files;
}

const errors = [];
for (const file of await listImages(UPLOADS_DIR)) {
  const ext = extname(file).toLowerCase();
  if (!ALLOWED.has(ext)) {
    errors.push(`${file}: unsupported format ${ext} (allowed: JPG, PNG, WEBP)`);
    continue;
  }
  const { size } = await stat(file);
  const { width } = await sharp(file).metadata();
  if (size > MAX_BYTES) errors.push(`${file}: ${(size / 1e6).toFixed(2)}MB exceeds 1MB limit`);
  if (width && width > MAX_WIDTH) errors.push(`${file}: ${width}px wide exceeds ${MAX_WIDTH}px limit`);
}

if (errors.length) {
  console.error('\nImage guard failed - optimize these before publishing:\n');
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\nTip: resize to <=2000px and re-export as WEBP/JPG under 1MB.\n');
  process.exit(1);
}
console.log('✓ Image guard passed (uploads within 2000px / 1MB / JPG·PNG·WEBP).');
