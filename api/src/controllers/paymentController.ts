import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { order_status_enum, payment_status_enum, table_status_enum } from '@prisma/client';
// @ts-ignore
import midtransClient from 'midtrans-client';

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
});

// 1. POST: Proses Pembayaran Order (Kasir Checkout)
export const processPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      order_id,
      payment_method_id,
      amount_paid,
      reference_number,
      discount_amount,
      tax_amount,
      total_amount,
    } = req.body;

    if (!order_id || !payment_method_id || amount_paid === undefined) {
      res.status(400).json({
        success: false,
        message: 'order_id, payment_method_id, dan amount_paid wajib diisi',
      });
      return;
    }

    const orderId = BigInt(order_id);
    const paymentMethodId = BigInt(payment_method_id);
    const paidAmount = Number(amount_paid);

    if (isNaN(paidAmount) || paidAmount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Nominal pembayaran harus berupa angka lebih dari 0',
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.orders.findUnique({
        where: { id: orderId },
        include: { payments: true, tables: true },
      });

      if (!order) throw new Error(`Pesanan dengan ID ${order_id} tidak ditemukan`);
      if (order.status === order_status_enum.BATAL) {
        throw new Error('Pesanan sudah dibatalkan dan tidak dapat dibayar');
      }
      if (order.payments) {
        // Jika sudah dilunaskan oleh webhook Midtrans 1 detik sebelumnya, langsung kembalikan data yang ada
        return { payment: order.payments, order };
      }

      const paymentMethod = await tx.payment_methods.findUnique({
        where: { id: paymentMethodId },
      });
      if (!paymentMethod || !paymentMethod.is_active) {
        throw new Error('Metode pembayaran tidak valid atau sedang dinonaktifkan');
      }

      // Gunakan nominal terbaru jika kasir menginput diskon, atau gunakan nominal bawaan order
      const finalDiscount =
        discount_amount !== undefined ? Number(discount_amount) : Number(order.discount_amount || 0);
      const finalTax =
        tax_amount !== undefined ? Number(tax_amount) : Number(order.tax_amount || 0);
      const totalBill =
        total_amount !== undefined ? Number(total_amount) : Number(order.total_amount);

      if (paidAmount < totalBill) {
        throw new Error(
          `Uang yang dibayarkan kurang! Total tagihan: Rp ${totalBill.toLocaleString('id-ID')}, Dibayar: Rp ${paidAmount.toLocaleString('id-ID')}`
        );
      }

      const changeAmount = paidAmount - totalBill;

      // 1. Catat Pembayaran ke tabel payments
      const payment = await tx.payments.create({
        data: {
          order_id: orderId,
          payment_method_id: paymentMethodId,
          amount_paid: paidAmount,
          change_amount: changeAmount,
          reference_number: reference_number ? String(reference_number).trim() : null,
          payment_status: payment_status_enum.LUNAS,
          paid_at: new Date(),
        },
        include: { payment_methods: true },
      });

      // 2. Update nominal diskon/pajak/total terbaru & ubah status Order menjadi SELESAI
      const updatedOrder = await tx.orders.update({
        where: { id: orderId },
        data: {
          discount_amount: finalDiscount,
          tax_amount: finalTax,
          total_amount: totalBill,
          status: order_status_enum.SELESAI,
        },
      });

      // 3. Bebaskan Meja jika DINE_IN
      if (order.table_id) {
        const otherActiveOrders = await tx.orders.count({
          where: {
            table_id: order.table_id,
            id: { not: orderId },
            status: { in: [order_status_enum.PENDING, order_status_enum.DIPROSES] },
          },
        });

        if (otherActiveOrders === 0) {
          await tx.tables.update({
            where: { id: order.table_id },
            data: { status: table_status_enum.TERSEDIA },
          });
        }
      }

      return { payment, order: updatedOrder };
    });

    res.status(201).json({
      success: true,
      message: 'Pembayaran berhasil diproses',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Gagal memproses pembayaran',
    });
  }
};

