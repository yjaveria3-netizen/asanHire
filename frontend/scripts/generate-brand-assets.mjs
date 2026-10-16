import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

async function generateAssets() {
  console.log("Generating brand raster assets from SVGs...");

  const logoSvgPath = path.join(publicDir, "logo.svg");
  const logoFullSvgPath = path.join(publicDir, "logo-full.svg");
  const logoMarkSvgPath = path.join(publicDir, "logo-mark.svg");

  const logoSvgBuffer = fs.readFileSync(logoSvgPath);
  const logoFullSvgBuffer = fs.readFileSync(logoFullSvgPath);
  const logoMarkSvgBuffer = fs.readFileSync(logoMarkSvgPath);

  // 1. apple-touch-icon.png (180x180) from logo.svg
  await sharp(logoSvgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, "apple-touch-icon.png"));
  console.log("✓ Created apple-touch-icon.png (180x180)");

  // 2. icon.png (512x512) from logo.svg
  await sharp(logoSvgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, "icon.png"));
  console.log("✓ Created icon.png (512x512)");

  // 3. og-image.png (1200x630) with logo on #1E201E background
  // We can render logo-full at ~600px width and composite it in the center of a 1200x630 #1E201E canvas
  const fullLogoResized = await sharp(logoFullSvgBuffer)
    .resize(600, null)
    .toBuffer();

  const metadata = await sharp(fullLogoResized).metadata();
  const left = Math.round((1200 - (metadata.width || 600)) / 2);
  const top = Math.round((630 - (metadata.height || 162)) / 2);

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 30, g: 32, b: 30, alpha: 1 }, // #1E201E
    },
  })
    .composite([
      {
        input: fullLogoResized,
        top: top,
        left: left,
      },
    ])
    .png()
    .toFile(path.join(publicDir, "og-image.png"));
  console.log("✓ Created og-image.png (1200x630)");

  // 4. logo-email.png (about 240px wide, transparent or on #1E201E)
  // Using logo-full for email header so brand wordmark is visible
  await sharp(logoFullSvgBuffer)
    .resize(240, null)
    .png()
    .toFile(path.join(publicDir, "logo-email.png"));
  console.log("✓ Created logo-email.png (240px wide)");

  console.log("All brand image assets generated successfully!");
}

generateAssets().catch((err) => {
  console.error("Asset generation error:", err);
  process.exit(1);
});
