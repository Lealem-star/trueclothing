import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

export const storageService = {
  /**
   * Process and save an image buffer using Sharp.
   * Creates a main image (max width 1600px, WebP) and a thumbnail (max width 400px, WebP).
   * Returns relative URLs.
   */
  async saveImage(buffer, originalName = 'image.jpg') {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    const hash = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const cleanBase = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30);
    const filename = `${cleanBase || 'img'}-${timestamp}-${hash}.webp`;
    const thumbFilename = `thumb-${filename}`;

    const filePath = path.join(UPLOADS_DIR, filename);
    const thumbPath = path.join(UPLOADS_DIR, thumbFilename);

    // Main image: max width 1600, quality 85 webp
    await sharp(buffer)
      .rotate() // Auto-orient based on EXIF
      .resize(1600, null, { withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(filePath);

    // Thumbnail: max width 400, quality 80 webp
    await sharp(buffer)
      .rotate()
      .resize(400, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(thumbPath);

    return {
      url: `/uploads/${filename}`,
      thumbUrl: `/uploads/${thumbFilename}`,
      filename
    };
  },

  /**
   * Delete an image and its thumbnail by URL or filename
   */
  async deleteImage(url) {
    if (!url) return;
    try {
      const filename = path.basename(url);
      const thumbFilename = filename.startsWith('thumb-') ? filename : `thumb-${filename}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      const thumbPath = path.join(UPLOADS_DIR, thumbFilename);

      await fs.unlink(filePath).catch(() => {});
      await fs.unlink(thumbPath).catch(() => {});
    } catch (err) {
      console.warn('Failed to delete image file:', err.message);
    }
  }
};

