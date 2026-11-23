import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

// 1. GET: Ambil semua metode pembayaran (opsional filter ?is_active=true untuk kasir)
export const getAllPaymentMethods = async (req: Request, res: Response): Promise<void> => {
  try {
    const { is_active } = req.query;

    const whereClause: any = {};
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    const methods = await prisma.payment_methods.findMany({
      where: whereClause,
      orderBy: { id: 'asc' },
    });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar metode pembayaran',
      total: methods.length,
      data: methods,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data metode pembayaran',
      error: error.message,
    });
  }
};

// 2. GET: Detail metode pembayaran berdasarkan ID
export const getPaymentMethodById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const methodId = BigInt(id || '0');

    const method = await prisma.payment_methods.findUnique({
      where: { id: methodId },
    });

    if (!method) {
      res.status(404).json({
        success: false,
        message: `Metode pembayaran dengan ID ${id} tidak ditemukan`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil detail metode pembayaran',
      data: method,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail metode pembayaran',
      error: error.message,
    });
  }
};

// 3. POST: Tambah metode pembayaran baru
export const createPaymentMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code, is_active } = req.body;

    if (!name || !code) {
      res.status(400).json({
        success: false,
        message: 'Field name dan code wajib diisi',
      });
      return;
    }

    const formattedCode = code.trim().toUpperCase();

    // Cek apakah kode pembayaran unik
    const existingCode = await prisma.payment_methods.findUnique({
      where: { code: formattedCode },
    });

    if (existingCode) {
      res.status(409).json({
        success: false,
        message: `Kode metode pembayaran '${formattedCode}' sudah terdaftar`,
      });
      return;
    }

    const newMethod = await prisma.payment_methods.create({
      data: {
        name: name.trim(),
        code: formattedCode,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Metode pembayaran berhasil ditambahkan',
      data: newMethod,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan metode pembayaran',
      error: error.message,
    });
  }
};

// 4. PUT: Update penuh data metode pembayaran
export const updatePaymentMethod = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const methodId = BigInt(id || '0');
    const { name, code, is_active } = req.body;

    const existingMethod = await prisma.payment_methods.findUnique({
      where: { id: methodId },
    });

    if (!existingMethod) {
      res.status(404).json({
        success: false,
        message: `Metode pembayaran dengan ID ${id} tidak ditemukan`,
      });
      return;
    }

    let formattedCode = existingMethod.code;
    if (code && code.trim().toUpperCase() !== existingMethod.code) {
      formattedCode = code.trim().toUpperCase();
      const duplicateCode = await prisma.payment_methods.findUnique({
        where: { code: formattedCode },
      });

      if (duplicateCode && duplicateCode.id !== methodId) {
        res.status(409).json({
          success: false,
          message: `Kode pembayaran '${formattedCode}' sudah digunakan`,
        });
        return;
      }
    }

    const updatedMethod = await prisma.payment_methods.update({
      where: { id: methodId },
      data: {
        name: name ? name.trim() : existingMethod.name,
        code: formattedCode,
        is_active: is_active !== undefined ? Boolean(is_active) : existingMethod.is_active,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Metode pembayaran berhasil diperbarui',
      data: updatedMethod,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui metode pembayaran',
      error: error.message,
    });
  }
};

// 5. PATCH: Partial update (toggle is_active atau ubah nama saja)
export const patchPaymentMethod = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const methodId = BigInt(id || '0');
    const { name, code, is_active } = req.body;

    const existingMethod = await prisma.payment_methods.findUnique({
      where: { id: methodId },
    });

    if (!existingMethod) {
      res.status(404).json({
        success: false,
        message: `Metode pembayaran dengan ID ${id} tidak ditemukan`,
      });
      return;
    }

    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ success: false, message: 'Nama tidak boleh kosong' });
        return;
      }
      updateData.name = name.trim();
    }

    if (code !== undefined) {
      const formattedCode = code.trim().toUpperCase();
      if (formattedCode !== existingMethod.code) {
        const duplicate = await prisma.payment_methods.findUnique({
          where: { code: formattedCode },
        });

        if (duplicate && duplicate.id !== methodId) {
          res.status(409).json({
            success: false,
            message: `Kode pembayaran '${formattedCode}' sudah digunakan`,
          });
          return;
        }
      }
      updateData.code = formattedCode;
    }

    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active);
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'Tidak ada field yang dikirim untuk diperbarui',
      });
      return;
    }

    const updated = await prisma.payment_methods.update({
      where: { id: methodId },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: 'Metode pembayaran berhasil diperbarui secara parsial',
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui metode pembayaran',
      error: error.message,
    });
  }
};

// 6. DELETE: Hapus metode pembayaran
export const deletePaymentMethod = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const methodId = BigInt(id || '0');

    // Cek apakah metode pembayaran pernah dipakai transaksi di tabel payments
    const paymentCount = await prisma.payments.count({
      where: { payment_method_id: methodId },
    });

    if (paymentCount > 0) {
      res.status(400).json({
        success: false,
        message: `Metode pembayaran tidak dapat dihapus karena sudah tercatat dalam ${paymentCount} riwayat pembayaran. Silakan nonaktifkan (set is_active = false).`,
      });
      return;
    }

    await prisma.payment_methods.delete({
      where: { id: methodId },
    });

    res.status(200).json({
      success: true,
      message: `Metode pembayaran dengan ID ${id} berhasil dihapus`,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: `Metode pembayaran dengan ID ${req.params.id} tidak ditemukan`,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus metode pembayaran',
      error: error.message,
    });
  }
};