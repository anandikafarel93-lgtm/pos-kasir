import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { table_status_enum } from '@prisma/client';

// 1. GET: Ambil semua meja (bisa filter ?status=TERSEDIA)
export const getAllTables = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;

    const whereClause: any = {};
    if (status && Object.values(table_status_enum).includes(status as table_status_enum)) {
      whereClause.status = status as table_status_enum;
    }

    const tables = await prisma.tables.findMany({
      where: whereClause,
      orderBy: { table_number: 'asc' },
    });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar meja',
      total: tables.length,
      data: tables,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data meja',
      error: error.message,
    });
  }
};

// 2. GET: Detail meja berdasarkan ID
export const getTableById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tableId = BigInt(id || '0');

    const table = await prisma.tables.findUnique({
      where: { id: tableId },
      include: {
        orders: {
          where: {
            status: { in: ['PENDING', 'DIPROSES'] },
          },
          select: {
            id: true,
            order_number: true,
            customer_name: true,
            status: true,
            total_amount: true,
            created_at: true,
          },
        },
      },
    });

    if (!table) {
      res.status(404).json({
        success: false,
        message: `Meja dengan ID ${id} tidak ditemukan`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil detail meja',
      data: table,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail meja',
      error: error.message,
    });
  }
};

// 3. POST: Tambah meja baru
export const createTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { table_number, capacity, status } = req.body;

    if (!table_number) {
      res.status(400).json({
        success: false,
        message: 'Nomor / nama meja wajib diisi',
      });
      return;
    }

    const existingTable = await prisma.tables.findUnique({
      where: { table_number },
    });

    if (existingTable) {
      res.status(409).json({
        success: false,
        message: `Nomor meja '${table_number}' sudah terdaftar`,
      });
      return;
    }

    const newTable = await prisma.tables.create({
      data: {
        table_number,
        capacity: capacity ? Number(capacity) : 4,
        status: status || table_status_enum.TERSEDIA,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Meja berhasil ditambahkan',
      data: newTable,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan meja',
      error: error.message,
    });
  }
};

// 4. PUT: Update data meja (nomor, kapasitas, status)
export const updateTable = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tableId = BigInt(id || '0');
    const { table_number, capacity, status } = req.body;

    const existingTable = await prisma.tables.findUnique({
      where: { id: tableId },
    });

    if (!existingTable) {
      res.status(404).json({
        success: false,
        message: `Meja dengan ID ${id} tidak ditemukan`,
      });
      return;
    }

    if (table_number && table_number !== existingTable.table_number) {
      const duplicateTable = await prisma.tables.findUnique({
        where: { table_number },
      });

      if (duplicateTable && duplicateTable.id !== tableId) {
        res.status(409).json({
          success: false,
          message: `Nomor meja '${table_number}' sudah digunakan`,
        });
        return;
      }
    }

    const updatedTable = await prisma.tables.update({
      where: { id: tableId },
      data: {
        table_number: table_number ?? existingTable.table_number,
        capacity: capacity !== undefined ? Number(capacity) : existingTable.capacity,
        status: status ?? existingTable.status,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Data meja berhasil diperbarui',
      data: updatedTable,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui data meja',
      error: error.message,
    });
  }
};

// 5. PATCH: Update status meja cepat (untuk operasional kasir / pelayan)
export const updateTableStatus = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tableId = BigInt(id || '0');
    const { status } = req.body;

    if (!status || !Object.values(table_status_enum).includes(status)) {
      res.status(400).json({
        success: false,
        message: `Status tidak valid. Pilihan status: ${Object.values(table_status_enum).join(', ')}`,
      });
      return;
    }

    const updatedTable = await prisma.tables.update({
      where: { id: tableId },
      data: { status },
    });

    res.status(200).json({
      success: true,
      message: `Status meja berhasil diubah menjadi ${status}`,
      data: updatedTable,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: `Meja dengan ID ${req.params.id} tidak ditemukan`,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Gagal mengubah status meja',
      error: error.message,
    });
  }
};

// PATCH: Partial update meja (table_number, capacity, dan/atau status)
export const patchTable = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tableId = BigInt(id || '0');
    const { table_number, capacity, status } = req.body;

    // 1. Cek apakah meja ada
    const existingTable = await prisma.tables.findUnique({
      where: { id: tableId },
    });

    if (!existingTable) {
      res.status(404).json({
        success: false,
        message: `Meja dengan ID ${id} tidak ditemukan`,
      });
      return;
    }

    // 2. Siapkan data yang akan diupdate secara dinamis
    const updateData: any = {};

    // Validasi & masukkan table_number jika dikirim
    if (table_number !== undefined) {
      if (typeof table_number !== 'string' || table_number.trim() === '') {
        res.status(400).json({ success: false, message: 'Nomor meja tidak boleh kosong' });
        return;
      }

      // Cek apakah nomor meja baru sudah dipakai meja lain
      if (table_number !== existingTable.table_number) {
        const duplicate = await prisma.tables.findUnique({
          where: { table_number },
        });

        if (duplicate && duplicate.id !== tableId) {
          res.status(409).json({
            success: false,
            message: `Nomor meja '${table_number}' sudah digunakan`,
          });
          return;
        }
      }

      updateData.table_number = table_number;
    }

    // Validasi & masukkan capacity jika dikirim
    if (capacity !== undefined) {
      const parsedCapacity = Number(capacity);
      if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
        res.status(400).json({ success: false, message: 'Kapasitas harus berupa angka lebih dari 0' });
        return;
      }
      updateData.capacity = parsedCapacity;
    }

    // Validasi & masukkan status jika dikirim
    if (status !== undefined) {
      if (!Object.values(table_status_enum).includes(status)) {
        res.status(400).json({
          success: false,
          message: `Status tidak valid. Pilihan: ${Object.values(table_status_enum).join(', ')}`,
        });
        return;
      }
      updateData.status = status;
    }

    // Jika body kosong (tidak ada field yang dikirim)
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'Tidak ada data yang dikirim untuk diperbarui',
      });
      return;
    }

    // 3. Eksekusi update
    const updatedTable = await prisma.tables.update({
      where: { id: tableId },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: 'Data meja berhasil diperbarui secara parsial',
      data: updatedTable,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui data meja',
      error: error.message,
    });
  }
};

// 6. DELETE: Hapus meja
export const deleteTable = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tableId = BigInt(id || '0');

    // Cek apakah meja punya order yang belum selesai
    const activeOrderCount = await prisma.orders.count({
      where: {
        table_id: tableId,
        status: { in: ['PENDING', 'DIPROSES'] },
      },
    });

    if (activeOrderCount > 0) {
      res.status(400).json({
        success: false,
        message: 'Meja tidak dapat dihapus karena masih memiliki pesanan aktif yang sedang berlangsung.',
      });
      return;
    }

    await prisma.tables.delete({
      where: { id: tableId },
    });

    res.status(200).json({
      success: true,
      message: `Meja dengan ID ${id} berhasil dihapus`,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: `Meja dengan ID ${req.params.id} tidak ditemukan`,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus meja',
      error: error.message,
    });
  }
};