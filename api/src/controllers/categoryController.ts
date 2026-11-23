import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

// Helper sederhana untuk generate slug dari nama kategori
const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Ganti spasi dengan tanda minus
    .replace(/[^\w\-]+/g, '')    // Hapus karakter non-alphanumeric
    .replace(/\-\-+/g, '-');     // Hilangkan tanda minus berulang
};

// 1. GET: Ambil semua kategori beserta jumlah produk di dalamnya
export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.categories.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar kategori',
      data: categories,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data kategori',
      error: error.message,
    });
  }
};

// 2. GET: Ambil detail kategori per ID (beserta daftar produk aktifnya)
export const getCategoryById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const categoryId = BigInt(id || '0');

    const category = await prisma.categories.findUnique({
      where: { id: categoryId },
      include: {
        products: {
          where: { is_active: true },
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            stock: true,
            image_url: true,
            kitchen_station: true,
          },
        },
      },
    });

    if (!category) {
      res.status(404).json({
        success: false,
        message: `Kategori dengan ID ${id} tidak ditemukan`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil detail kategori',
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail kategori',
      error: error.message,
    });
  }
};

// 3. POST: Tambah kategori baru
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, icon } = req.body;

    if (!name || name.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Nama kategori wajib diisi',
      });
      return;
    }

    const generatedSlug = slugify(name);

    // Cek apakah slug atau nama sudah digunakan
    const existing = await prisma.categories.findUnique({
      where: { slug: generatedSlug },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        message: `Kategori '${name}' sudah terdaftar`,
      });
      return;
    }

    const newCategory = await prisma.categories.create({
      data: {
        name,
        slug: generatedSlug,
        icon: icon || null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Kategori berhasil ditambahkan',
      data: newCategory,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan kategori',
      error: error.message,
    });
  }
};

// 4. PUT: Update kategori
export const updateCategory = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const categoryId = BigInt(id || '0');
    const { name, icon } = req.body;

    const existingCategory = await prisma.categories.findUnique({
      where: { id: categoryId },
    });

    if (!existingCategory) {
      res.status(404).json({
        success: false,
        message: `Kategori dengan ID ${id} tidak ditemukan`,
      });
      return;
    }

    let updatedSlug = existingCategory.slug;
    if (name && name !== existingCategory.name) {
      updatedSlug = slugify(name);

      // Cek apakah slug baru bentrok dengan kategori lain
      const duplicateSlug = await prisma.categories.findUnique({
        where: { slug: updatedSlug },
      });

      if (duplicateSlug && duplicateSlug.id !== categoryId) {
        res.status(409).json({
          success: false,
          message: `Kategori dengan nama '${name}' sudah ada`,
        });
        return;
      }
    }

    const updatedCategory = await prisma.categories.update({
      where: { id: categoryId },
      data: {
        name: name ?? existingCategory.name,
        slug: updatedSlug,
        icon: icon !== undefined ? icon : existingCategory.icon,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Kategori berhasil diperbarui',
      data: updatedCategory,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui kategori',
      error: error.message,
    });
  }
};

// 5. DELETE: Hapus kategori
export const deleteCategory = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const categoryId = BigInt(id || '0');

    // Cek apakah ada menu yang masih terkait dengan kategori ini
    const productCount = await prisma.products.count({
      where: { category_id: categoryId },
    });

    if (productCount > 0) {
      res.status(400).json({
        success: false,
        message: `Kategori tidak bisa dihapus karena masih digunakan oleh ${productCount} menu makanan/minuman.`,
      });
      return;
    }

    await prisma.categories.delete({
      where: { id: categoryId },
    });

    res.status(200).json({
      success: true,
      message: `Kategori dengan ID ${id} berhasil dihapus`,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: `Kategori dengan ID ${req.params.id} tidak ditemukan`,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Gagal menghapus kategori',
      error: error.message,
    });
  }
};