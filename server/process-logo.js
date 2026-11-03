import sharp from 'sharp';
import fs from 'fs/promises';

async function processLogo() {
  const inputPath = 'client/public/true-clothing-logo.jpg';
  const img = sharp(inputPath);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels; // 3 (RGB)

  // Create an RGBA buffer with background transparency
  const rgbaBuffer = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];

    rgbaBuffer[i * 4] = r;
    rgbaBuffer[i * 4 + 1] = g;
    rgbaBuffer[i * 4 + 2] = b;

    // The background is light off-white (around r: 240-255, g: 240-255, b: 240-255)
    // If pixel is very close to white/light gray paper, calculate smooth alpha
    const minVal = Math.min(r, g, b);
    const maxVal = Math.max(r, g, b);
    const brightness = (r + g + b) / 3;

    if (brightness > 244 && (maxVal - minVal) < 18) {
      // Background paper: transparent
      rgbaBuffer[i * 4 + 3] = 0;
    } else if (brightness > 220 && (maxVal - minVal) < 22) {
      // Soft transition border
      const alpha = Math.max(0, Math.min(255, Math.round((244 - brightness) * 10)));
      rgbaBuffer[i * 4 + 3] = alpha;
    } else {
      // Foreground graphic/text: full opacity
      rgbaBuffer[i * 4 + 3] = 255;
    }
  }

  // 1. Save transparent logo
  await sharp(rgbaBuffer, { raw: { width, height, channels: 4 } })
    .png()
    .toFile('client/public/logo-transparent.png');

  // Also copy to server uploads
  await sharp(rgbaBuffer, { raw: { width, height, channels: 4 } })
    .png()
    .toFile('server/uploads/logo-transparent.png');

  // 2. Crop dress emblem icon (approx top: 120, left: 220, width: 220, height: 230)
  const dressMark = await sharp(rgbaBuffer, { raw: { width, height, channels: 4 } })
    .extract({ left: 220, top: 130, width: 220, height: 230 })
    .png()
    .toFile('client/public/logo-dress-mark.png');

  // 3. Create Favicon (64x64 and 32x32)
  await sharp('client/public/logo-dress-mark.png')
    .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('client/public/favicon.png');

  console.log('✔ Logo processed successfully: logo-transparent.png, logo-dress-mark.png, favicon.png');
}

processLogo().catch(console.error);