// 2. GET: Ambil Detail Pembayaran / Struk Kasir berdasarkan Order ID
export const getPaymentReceiptByOrderId = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const parsedOrderId = BigInt((orderId || '0') as string);

    const payment = await prisma.payments.findUnique({
      where: { order_id: parsedOrderId },
      include: {
        payment_methods: true,
        orders: {
          include: {
            users: { select: { id: true, name: true, username: true } },
            tables: { select: { id: true, table_number: true } },
            order_items: {
              include: {
                products: { select: { id: true, name: true, sku: true } },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        message: `Bukti pembayaran untuk pesanan ID ${orderId} tidak ditemukan`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil struk pembayaran',
      data: payment,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data struk pembayaran',
      error: error.message,
    });
  }
};

// 3. GET: Rekapitulasi Riwayat Pembayaran (Laporan Kasir Harian)
export const getAllPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { payment_method_id, date } = req.query;

    const whereClause: any = {};

    if (payment_method_id) {
      whereClause.payment_method_id = BigInt(payment_method_id as string);
    }

    if (date) {
      const targetDate = new Date(date as string);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      whereClause.paid_at = {
        gte: targetDate,
        lt: nextDay,
      };
    }

    const payments = await prisma.payments.findMany({
      where: whereClause,
      orderBy: { paid_at: 'desc' },
      include: {
        payment_methods: true,
        orders: {
          select: {
            order_number: true,
            customer_name: true,
            total_amount: true,
            order_type: true,
            users: { select: { name: true } },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil riwayat pembayaran',
      total: payments.length,
      data: payments,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil riwayat pembayaran',
      error: error.message,
    });
  }
};

// 4. PUT: Koreksi / Update Data Pembayaran (misal salah pilih metode atau salah input uang)
export const updatePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const paymentId = BigInt((id || '0') as string);
    const { payment_method_id, amount_paid, reference_number, payment_status } = req.body;

    const existingPayment = await prisma.payments.findUnique({
      where: { id: paymentId },
      include: { orders: true },
    });

    if (!existingPayment) {
      res.status(404).json({
        success: false,
        message: `Data pembayaran dengan ID ${id} tidak ditemukan`,
      });
      return;
    }

    let finalPaymentMethodId = existingPayment.payment_method_id;
    if (payment_method_id) {
      finalPaymentMethodId = BigInt(payment_method_id);
      const method = await prisma.payment_methods.findUnique({
        where: { id: finalPaymentMethodId },
      });
      if (!method || !method.is_active) {
        res.status(400).json({
          success: false,
          message: 'Metode pembayaran tidak valid atau tidak aktif',
        });
        return;
      }
    }

    const totalBill = Number(existingPayment.orders.total_amount);
    let finalAmountPaid = Number(existingPayment.amount_paid);

    if (amount_paid !== undefined) {
      const parsedPaid = Number(amount_paid);
      if (isNaN(parsedPaid) || parsedPaid < totalBill) {
        res.status(400).json({
          success: false,
          message: `Nominal pembayaran tidak valid! Minimal bayar: Rp ${totalBill.toLocaleString('id-ID')}`,
        });
        return;
      }
      finalAmountPaid = parsedPaid;
    }

    const updatedChange = finalAmountPaid - totalBill;

    const updatedPayment = await prisma.payments.update({
      where: { id: paymentId },
      data: {
        payment_method_id: finalPaymentMethodId,
        amount_paid: finalAmountPaid,
        change_amount: updatedChange,
        reference_number: reference_number !== undefined ? reference_number : existingPayment.reference_number,
        payment_status: payment_status || existingPayment.payment_status,
      },
      include: {
        payment_methods: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Data pembayaran berhasil diperbarui',
      data: updatedPayment,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui data pembayaran',
      error: error.message,
    });
  }
};

// 5. DELETE: Void / Batalkan Pembayaran (Hanya Superadmin)
export const deletePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const paymentId = BigInt((id || '0') as string);

    const existingPayment = await prisma.payments.findUnique({
      where: { id: paymentId },
      include: { orders: true },
    });

    if (!existingPayment) {
      res.status(404).json({
        success: false,
        message: `Data pembayaran dengan ID ${id} tidak ditemukan`,
      });
      return;
    }

    // Jalankan dalam transaksi: Hapus payment, kembalikan status order ke PENDING
    await prisma.$transaction(async (tx) => {
      // 1. Hapus rekod pembayaran
      await tx.payments.delete({
        where: { id: paymentId },
      });

      // 2. Kembalikan status pesanan ke PENDING
      await tx.orders.update({
        where: { id: existingPayment.order_id },
        data: { status: order_status_enum.PENDING },
      });

      // 3. Jika dine in, kunci kembali mejanya jadi TERISI
      if (existingPayment.orders.table_id) {
        await tx.tables.update({
          where: { id: existingPayment.orders.table_id },
          data: { status: table_status_enum.TERISI },
        });
      }
    });

    res.status(200).json({
      success: true,
      message: `Pembayaran ID ${id} berhasil dibatalkan (void). Status pesanan kembali menjadi PENDING.`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal membatalkan pembayaran',
      error: error.message,
    });
  }
};

export const createMidtransToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { order_ids, payment_method_id, total_amount } = req.body;

    if (!Array.isArray(order_ids) || order_ids.length === 0 || !payment_method_id) {
      res.status(400).json({
        success: false,
        message: 'order_ids (array) dan payment_method_id wajib diisi',
      });
      return;
    }

    const parsedOrderIds = order_ids.map((id: string | number) => BigInt(id));
    const orders = await prisma.orders.findMany({
      where: { id: { in: parsedOrderIds } },
      include: { payments: true },
    });

    if (orders.length === 0) {
      res.status(404).json({ success: false, message: 'Data pesanan tidak ditemukan' });
      return;
    }

    const invalidOrder = orders.find(
      (o) => o.payments !== null || o.status === order_status_enum.BATAL
    );
    if (invalidOrder) {
      res.status(400).json({
        success: false,
        message: `Pesanan ${invalidOrder.order_number} sudah lunas atau dibatalkan`,
      });
      return;
    }

    // Gunakan total_amount dari kalkulasi kasir jika ada, atau jumlahkan dari DB
    const calculatedTotal =
      total_amount !== undefined
        ? Number(total_amount)
        : orders.reduce((sum, ord) => sum + Number(ord.total_amount || 0), 0);

    const grossAmount = Math.round(calculatedTotal);

    if (grossAmount <= 0) {
      res.status(400).json({ success: false, message: 'Total tagihan harus lebih dari 0' });
      return;
    }

    const joinedIds = order_ids.join('_');
    const midtransOrderId = `POS-${payment_method_id}-${joinedIds}-${Date.now()}`;

    const parameter = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: orders[0].customer_name || 'Tamu Resto',
      },
    };

    const transaction = await snap.createTransaction(parameter);

    res.status(200).json({
      success: true,
      message: 'Berhasil membuat Snap Token Midtrans',
      data: {
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url,
        midtransOrderId,
      },
    });
  } catch (error: any) {
    console.error('Midtrans Token Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Gagal membuat transaksi Midtrans',
    });
  }
};

