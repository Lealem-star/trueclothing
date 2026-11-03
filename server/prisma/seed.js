import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

// Create stylish SVG illustrations for sample products and render to WebP
async function generateSampleProductImage(filename, title, subtitle, bgColor, patternColor) {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const svg = `
  <svg width="800" height="800" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgColor}" />
        <stop offset="100%" stop-color="#1E1B4B" />
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#F2B705" />
        <stop offset="50%" stop-color="#FFF2A3" />
        <stop offset="100%" stop-color="#F2B705" />
      </linearGradient>
      <pattern id="tibeb" width="40" height="40" patternUnits="userSpaceOnUse">
        <polygon points="20,0 40,20 20,40 0,20" fill="none" stroke="${patternColor}" stroke-width="2" opacity="0.3"/>
        <circle cx="20" cy="20" r="4" fill="${patternColor}" opacity="0.4"/>
      </pattern>
    </defs>

    <rect width="800" height="800" fill="url(#bg)" />
    <rect width="800" height="800" fill="url(#tibeb)" />

    <!-- Stylized dress/fabric silhouette -->
    <g transform="translate(400, 360)">
      <!-- Halo accent -->
      <circle cx="0" cy="-20" r="220" fill="#ffffff" opacity="0.04" />
      <circle cx="0" cy="-20" r="160" fill="#ffffff" opacity="0.06" />

      <!-- Dress silhouette -->
      <path d="M-60,-140 Q0,-160 60,-140 L70,-100 Q80,-40 60,0 L140,220 Q0,240 -140,220 L-60,0 Q-80,-40 -70,-100 Z"
            fill="#ffffff" opacity="0.9" />

      <!-- Ethiopian Tibeb border embroidery bands -->
      <path d="M-40,-50 Q0,-40 40,-50 L45,-30 Q0,-20 -45,-30 Z" fill="url(#gold)" />
      <path d="M-90,130 Q0,150 90,130 L105,170 Q0,190 -105,170 Z" fill="url(#gold)" />
      <path d="M-130,205 Q0,230 130,205 L140,220 Q0,240 -140,220 Z" fill="${patternColor}" />
      
      <!-- Center sash / vertical embroidery -->
      <line x1="0" y1="-50" x2="0" y2="130" stroke="url(#gold)" stroke-width="8" stroke-dasharray="10 5" />
    </g>

    <!-- Label Banner -->
    <rect x="60" y="650" width="680" height="90" rx="16" fill="#1E1B4B" opacity="0.88" />
    <text x="400" y="692" font-family="'DM Sans', sans-serif" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">${title}</text>
    <text x="400" y="722" font-family="'DM Sans', sans-serif" font-size="16" font-weight="600" fill="#F2B705" text-anchor="middle">${subtitle}</text>
  </svg>
  `;

  const webpPath = path.join(UPLOADS_DIR, filename);
  const thumbPath = path.join(UPLOADS_DIR, `thumb-${filename}`);

  await sharp(Buffer.from(svg))
    .webp({ quality: 90 })
    .toFile(webpPath);

  await sharp(Buffer.from(svg))
    .resize(400, 400)
    .webp({ quality: 80 })
    .toFile(thumbPath);

  return `/uploads/${filename}`;
}

