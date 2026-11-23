import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js"; // Sesuaikan path import prisma kamu

// 1. Ambil semua pelanggan (mendukung query ?search=nama_atau_hp)
export const getAllCustomers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const search = String(req.query.search || "").trim();

    const customers = await prisma.customers.findMany({
      where: {
        is_active: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        }),
      },
      include: {
        orders: {
          where: {
            status: "SELESAI", // Ganti/hapus filter ini jika ingin menghitung semua status order
          },
          select: {
            total_amount: true,
            order_items: {
              select: {
                quantity: true,
                products: {
                  select: {
                    points: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { id: "asc" },
    });
    const formattedCustomers = customers.map((cust) => {
      const totalBelanja = cust.orders.reduce(
        (sum, ord) => sum + Number(ord.total_amount || 0),
        0,
      );

      const totalPoin = cust.orders.reduce((orderSum, ord) => {
        const poinOrderIni = ord.order_items.reduce((itemSum, item) => {
          const poinProduk = Number(item.products?.points || 0);
          const qty = Number(item.quantity || 0);
          return itemSum + poinProduk * qty;
        }, 0);

        return orderSum + poinOrderIni;
      }, 0);

      // Opsional: Otomatis sesuaikan tier berdasarkan total belanja
      let tierBaru = cust.member_tier;
      if (totalBelanja >= 3000000) tierBaru = "VIP";
      else if (totalBelanja >= 1500000) tierBaru = "GOLD";
      else if (totalBelanja >= 500000) tierBaru = "SILVER";

      // Buang array `orders` mentah agar respon JSON tetap bersih, ganti `total_spent` dengan hasil hitungan
      const { orders, ...customerData } = cust;

      return {
        ...customerData,
        points: totalPoin,        
        member_tier: tierBaru,
        total_spent: totalBelanja,
        total_orders: orders.length, // Bonus: jumlah transaksi selesai
      };
    });

    res.status(200).json({
      success: true,
      message: "Berhasil mengambil data pelanggan",
      data: formattedCustomers,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data pelanggan",
      error: error.message,
    });
  }
};

// 2. Ambil detail 1 pelanggan beserta riwayat pesanannya
export const getCustomerById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const customerId = BigInt(String(req.params.id));

    const customer = await prisma.customers.findUnique({
      where: { id: customerId },
      include: {
        orders: {
          orderBy: { created_at: "desc" },
          take: 10, // Ambil 10 transaksi terakhir
        },
      },
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "Pelanggan tidak ditemukan",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil detail pelanggan",
      error: error.message,
    });
  }
};

// 3. Tambah pelanggan / member baru
export const createCustomer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { code, name, phone, email, notes } = req.body;

    if (!name || !phone) {
      res.status(400).json({
        success: false,
        message: "Nama dan nomor HP wajib diisi",
      });
      return;
    }

    // Cek apakah nomor HP sudah terdaftar
    const existingCustomer = await prisma.customers.findUnique({
      where: { phone: String(phone).trim() },
    });

    if (existingCustomer) {
      res.status(400).json({
        success: false,
        message: "Nomor HP sudah terdaftar sebagai pelanggan",
      });
      return;
    }

    const totalCustomers = await prisma.customers.count();
    const autoCode = String(totalCustomers + 1);
    const newCustomer = await prisma.customers.create({
      data: {
        code: code
          ? String(code).trim().padStart(2, "0")
          : autoCode.padStart(2, "0"),
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim() : null,
        notes: notes ? String(notes).trim() : null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Pelanggan berhasil ditambahkan",
      data: newCustomer,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan pelanggan",
      error: error.message,
    });
  }
};

// 4. Update data pelanggan
export const updateCustomer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const customerId = BigInt(String(req.params.id));
    const { name, phone, email, points, notes, is_active } = req.body;

    const existing = await prisma.customers.findUnique({
      where: { id: customerId },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Pelanggan tidak ditemukan",
      });
      return;
    }

    const updatedCustomer = await prisma.customers.update({
      where: { id: customerId },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(phone !== undefined && { phone: String(phone).trim() }),
        ...(email !== undefined && {
          email: email ? String(email).trim() : null,
        }),
        ...(points !== undefined && { points: Number(points) }),
        ...(notes !== undefined && { notes }),
        ...(is_active !== undefined && { is_active: Boolean(is_active) }),
        updated_at: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: "Data pelanggan berhasil diperbarui",
      data: updatedCustomer,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui data pelanggan",
      error: error.message,
    });
  }
};

// 5. Hapus pelanggan (Soft Delete: ubah is_active menjadi false)
export const deleteCustomer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const customerId = BigInt(String(req.params.id));
    const existing = await prisma.customers.findUnique({
      where: { id: customerId },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Pelanggan tidak ditemukan",
      });
      return;
    }

    await prisma.customers.update({
      where: { id: customerId },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: "Pelanggan berhasil dinonaktifkan",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus pelanggan",
      error: error.message,
    });
  }
};
