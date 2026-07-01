/**
 * EliteFlow PWA Icon Generator
 * Run: node scripts/generate-icons.mjs
 * Requires: npm install sharp
 */
import sharp from "sharp"
import { writeFileSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, "..", "public")

const sizes = [192, 512]

async function generateSVG(size) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.16}" fill="url(#bg)"/>
  <rect x="${size * 0.08}" y="${size * 0.08}" width="${size * 0.84}" height="${size * 0.84}" rx="${size * 0.12}" fill="none" stroke="#3b82f6" stroke-width="${size * 0.02}" opacity="0.3"/>
  <text x="50%" y="58%" text-anchor="middle" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="${size * 0.38}" font-weight="800" letter-spacing="2">EF</text>
  <text x="50%" y="${size * 0.76}" text-anchor="middle" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="${size * 0.07}" font-weight="500">EliteFlow</text>
</svg>`
  return svg
}

async function main() {
  mkdirSync(publicDir, { recursive: true })

  for (const size of sizes) {
    const svgContent = await generateSVG(size)
    const svgPath = join(publicDir, `icon-${size}.svg`)
    writeFileSync(svgPath, svgContent)
    console.log(`✓ Created ${svgPath}`)

    // Also generate PNG using sharp if available
    try {
      const pngBuffer = await sharp(Buffer.from(svgContent))
        .resize(size, size)
        .png()
        .toBuffer()
      const pngPath = join(publicDir, `icon-${size}.png`)
      writeFileSync(pngPath, pngBuffer)
      console.log(`✓ Created ${pngPath}`)
    } catch (err) {
      console.log(`  (PNG generation requires sharp: npm install sharp)`)
    }
  }

  // Generate favicon
  try {
    const svgContent = await generateSVG(32)
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .resize(32, 32)
      .png()
      .toBuffer()
    writeFileSync(join(publicDir, "favicon.ico"), pngBuffer)
    console.log("✓ Created favicon.ico")
  } catch (err) {
    console.log("  (Favicon generation skipped - install sharp)")
  }

  console.log("\nDone! Icons generated in public/")
}

main().catch(console.error)