async function main() {
  console.log('Seeding True Clothing database...');

  // 1. Settings from prototype
  await prisma.setting.upsert({
    where: { id: 1 },
    update: {
      businessName: 'True clothing',
      phone: '0985698888',
      telegramUrl: 't.me/Trueclothing16',
      alertOnOrders: true,
      alertOnRequests: true,
      payTelebirr: true,
      payCbeBirr: true,
      payBank: false
    },
    create: {
      id: 1,
      businessName: 'True clothing',
      phone: '0985698888',
      telegramUrl: 't.me/Trueclothing16',
      alertOnOrders: true,
      alertOnRequests: true,
      payTelebirr: true,
      payCbeBirr: true,
      payBank: false
    }
  });
  console.log('✔ Settings seeded');

  // 2. Admin user from env
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.adminUser.upsert({
    where: { username: adminUsername },
    update: { passwordHash },
    create: {
      username: adminUsername,
      passwordHash
    }
  });
  console.log(`✔ Admin user seeded: ${admin.username} / [password from env]`);

  // 3. Generate sample product images
  console.log('Generating product images...');
  const imgShifon = await generateSampleProductImage('shifon-dress-1.webp', 'True Shifon Elegance', 'Pure Silk Chiffon • Handcrafted in Addis Ababa', '#4338CA', '#818CF8');
  const imgHabesha1 = await generateSampleProductImage('habesha-dress-1.webp', 'Habesha Kemis Royal Tibeb', 'Traditional Ethiopian Cotton • Gold Weave', '#047857', '#F59E0B');
  const imgHabesha2 = await generateSampleProductImage('habesha-dress-2.webp', 'Modern Habesha Kemis', 'Lightweight Shemma • Contemporary Cut', '#B45309', '#FCD34D');
  const imgFabric = await generateSampleProductImage('sample-fabric-1.webp', 'Premium Shifon Fabric', 'Grade-A Ethiopian Fabric • Wholesale Sourcing', '#6D28D9', '#C084FC');

  // 4. Sample products from prototype
  // Clear existing products and recreate for clean state
  await prisma.productImage.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.product.deleteMany();

  const p1 = await prisma.product.create({
    data: {
      nameEn: 'Sample shifon dress',
      nameAm: 'የተመረጠ የሽፎን ቀሚስ',
      category: 'SHIFON',
      price: 2500.00,
      sizes: ['S', 'M', 'L', 'XL'],
      descriptionEn: 'Sample product. Edit or replace it in Admin, Products.',
      descriptionAm: 'ምርጥ የሽፎን ቀሚስ በዘመናዊ ዲዛይን የተዘጋጀ።',
      published: true,
      images: {
        create: [{ url: imgShifon, sortOrder: 0 }]
      }
    }
  });

  const p2 = await prisma.product.create({
    data: {
      nameEn: 'Sample Habesha dress 1',
      nameAm: 'የሀበሻ ቀሚስ 1',
      category: 'HABESHA',
      price: 4200.00,
      sizes: ['S', 'M', 'L'],
      descriptionEn: 'Sample product. Beautiful traditional Habesha Kemis with gold embroidery.',
      descriptionAm: 'በወርቅ ጥልፍ ያጌጠ ውብ የሀበሻ ባህላዊ ቀሚስ።',
      published: true,
      images: {
        create: [{ url: imgHabesha1, sortOrder: 0 }]
      }
    }
  });

  const p3 = await prisma.product.create({
    data: {
      nameEn: 'Sample Habesha dress 2',
      nameAm: 'የሀበሻ ቀሚስ 2',
      category: 'HABESHA',
      price: 3800.00,
      sizes: ['M', 'L'],
      descriptionEn: 'Sample product. Modern cut Habesha dress perfect for special celebrations.',
      descriptionAm: 'ለበዓላት እና ለልዩ ዝግጅቶች ተስማሚ ዘመናዊ የሀበሻ ቀሚስ።',
      published: true,
      images: {
        create: [{ url: imgHabesha2, sortOrder: 0 }]
      }
    }
  });

  const p4 = await prisma.product.create({
    data: {
      nameEn: 'Sample fabric',
      nameAm: 'የተመረጠ ጨርቅ',
      category: 'FABRIC',
      price: 900.00,
      sizes: [],
      descriptionEn: 'Sample fabric, price per piece.',
      descriptionAm: 'ጥራት ያለው የሽፎን እና የጥጥ ጨርቅ በሜትር።',
      published: true,
      images: {
        create: [{ url: imgFabric, sortOrder: 0 }]
      }
    }
  });
  console.log('✔ 4 sample products created');

  // 5. Customers
  const cust1 = await prisma.customer.upsert({
    where: { phone: '+251911000000' },
    update: { name: 'Sample customer' },
    create: { phone: '+251911000000', name: 'Sample customer' }
  });

  const cust2 = await prisma.customer.upsert({
    where: { phone: '+251911000001' },
    update: { name: 'Sample customer 2' },
    create: { phone: '+251911000001', name: 'Sample customer 2' }
  });

  const cust3 = await prisma.customer.upsert({
    where: { phone: '+251922000000' },
    update: { name: 'Sample trader' },
    create: { phone: '+251922000000', name: 'Sample trader' }
  });

  // 6. Sample orders
  await prisma.order.deleteMany();
  await prisma.order.create({
    data: {
      code: '#0001',
      customerId: cust1.id,
      customerName: 'Sample customer',
      customerPhone: '+251911000000',
      type: 'CUSTOM_DESIGN',
      description: 'Sample custom order',
      total: 5000.00,
      status: 'IN_PRODUCTION',
      paymentStatus: 'PARTLY_PAID',
      notes: 'Initial fitting scheduled'
    }
  });

  await prisma.order.create({
    data: {
      code: '#0002',
      customerId: cust2.id,
      customerName: 'Sample customer 2',
      customerPhone: '+251911000001',
      type: 'READY_MADE',
      description: 'Sample dress ×1',
      total: 2500.00,
      status: 'SHIPPED',
      paymentStatus: 'PAID',
      notes: 'Shipped via EMS express',
      items: {
        create: [{
          productId: p1.id,
          nameSnapshot: p1.nameEn,
          size: 'M',
          quantity: 1,
          unitPrice: 2500.00
        }]
      }
    }
  });
  console.log('✔ Sample orders #0001 and #0002 created');

  // 7. Order Counter initialized to 2
  await prisma.orderCounter.upsert({
    where: { id: 1 },
    update: { lastNumber: 2 },
    create: { id: 1, lastNumber: 2 }
  });
  console.log('✔ OrderCounter set to 2');

  // 8. Sample request from prototype
  await prisma.request.deleteMany();
  await prisma.request.create({
    data: {
      type: 'WHOLESALE',
      customerId: cust3.id,
      name: 'Sample trader',
      phone: '+251922000000',
      details: {
        'Quantity (pieces)': '50',
        'Product or fabric': 'Habesha dresses with custom embroidery'
      },
      status: 'NEW',
      notes: 'Looking for weekly bulk shipments to Hawassa'
    }
  });
  console.log('✔ Sample request created');

  // 9. Activity Log
  await prisma.activityLog.create({
    data: {
      actorType: 'SYSTEM',
      message: 'Demo data loaded'
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