// =========================================================================
// 7. POST: Webhook Otomatis dari Server Midtrans (via ngrok)
// =========================================================================
export const midtransWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const notificationJson = req.body;

    // Verifikasi notifikasi resmi dari Midtrans
    const statusResponse = await snap.transaction.notification(notificationJson);
    const midtransOrderId: string = statusResponse.order_id;
    const transactionStatus: string = statusResponse.transaction_status;
    const fraudStatus: string = statusResponse.fraud_status;
    const transactionId: string = statusResponse.transaction_id;

    // Cek apakah status pembayaran sudah sukses/lunas
    const isPaid =
      (transactionStatus === 'capture' && fraudStatus === 'accept') ||
      transactionStatus === 'settlement';

    if (isPaid && midtransOrderId.startsWith('POS-')) {
      // Bongkar kembali format: POS-{methodId}-{id1_id2}-{timestamp}
      const parts = midtransOrderId.split('-');
      const paymentMethodId = BigInt(parts[1] || '1');
      const orderIdsStr = (parts[2] || '').split('_').filter(Boolean);

      await prisma.$transaction(async (tx) => {
        for (const idStr of orderIdsStr) {
          const orderId = BigInt(idStr);
          const order = await tx.orders.findUnique({
            where: { id: orderId },
            include: { payments: true },
          });

          // Skip jika pesanan tidak ada atau sudah dicatat lunas sebelumnya
          if (!order || order.payments) continue;

          const totalBill = Number(order.total_amount);

          // 1. Catat pembayaran LUNAS ke tabel payments
          await tx.payments.create({
            data: {
              order_id: orderId,
              payment_method_id: paymentMethodId,
              amount_paid: totalBill,
              change_amount: 0,
              reference_number: transactionId || midtransOrderId,
              payment_status: payment_status_enum.LUNAS,
              paid_at: new Date(),
            },
          });

          // 2. Ubah status order menjadi SELESAI
          await tx.orders.update({
            where: { id: orderId },
            data: { status: order_status_enum.SELESAI },
          });

          // 3. Bebaskan meja jika DINE_IN dan tidak ada pesanan aktif lain di meja itu
          if (order.table_id) {
            const otherActiveOrders = await tx.orders.count({
              where: {
                table_id: order.table_id,
                id: { not: orderId },
                status: { in: [order_status_enum.PENDING, order_status_enum.DIPROSES] },
              },
            });

            if (otherActiveOrders === 0) {
              await tx.tables.update({
                where: { id: order.table_id },
                data: { status: table_status_enum.TERSEDIA },
              });
            }
          }
        }
      });
    }

    // Midtrans wajib menerima status HTTP 200 OK
    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error: any) {
    console.error('Midtrans Webhook Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};