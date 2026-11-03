import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');

const SOURCE_IMAGES = [
  {
    prodName: 'Sample shifon dress',
    sourceFile: 'C:\\Users\\leale\\.gemini\\antigravity\\brain\\dcb13756-a46e-4d13-bb8b-b2b529f07e30\\shifon_dress_luxury_1793728306097.jpg',
    targetName: 'shifon-dress-1.webp'
  },
  {
    prodName: 'Sample Habesha dress 1',
    sourceFile: 'C:\\Users\\leale\\.gemini\\antigravity\\brain\\dcb13756-a46e-4d13-bb8b-b2b529f07e30\\habesha_kemis_royal_tibeb_1793728327367.jpg',
    targetName: 'habesha-dress-1.webp'
  },
  {
    prodName: 'Sample Habesha dress 2',
    sourceFile: 'C:\\Users\\leale\\.gemini\\antigravity\\brain\\dcb13756-a46e-4d13-bb8b-b2b529f07e30\\habesha_kemis_modern_celebration_1793728343871.jpg',
    targetName: 'habesha-dress-2.webp'
  },
  {
    prodName: 'Sample fabric',
    sourceFile: 'C:\\Users\\leale\\.gemini\\antigravity\\brain\\dcb13756-a46e-4d13-bb8b-b2b529f07e30\\luxury_shifon_fabric_roll_1793728364055.jpg',
    targetName: 'sample-fabric-1.webp'
  }
];

async function updateImages() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  for (const item of SOURCE_IMAGES) {
    try {
      console.log(`Processing ${item.targetName} from ${item.sourceFile}...`);
      const buffer = await fs.readFile(item.sourceFile);

      const targetPath = path.join(UPLOADS_DIR, item.targetName);
      const thumbPath = path.join(UPLOADS_DIR, `thumb-${item.targetName}`);

      // High-res WebP
      await sharp(buffer)
        .resize(1200, 1500, { fit: 'cover' })
        .webp({ quality: 88 })
        .toFile(targetPath);

      // Thumbnail
      await sharp(buffer)
        .resize(400, 500, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(thumbPath);

      const url = `/uploads/${item.targetName}?v=${Date.now()}`;

      // Update in DB
      const prod = await prisma.product.findFirst({
        where: { nameEn: item.prodName }
      });

      if (prod) {
        await prisma.productImage.deleteMany({ where: { productId: prod.id } });
        await prisma.productImage.create({
          data: {
            productId: prod.id,
            url,
            sortOrder: 0
          }
        });
        console.log(`✔ Updated image for "${item.prodName}"`);
      }
    } catch (err) {
      console.error(`Error processing ${item.prodName}:`, err.message);
    }
  }

  await prisma.$disconnect();
}

updateImages();

