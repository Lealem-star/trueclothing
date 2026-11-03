import express from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAdmin } from '../middlewares/auth.js';
import { uploadImages } from '../middlewares/upload.js';
import { storageService } from '../services/storageService.js';
import { activityService } from '../services/activityService.js';

const router = express.Router();

const productSchema = z.object({
  nameEn: z.string().min(1, 'Name (English) is required'),
  nameAm: z.string().optional().nullable(),
  category: z.enum(['SHIFON', 'HABESHA', 'FABRIC']),
  price: z.coerce.number().positive('Price must be greater than 0'),
  sizes: z.preprocess(val => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return val.split(',').map(s => s.trim()).filter(Boolean); }
    }
    return val;
  }, z.array(z.string()).default([])),
  descriptionEn: z.string().min(1, 'Description is required'),
  descriptionAm: z.string().optional().nullable(),
  published: z.preprocess(val => val === 'true' || val === true || val === 1 || val === '1', z.boolean()).default(true)
});

// GET /products - List products (Public: published only; Admin: can pass all=true)
router.get('/', async (req, res, next) => {
  try {
    const { category, search, all } = req.query;
    const where = {};

    // Filter published unless admin passes all=true with authorization
    if (all === 'true') {
      // Allow only if admin or staff
    } else {
      where.published = true;
    }

    if (category && category !== 'All' && category !== 'ALL') {
      const catUpper = category.toUpperCase();
      if (['SHIFON', 'HABESHA', 'FABRIC'].includes(catUpper)) {
        where.category = catUpper;
      }
    }

    if (search) {
      where.OR = [
        { nameEn: { contains: search } },
        { descriptionEn: { contains: search } }
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        images: {
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      count: products.length,
      products: products.map(p => ({
        ...p,
        price: Number(p.price)
      }))
    });
  } catch (err) {
    next(err);
  }
});

// GET /products/admin/all - Admin products listing
router.get('/admin/all', requireAdmin, async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const where = {};

    if (category && category !== 'All' && category !== 'ALL') {
      const catUpper = category.toUpperCase();
      if (['SHIFON', 'HABESHA', 'FABRIC'].includes(catUpper)) {
        where.category = catUpper;
      }
    }

    if (search) {
      where.OR = [
        { nameEn: { contains: search } },
        { descriptionEn: { contains: search } }
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        images: {
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      products: products.map(p => ({
        ...p,
        price: Number(p.price)
      }))
    });
  } catch (err) {
    next(err);
  }
});

// GET /products/:id - Single product
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // If not published, check if admin request
    if (!product.published) {
      // If no admin token, return 404
      const token = req.cookies?.tc_admin_token || req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(404).json({ error: 'Product not found' });
      }
    }

    res.json({
      success: true,
      product: {
        ...product,
        price: Number(product.price)
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /products - Admin create product with optional images
router.post('/', requireAdmin, uploadImages.array('images', 5), async (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);

    const product = await prisma.product.create({
      data: {
        nameEn: data.nameEn,
        nameAm: data.nameAm,
        category: data.category,
        price: data.price,
        sizes: data.sizes,
        descriptionEn: data.descriptionEn,
        descriptionAm: data.descriptionAm,
        published: data.published
      }
    });

    // Save uploaded images
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const saved = await storageService.saveImage(file.buffer, file.originalname);
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: saved.url,
            sortOrder: i
          }
        });
      }
    }

    const fullProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: { images: { orderBy: { sortOrder: 'asc' } } }
    });

    await activityService.log('ADMIN', `Created product "${product.nameEn}" (${product.category})`, req.admin.adminId);

    res.status(201).json({
      success: true,
      product: {
        ...fullProduct,
        price: Number(fullProduct.price)
      }
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /products/:id - Admin update product
router.patch('/:id', requireAdmin, uploadImages.array('images', 5), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { images: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const data = productSchema.partial().parse(req.body);

    const updateData = {};
    if (data.nameEn !== undefined) updateData.nameEn = data.nameEn;
    if (data.nameAm !== undefined) updateData.nameAm = data.nameAm;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.sizes !== undefined) updateData.sizes = data.sizes;
    if (data.descriptionEn !== undefined) updateData.descriptionEn = data.descriptionEn;
    if (data.descriptionAm !== undefined) updateData.descriptionAm = data.descriptionAm;
    if (data.published !== undefined) updateData.published = data.published;

    await prisma.product.update({
      where: { id },
      data: updateData
    });

    // If new images were uploaded, append them
    if (req.files && req.files.length > 0) {
      const currentCount = existing.images.length;
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const saved = await storageService.saveImage(file.buffer, file.originalname);
        await prisma.productImage.create({
          data: {
            productId: id,
            url: saved.url,
            sortOrder: currentCount + i
          }
        });
      }
    }

    // Check if client requested deleting specific existing image IDs
    if (req.body.deleteImageIds) {
      let idsToDelete = [];
      try {
        idsToDelete = Array.isArray(req.body.deleteImageIds) 
          ? req.body.deleteImageIds 
          : JSON.parse(req.body.deleteImageIds);
      } catch {
        idsToDelete = [req.body.deleteImageIds];
      }

      for (const imgId of idsToDelete) {
        const img = existing.images.find(x => x.id === imgId);
        if (img) {
          await storageService.deleteImage(img.url);
          await prisma.productImage.delete({ where: { id: imgId } });
        }
      }
    }

    const updated = await prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: 'asc' } } }
    });

    await activityService.log('ADMIN', `Updated product "${updated.nameEn}"`, req.admin.adminId);

    res.json({
      success: true,
      product: {
        ...updated,
        price: Number(updated.price)
      }
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /products/:id/publish - Toggle published
router.patch('/:id/publish', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { published } = req.body;

    const updated = await prisma.product.update({
      where: { id },
      data: { published: Boolean(published) },
      include: { images: true }
    });

    await activityService.log(
      'ADMIN',
      `Product "${updated.nameEn}" ${updated.published ? 'published' : 'hidden from shop'}`,
      req.admin.adminId
    );

    res.json({
      success: true,
      product: {
        ...updated,
        price: Number(updated.price)
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /products/:id - Delete product
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { images: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Clean up images from disk
    for (const img of existing.images) {
      await storageService.deleteImage(img.url);
    }

    await prisma.product.delete({ where: { id } });

    await activityService.log('ADMIN', `Deleted product "${existing.nameEn}"`, req.admin.adminId);

    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;

