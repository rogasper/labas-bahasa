/**
 * Build social preview images for Labas (Open Graph + Twitter).
 * Requires Bun >= 1.3.14 (Bun.Image API).
 *
 * Outputs truecolor PNG + JPEG — palette PNG breaks some Twitter/Threads crawlers.
 *
 * Usage: bun scripts/compress-og-image.ts
 */

import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const PUBLIC = join(ROOT, "apps/web/public");
const SOURCE = join(PUBLIC, "og_image.png");
const OPENGRAPH = join(PUBLIC, "opengraph-image.png");
const TWITTER = join(PUBLIC, "twitter-image.jpg");
const WIDTH = 1200;
const HEIGHT = 630;

function requireBunImage(path: string) {
  const file = Bun.file(path);
  if (typeof file.image !== "function") {
    console.error(
      "Bun.Image is not available. Upgrade Bun to >= 1.3.14:\n" +
        "  bun upgrade\n" +
        "  # or: curl -fsSL https://bun.com/install | bash",
    );
    process.exit(1);
  }
  return file.image();
}

function formatKb(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function writeMeta(label: string, path: string) {
  const bytes = (await Bun.file(path).arrayBuffer()).byteLength;
  const meta = await Bun.file(path).image().metadata();
  console.log(`  ${label}: ${formatKb(bytes)} (${meta.width}×${meta.height}, ${meta.format})`);
}

async function main() {
  const before = (await Bun.file(SOURCE).arrayBuffer()).byteLength;
  console.log(`Source: ${SOURCE}`);
  console.log(`Before: ${formatKb(before)}`);

  const base = requireBunImage(SOURCE).resize(WIDTH, HEIGHT, {
    fit: "fill",
    filter: "lanczos3",
  });

  // Truecolor PNG — compatible with Meta/Twitter crawlers (no 8-bit palette).
  await base.png({ compressionLevel: 9, palette: false }).write(OPENGRAPH);

  // JPEG for twitter:image — matches rogasper.com pattern, very reliable on X/Threads.
  await requireBunImage(OPENGRAPH)
    .jpeg({ quality: 88, mozjpeg: true })
    .write(TWITTER);

  // Keep legacy filename in sync with the Open Graph asset.
  await Bun.write(SOURCE, Bun.file(OPENGRAPH));

  console.log("Wrote:");
  await writeMeta("opengraph-image.png", OPENGRAPH);
  await writeMeta("twitter-image.jpg", TWITTER);
  await writeMeta("og_image.png (legacy)", SOURCE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
