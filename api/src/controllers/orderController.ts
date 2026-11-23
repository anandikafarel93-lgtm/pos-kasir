import { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { AuthRequest } from "../middlewares/authMiddleware.js";
import {
  order_type_enum,
  order_status_enum,
  kitchen_status_enum,
  table_status_enum,
} from "@prisma/client";

// Helper membuat nomor order unik harian: ORD-YYYYMMDD-XXXX
const generateOrderNumber = async (): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const datePrefix = `ORD-${year}${month}${day}`;

  const todayCount = await prisma.orders.count({
    where: {
      order_number: { startsWith: datePrefix },
    },
  });

  const sequence = String(todayCount + 1).padStart(4, "0");
  return `${datePrefix}-${sequence}`;
};

// 1. GET: Ambil daftar order dengan filter status, tipe, meja, dan tanggal
export const getAllOrders = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { status, order_type, table_id, date } = req.query;

    const whereClause: any = {};

    if (
      status &&
      Object.values(order_status_enum).includes(status as order_status_enum)
    ) {
      whereClause.status = status as order_status_enum;
    }

    if (
      order_type &&
      Object.values(order_type_enum).includes(order_type as order_type_enum)
    ) {
      whereClause.order_type = order_type as order_type_enum;
    }

    if (table_id) {
      whereClause.table_id = BigInt(table_id as string);
    }

    if (date) {
      const targetDate = new Date(date as string);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      whereClause.created_at = {
        gte: targetDate,
        lt: nextDay,
      };
    }

    const orders = await prisma.orders.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      include: {
        users: { select: { id: true, name: true, username: true } },
        tables: { select: { id: true, table_number: true } },
        order_items: {
          include: {
            products: {
              select: {
                id: true,
                name: true,
                image_url: true,
                kitchen_station: true, 
              },
            },
          },
        },
        payments: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Berhasil mengambil daftar pesanan",
      total: orders.length,
      data: orders,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil daftar pesanan",
      error: error.message,
    });
  }
};

// 2. GET: Detail satu pesanan berdasarkan ID
export const getOrderById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const orderId = BigInt((id || "0") as string);

    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        users: { select: { id: true, name: true, username: true } },
        tables: true,
        order_items: {
          include: {
            products: {
              select: {
                id: true,
                sku: true,
                name: true,
                image_url: true,
                kitchen_station: true,
              },
            },
          },
        },
        payments: {
          include: {
            payment_methods: true,
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        message: `Pesanan dengan ID ${id} tidak ditemukan`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Berhasil mengambil detail pesanan",
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil detail pesanan",
      error: error.message,
    });
  }
};

