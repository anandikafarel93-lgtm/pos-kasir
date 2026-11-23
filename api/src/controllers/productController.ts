import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

// 1. GET: Ambil semua produk menu dengan filter pencarian & kategori
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category_id, search, is_active  } = req.query;

    const whereClause: any = {};

    // Filter kategori jika dikirim
    if (category_id) {
      whereClause.category_id = BigInt(category_id as string);
    }

    // if (stock) {
    //   whereClause.stock = BigInt(category_id as string);
    // }

    // Filter stasiun dapur (misal: 'dapur_utama' vs 'bar_minuman')
    // if (kitchen_station) {
    //   whereClause.kitchen_station = kitchen_station as string;
    // }

    // Filter status aktif/habis
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    // Pencarian berdasarkan nama produk atau SKU
    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
        { kitchen_station: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.products.findMany({
      where: whereClause,
      orderBy: { id: 'asc' },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar produk menu',
      total: products.length,
      data: products,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data produk menu',
      error: error.message,
    });
  }
};

// 2. GET: Detail produk menu berdasarkan ID
export const getProductById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const productId = BigInt(id || '0');

    const product = await prisma.products.findUnique({
      where: { id: productId },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
    });

    if (!product) {
      res.status(404).json({
        success: false,
        message: `Produk dengan ID ${id} tidak ditemukan`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil detail produk menu',
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail produk menu',
      error: error.message,
    });
  }
};

// 3. POST: Tambah produk menu baru
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      category_id,
      sku,
      name,
      points,
      description,
      cost_price,
      price,
      stock,
      kitchen_station,
      is_active,
    } = req.body;

    if (!category_id || !name || price === undefined) {
      res.status(400).json({
        success: false,
        message: 'Field category_id, name, dan price wajib diisi',
      });
      return;
    }

    // Ambil path gambar jika ada file di-upload
    let finalImageUrl: string | null = req.body.image_url || null;
    if (req.file) {
      // Menghasilkan URL publik: /uploads/products/nama-file.jpg
      finalImageUrl = `/uploads/products/${req.file.filename}`;
    }

    const newProduct = await prisma.products.create({
      data: {
        category_id: BigInt(category_id),
        sku: sku || null,
        name,
        points: points !== undefined ? Number(points) : 0,
        description: description || null,
        cost_price: cost_price ? Number(cost_price) : 0,
        price: Number(price),
        stock: stock !== undefined ? Number(stock) : 0,
        image_url: finalImageUrl,
        kitchen_station: kitchen_station || 'dapur_utama',
        is_active: is_active !== undefined ? String(is_active) === 'true' : true,
      },
      include: {
        categories: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Produk menu berhasil ditambahkan',
      data: newProduct,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan produk menu',
      error: error.message,
    });
  }
};

// 4. PUT: Update data produk menu
export const updateProduct = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const productId = BigInt(id || '0');
    const {
      category_id,
      sku,
      name,
      points,
      description,
      cost_price,
      price,
      stock,
      image_url,
      kitchen_station,
      is_active,
    } = req.body;

    const existingProduct = await prisma.products.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      res.status(404).json({
        success: false,
        message: `Produk dengan ID ${id} tidak ditemukan`,
      });
      return;
    }

    // Validasi kategori baru jika diubah
    if (category_id && BigInt(category_id) !== existingProduct.category_id) {
      const categoryExists = await prisma.categories.findUnique({
        where: { id: BigInt(category_id) },
      });

      if (!categoryExists) {
        res.status(404).json({
          success: false,
          message: `Kategori dengan ID ${category_id} tidak ditemukan`,
        });
        return;
      }
    }

    // Validasi duplikasi SKU baru jika diubah
    if (sku && sku !== existingProduct.sku) {
      const duplicateSku = await prisma.products.findUnique({
        where: { sku },
      });

      if (duplicateSku && duplicateSku.id !== productId) {
        res.status(409).json({
          success: false,
          message: `Kode SKU '${sku}' sudah digunakan produk lain`,
        });
        return;
      }
    }

    // ==============================================================
    // PERBAIKAN LOGIKA GAMBAR DISINI:
    // Jika ada file fisik baru di-upload via Multer, gunakan path baru.
    // Jika tidak ada file baru, pertahankan URL gambar yang lama.
    // ==============================================================
    let finalImageUrl = existingProduct.image_url;
    if (req.file) {
      finalImageUrl = `/uploads/products/${req.file.filename}`;
    } else if (image_url !== undefined) {
      finalImageUrl = image_url || null;
    }

    const updatedProduct = await prisma.products.update({
      where: { id: productId },
      data: {
        category_id: category_id ? BigInt(category_id) : existingProduct.category_id,
        sku: sku !== undefined ? sku : existingProduct.sku,
        name: name ?? existingProduct.name,
        points: points !== undefined ? Number(points) : existingProduct.points,
        description: description !== undefined ? description : existingProduct.description,
        cost_price: cost_price !== undefined ? Number(cost_price) : existingProduct.cost_price,
        price: price !== undefined ? Number(price) : existingProduct.price,
        stock: stock !== undefined ? Number(stock) : existingProduct.stock,
        image_url: finalImageUrl, // <-- Masukkan finalImageUrl disini
        kitchen_station: kitchen_station ?? existingProduct.kitchen_station,
        is_active: is_active !== undefined ? String(is_active) === 'true' : existingProduct.is_active,
      },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Produk menu berhasil diperbarui',
      data: updatedProduct,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui produk menu',
      error: error.message,
    });
  }
};

// 5. DELETE: Hapus produk menu
export const deleteProduct = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const productId = BigInt(id || '0');

    // Cek apakah produk pernah dipesan dalam transaksi order_items
    const orderItemsCount = await prisma.order_items.count({
      where: { product_id: productId },
    });

    if (orderItemsCount > 0) {
      res.status(400).json({
        success: false,
        message: `Produk tidak dapat dihapus permanen karena terdapat ${orderItemsCount} riwayat transaksi pesanan terkait. Sebagai alternatif, set status is_active menjadi false.`,
      });
      return;
    }

    await prisma.products.delete({
      where: { id: productId },
    });

    res.status(200).json({
      success: true,
      message: `Produk dengan ID ${id} berhasil dihapus`,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: `Produk dengan ID ${req.params.id} tidak ditemukan`,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Gagal menghapus produk menu',
      error: error.message,
    });
  }
};