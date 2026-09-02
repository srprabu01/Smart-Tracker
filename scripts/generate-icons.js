import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgString = fs.readFileSync(path.join(process.cwd(), 'public', 'icon.svg'));

async function generate() {
  await sharp(svgString)
    .resize(192, 192)
    .png()
    .toFile(path.join(process.cwd(), 'public', 'pwa-192x192.png'));
    
  await sharp(svgString)
    .resize(512, 512)
    .png()
    .toFile(path.join(process.cwd(), 'public', 'pwa-512x512.png'));
    
  // Maskable icon (usually padded or a different shape)
  // For this simple case, we'll use the same as it's a squircle
  await sharp(svgString)
    .resize(512, 512)
    .png()
    .toFile(path.join(process.cwd(), 'public', 'pwa-maskable-512x512.png'));
    
  // Apple touch icon
  await sharp(svgString)
    .resize(180, 180)
    .png()
    .toFile(path.join(process.cwd(), 'public', 'apple-touch-icon.png'));
    
  console.log('Icons generated successfully!');
}

generate().catch(console.error);