// 3. POST: Buat Pesanan Baru (Checkout Kasir / POS)
export const createOrder = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res
        .status(401)
        .json({ success: false, message: "User tidak teridentifikasi" });
      return;
    }

    const {
      table_id,
      customer_name,
      customer_id,
      order_type = order_type_enum.DINE_IN,
      discount_amount = 0,
      items, // Array of { product_id, quantity, notes }
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: "Pesanan harus berisi minimal satu item produk",
      });
      return;
    }

    // Validasi meja jika DINE_IN
    let parsedTableId: bigint | null = null;
    if (order_type === order_type_enum.DINE_IN) {
      if (!table_id) {
        res.status(400).json({
          success: false,
          message: "table_id wajib diisi untuk tipe pesanan DINE_IN",
        });
        return;
      }

      parsedTableId = BigInt(table_id);
      const table = await prisma.tables.findUnique({
        where: { id: parsedTableId },
      });
      if (!table) {
        res
          .status(404)
          .json({ success: false, message: "Meja tidak ditemukan" });
        return;
      }
    }

    // Jalankan seluruh mutasi dalam transaksi database atomic
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil data produk dan validasi ketersediaan stok
      const productIds = items.map((i: any) => BigInt(i.product_id));
      const products = await tx.products.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== items.length) {
        throw new Error(
          "Salah satu atau lebih produk yang dipilih tidak ditemukan",
        );
      }

      const productMap = new Map<string, (typeof products)[0]>();
      for (const p of products) {
        productMap.set(p.id.toString(), p);
      }

      let subtotal = 0;
      const orderItemsData: any[] = [];

      for (const item of items) {
        const product = productMap.get(item.product_id.toString());
        if (!product)
          throw new Error(`Produk ID ${item.product_id} tidak valid`);
        if (!product.is_active)
          throw new Error(`Produk '${product.name}' sedang tidak aktif`);

        const qty = Number(item.quantity);
        if (isNaN(qty) || qty <= 0) {
          throw new Error(
            `Quantity untuk '${product.name}' harus lebih dari 0`,
          );
        }

        if (product.stock < qty) {
          throw new Error(
            `Stok produk '${product.name}' tidak mencukupi (sisa: ${product.stock}, diminta: ${qty})`,
          );
        }

        const unitPrice = Number(product.price);
        const itemSubtotal = unitPrice * qty;
        subtotal += itemSubtotal;

        orderItemsData.push({
          product_id: product.id,
          quantity: qty,
          unit_price: unitPrice,
          subtotal: itemSubtotal,
          notes: item.notes ? String(item.notes).trim() : null,
          kitchen_status: kitchen_status_enum.MENUNGGU,
        });

        // Potong stok produk
        await tx.products.update({
          where: { id: product.id },
          data: { stock: { decrement: qty } },
        });
      }

      // Hitung pajak resto PB1 (10%) setelah diskon
      const discount = Number(discount_amount) || 0;
      const taxableAmount = Math.max(0, subtotal - discount);
      const taxAmount = Math.round(taxableAmount * 0.1); // PB1 10%
      const totalAmount = taxableAmount + taxAmount;

      const orderNumber = await generateOrderNumber();
      // const parseCustId = BigInt(customer_id);

      // 2. Buat header order dan rincian item sekaligus
      const createdOrder = await tx.orders.create({
        data: {
          order_number: orderNumber,
          user_id: BigInt(userId),
          table_id: parsedTableId,
          customer_name: customer_name ? customer_name.trim() : "Tamu",
          customer_id: customer_id ? BigInt(customer_id) : null,
          order_type: order_type as order_type_enum,
          status: order_status_enum.PENDING,
          subtotal,
          discount_amount: discount,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          order_items: {
            create: orderItemsData,
          },
        },
        include: {
          tables: true,
          order_items: {
            include: {
              products: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      });

      // 3. Jika DINE_IN, ubah status meja jadi TERISI
      if (parsedTableId) {
        await tx.tables.update({
          where: { id: parsedTableId },
          data: { status: table_status_enum.TERISI },
        });
      }

      return createdOrder;
    });

    res.status(201).json({
      success: true,
      message: "Pesanan berhasil dibuat",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Gagal membuat pesanan",
    });
  }
};

// 4. PATCH: Update status pesanan (SELESAI / BATAL)
export const updateOrderStatus = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const orderId = BigInt((id || "0") as string);
    const { status } = req.body;

    if (!status || !Object.values(order_status_enum).includes(status)) {
      res.status(400).json({
        success: false,
        message: `Status tidak valid. Pilihan: ${Object.values(order_status_enum).join(", ")}`,
      });
      return;
    }

    const existingOrder = await prisma.orders.findUnique({
      where: { id: orderId },
      include: { order_items: true },
    });

    if (!existingOrder) {
      res
        .status(404)
        .json({ success: false, message: "Pesanan tidak ditemukan" });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Jika pesanan dibatalkan (BATAL), kembalikan stok produk & bebaskan meja
      if (
        status === order_status_enum.BATAL &&
        existingOrder.status !== order_status_enum.BATAL
      ) {
        for (const item of existingOrder.order_items) {
          await tx.products.update({
            where: { id: item.product_id },
            data: { stock: { increment: item.quantity } },
          });
        }

        if (existingOrder.table_id) {
          await tx.tables.update({
            where: { id: existingOrder.table_id },
            data: { status: table_status_enum.TERSEDIA },
          });
        }
      }

      // Jika pesanan selesai dan meja terkait tidak memiliki order aktif lain, ubah meja jadi TERSEDIA
      if (status === order_status_enum.SELESAI && existingOrder.table_id) {
        const remainingActiveOrders = await tx.orders.count({
          where: {
            table_id: existingOrder.table_id,
            id: { not: orderId },
            status: { in: ["PENDING", "DIPROSES"] },
          },
        });

        if (remainingActiveOrders === 0) {
          await tx.tables.update({
            where: { id: existingOrder.table_id },
            data: { status: table_status_enum.TERSEDIA },
          });
        }
      }

      return tx.orders.update({
        where: { id: orderId },
        data: { status },
      });
    });

    res.status(200).json({
      success: true,
      message: `Status pesanan berhasil diubah menjadi ${status}`,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui status pesanan",
      error: error.message,
    });
  }
};
