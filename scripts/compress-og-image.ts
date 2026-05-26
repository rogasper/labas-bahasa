/**
 * Compress apps/web/public/og_image.png for social previews.
 * Requires Bun >= 1.3.14 (Bun.Image API).
 *
 * Usage: bun scripts/compress-og-image.ts
 */

import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const TARGET = join(ROOT, "apps/web/public/og_image.png");
const WIDTH = 1200;
const HEIGHT = 630;

function requireBunImage() {
  const file = Bun.file(TARGET);
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

async function main() {
  const before = (await Bun.file(TARGET).arrayBuffer()).byteLength;
  console.log(`Source: ${TARGET}`);
  console.log(`Before: ${formatKb(before)} (${WIDTH}×${HEIGHT} target)`);

  const pipeline = requireBunImage()
    .resize(WIDTH, HEIGHT, { fit: "fill", filter: "lanczos3" })
    .png({
      compressionLevel: 9,
      palette: true,
      colors: 256,
      dither: true,
    });

  await pipeline.write(TARGET);

  const after = (await Bun.file(TARGET).arrayBuffer()).byteLength;
  const meta = await Bun.file(TARGET).image().metadata();

  console.log(`After:  ${formatKb(after)} (${meta.width}×${meta.height}, ${meta.format})`);
  console.log(`Saved:  ${formatKb(before - after)} (${(((before - after) / before) * 100).toFixed(1)}%)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
