import { useState, useEffect, type FC, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import type { AdminLayoutContextType } from "../../components/layout/AdminLayout";
import { TopBar } from "../../components/layout/TopBar";
import Swal from "sweetalert2";
import {
  Wallet,
  PlusCircle,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  X,
  Printer,
  CreditCard,
  Money,
  CheckCircle,
  QrCode,
  CalendarBlank,
  Receipt,
} from "@phosphor-icons/react";
import {
  getPaymentsApi,
  getPaymentReceiptByOrderIdApi,
  processPaymentApi,
  updatePaymentApi,
  deletePaymentApi,
} from "../../api/paymentApi";
import { getPaymentMethodsApi } from "../../api/paymentMethodApi";
import { getOrdersApi } from "../../api/orderApi";
import type {
  PaymentItem,
  ProcessPaymentPayload,
  UpdatePaymentPayload,
} from "../../types/payment";
import type { PaymentMethodItem } from "../../types/paymentMethod";
import type { OrderItem } from "../../types/order";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});



export const PaymentsPage: FC = () => {
  const { openMobileSidebar } = useOutletContext<AdminLayoutContextType>();

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [unpaidOrders, setUnpaidOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterMethod, setFilterMethod] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");

  // Modal Proses Pembayaran (Baru)
  const [isProcessModalOpen, setIsProcessModalOpen] = useState<boolean>(false);
  const [processLoading, setProcessLoading] = useState<boolean>(false);
  const [processError, setProcessError] = useState<string>("");
  const [processForm, setProcessForm] = useState<ProcessPaymentPayload>({
    order_id: "",
    payment_method_id: "",
    amount_paid: 0,
    reference_number: "",
  });

  // Modal Edit Pembayaran (Koreksi)
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(
    null,
  );
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>("");
  const [editForm, setEditForm] = useState<UpdatePaymentPayload>({
    payment_method_id: "",
    amount_paid: 0,
    reference_number: "",
    payment_status: "LUNAS",
  });

  // Modal Struk Nota (Receipt)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<PaymentItem | null>(null);
  const [receiptLoading, setReceiptLoading] = useState<boolean>(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await getPaymentsApi({
        payment_method_id: filterMethod || undefined,
        date: filterDate || undefined,
      });
      setPayments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Gagal mengambil data pembayaran:", err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxiliaryData = async () => {
    try {
      const [methodsData, ordersPending, ordersDiproses] = await Promise.all([
        getPaymentMethodsApi(true),
        getOrdersApi({ status: "PENDING" }),
        getOrdersApi({ status: "DIPROSES" }),
      ]);
      setPaymentMethods(Array.isArray(methodsData) ? methodsData : []);
      const combinedOrders = [
        ...(Array.isArray(ordersPending) ? ordersPending : []),
        ...(Array.isArray(ordersDiproses) ? ordersDiproses : []),
      ];
      setUnpaidOrders(combinedOrders);
    } catch (err: any) {
      console.error("Gagal memuat data relasi kasir:", err);
    }
  };

  useEffect(() => {
    fetchAuxiliaryData();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [filterMethod, filterDate]);

  // Handle Buka Modal Bayar Order
  const handleOpenProcessModal = (targetOrderId?: string | number) => {
    fetchAuxiliaryData();
    const defaultOrderId = targetOrderId
      ? String(targetOrderId)
      : unpaidOrders[0]?.id
        ? String(unpaidOrders[0].id)
        : "";
    const selectedOrd = unpaidOrders.find(
      (o) => String(o.id) === defaultOrderId,
    );

    setProcessForm({
      order_id: defaultOrderId,
      payment_method_id: paymentMethods[0]?.id
        ? String(paymentMethods[0].id)
        : "",
      amount_paid: selectedOrd ? Number(selectedOrd.total_amount) : 0,
      reference_number: "",
    });
    setProcessError("");
    setIsProcessModalOpen(true);
  };

  const selectedOrderObj = unpaidOrders.find(
    (o) => String(o.id) === String(processForm.order_id),
  );
  const changeAmountCalculated = Math.max(
    0,
    (Number(processForm.amount_paid) || 0) -
      (Number(selectedOrderObj?.total_amount) || 0),
  );

  const handleProcessSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProcessError("");

    if (!processForm.order_id) {
      setProcessError("Pilih pesanan yang ingin dibayar");
      return;
    }
    if (!processForm.payment_method_id) {
      setProcessError("Pilih metode pembayaran");
      return;
    }

    const bill = Number(selectedOrderObj?.total_amount) || 0;
    if (Number(processForm.amount_paid) < bill) {
      setProcessError(
        `Nominal bayar kurang! Total tagihan: Rp ${bill.toLocaleString("id-ID")}`,
      );
      return;
    }

    setProcessLoading(true);
    try {
      const res = await processPaymentApi({
        ...processForm,
        amount_paid: Number(processForm.amount_paid),
        reference_number: processForm.reference_number?.trim() || undefined,
      });

      Toast.fire({
        icon: "success",
        title: "Pembayaran berhasil diproses!",
      });

      setIsProcessModalOpen(false);
      fetchPayments();
      fetchAuxiliaryData();

      // Buka otomatis struk kasir
      handleOpenReceipt(res.payment.order_id);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Gagal memproses pembayaran";
      setProcessError(msg);
      Toast.fire({ icon: "error", title: msg });
    } finally {
      setProcessLoading(false);
    }
  };

  // Handle Edit/Koreksi Pembayaran
  const handleOpenEditModal = (item: PaymentItem) => {
    setSelectedPayment(item);
    setEditForm({
      payment_method_id: item.payment_method_id,
      amount_paid: Number(item.amount_paid),
      reference_number: item.reference_number || "",
      payment_status: item.payment_status,
    });
    setEditError("");
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setEditError("");
    setEditLoading(true);

    try {
      await updatePaymentApi(selectedPayment.id, {
        payment_method_id: editForm.payment_method_id,
        amount_paid: Number(editForm.amount_paid),
        reference_number: editForm.reference_number?.trim() || undefined,
        payment_status: editForm.payment_status,
      });

      Toast.fire({
        icon: "success",
        title: "Data pembayaran berhasil dikoreksi",
      });

      setIsEditModalOpen(false);
      fetchPayments();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Gagal mengupdate pembayaran";
      setEditError(msg);
      Toast.fire({ icon: "error", title: msg });
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Void / Batalkan Pembayaran
  const handleDeletePayment = async (item: PaymentItem) => {
    const result = await Swal.fire({
      title: "Batalkan (Void) Pembayaran?",
      text: `Pembayaran sebesar Rp ${Number(item.amount_paid).toLocaleString("id-ID")} akan dibatalkan. Status pesanan akan dikembalikan menjadi PENDING.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Void Transaksi!",
      cancelButtonText: "Batal",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        await deletePaymentApi(item.id);
        Toast.fire({
          icon: "success",
          title: "Pembayaran berhasil dibatalkan",
        });
        fetchPayments();
        fetchAuxiliaryData();
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "Gagal Void",
          text:
            err.response?.data?.message ||
            "Terjadi kesalahan saat membatalkan pembayaran.",
          confirmButtonColor: "#059669",
        });
      }
    }
  };

  // Handle Buka Struk
  const handleOpenReceipt = async (orderId: string | number) => {
    try {
      setIsReceiptModalOpen(true);
      setReceiptLoading(true);
      const data = await getPaymentReceiptByOrderIdApi(orderId);
      setReceiptData(data);
    } catch (err: any) {
      Toast.fire({
        icon: "error",
        title: err.response?.data?.message || "Gagal memuat struk pembayaran",
      });
      setIsReceiptModalOpen(false);
    } finally {
      setReceiptLoading(false);
    }
  };

  const renderMethodBadge = (code?: string, name?: string) => {
    const c = (code || "").toUpperCase();
    if (c.includes("TUNAI") || c.includes("CASH")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
          <Money size={14} weight="bold" /> {name || "Tunai"}
        </span>
      );
    }
    if (c.includes("QRIS")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
          <QrCode size={14} weight="bold" /> {name || "QRIS"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
        <CreditCard size={14} weight="bold" /> {name || "Transfer/Kartu"}
      </span>
    );
  };

  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const orderNum = p.orders?.order_number?.toLowerCase() || "";
    const cust = p.orders?.customer_name?.toLowerCase() || "";
    const ref = p.reference_number?.toLowerCase() || "";
    return orderNum.includes(q) || cust.includes(q) || ref.includes(q);
  });

  const totalOmzetLunas = payments
    .filter((p) => p.payment_status === "LUNAS")
    .reduce(
      (acc, curr) =>
        acc + Number(curr.amount_paid) - (Number(curr.change_amount) || 0),
      0,
    );

  return (
    <>
      <TopBar
        title="Kasir & Pembayaran (Payments)"
        subtitle="Kelola transaksi pembayaran tagihan order, struk nota kasir, dan rekonsiliasi harian."
        onOpenMobileSidebar={openMobileSidebar}
        actions={
          <button
            type="button"
            onClick={() => handleOpenProcessModal()}
            className="px-3.5 md:px-4 py-2 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer"
          >
            <PlusCircle size={18} weight="bold" />
            <span className="hidden sm:inline">Proses Pembayaran Baru</span>
            <span className="sm:hidden">Bayar</span>
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Ringkasan Finansial Kasir */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Total Uang Masuk Bersih
              </p>
              <h3 className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">
                Rp {totalOmzetLunas.toLocaleString("id-ID")}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
              <Wallet size={28} weight="bold" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Transaksi Lunas
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                {payments.filter((p) => p.payment_status === "LUNAS").length}{" "}
                Struk
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
              <Receipt size={28} weight="bold" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Menunggu Pembayaran
              </p>
              <h3 className="text-2xl font-extrabold text-amber-600 mt-1">
                {unpaidOrders.length} Tagihan
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl">
              <Money size={28} weight="bold" />
            </div>
          </div>
        </div>

        {/* Tabel Data Riwayat Pembayaran */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative w-full sm:w-64">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari order, tamu, atau ref..."
                  className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Filter Metode Bayar */}
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Semua Metode</option>
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={String(pm.id)}>
                    {pm.name}
                  </option>
                ))}
              </select>

              {/* Filter Tanggal */}
              <div className="relative">
                <CalendarBlank
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <span className="text-xs text-slate-500 whitespace-nowrap">
              Total <b>{filteredPayments.length}</b> pembayaran tercatat
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">No. Pesanan</th>
                  <th className="py-3.5 px-6">Pelanggan</th>
                  <th className="py-3.5 px-6">Metode</th>
                  <th className="py-3.5 px-6">Nominal Bayar</th>
                  <th className="py-3.5 px-6">Kembalian</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Waktu Bayar</th>
                  <th className="py-3.5 px-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-slate-400 font-medium"
                    >
                      Memuat riwayat pembayaran...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-slate-400 font-medium"
                    >
                      Tidak ada catatan pembayaran yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((pay) => (
                    <tr
                      key={pay.id}
                      className="hover:bg-slate-50/80 transition"
                    >
                      <td className="py-4 px-6 font-mono font-extrabold text-slate-900">
                        {pay.orders?.order_number || `ORD-#${pay.order_id}`}
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-800">
                          {pay.orders?.customer_name || "Tamu"}
                        </p>
                        {pay.reference_number && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Ref: {pay.reference_number}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {renderMethodBadge(
                          pay.payment_methods?.code,
                          pay.payment_methods?.name,
                        )}
                      </td>
                      <td className="py-4 px-6 font-mono font-extrabold text-emerald-600">
                        Rp {Number(pay.amount_paid).toLocaleString("id-ID")}
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-600">
                        Rp{" "}
                        {Number(pay.change_amount || 0).toLocaleString("id-ID")}
                      </td>
                      <td className="py-4 px-6">
                        {pay.payment_status === "LUNAS" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle size={13} weight="fill" /> Lunas
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {pay.payment_status || "Pending"}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-500 text-[11px]">
                        {new Date(pay.paid_at).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenReceipt(pay.order_id)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Cetak Struk Nota"
                          >
                            <Printer size={16} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(pay)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Koreksi Pembayaran"
                          >
                            <PencilSimple size={16} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(pay)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Void / Batalkan Transaksi"
                          >
                            <Trash size={16} weight="bold" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ================= MODAL PROSES PEMBAYARAN BARU ================= */}
      {isProcessModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet size={22} weight="bold" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Pembayaran Tagihan (Checkout)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Pilih pesanan pending lalu selesaikan transaksi kasir.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProcessModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <form
              onSubmit={handleProcessSubmit}
              className="p-6 space-y-4 text-xs font-semibold"
            >
              {processError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
                  {processError}
                </div>
              )}

              {/* Pilih Order Pending */}
              <div>
                <label className="block text-slate-700 mb-1">
                  Pilih Tagihan Pesanan
                </label>
                {unpaidOrders.length === 0 ? (
                  <div className="p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-normal">
                    Tidak ada pesanan pending saat ini. Semua pesanan sudah
                    lunas atau belum dibuat.
                  </div>
                ) : (
                  <select
                    required
                    value={processForm.order_id}
                    onChange={(e) => {
                      const selected = unpaidOrders.find(
                        (o) => String(o.id) === e.target.value,
                      );
                      setProcessForm({
                        ...processForm,
                        order_id: e.target.value,
                        amount_paid: selected
                          ? Number(selected.total_amount)
                          : 0,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-normal"
                  >
                    <option value="">Pilih Nomor Pesanan</option>
                    {unpaidOrders.map((ord) => (
                      <option key={ord.id} value={String(ord.id)}>
                        {ord.order_number} - {ord.customer_name} (Rp{" "}
                        {Number(ord.total_amount).toLocaleString("id-ID")})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Rincian Singkat Tagihan */}
              {selectedOrderObj && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      Total yang Harus Dibayar:
                    </span>
                    <span className="text-lg font-mono font-extrabold text-slate-900">
                      Rp{" "}
                      {Number(selectedOrderObj.total_amount).toLocaleString(
                        "id-ID",
                      )}
                    </span>
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    <p>
                      Tamu:{" "}
                      <span className="font-bold text-slate-700">
                        {selectedOrderObj.customer_name}
                      </span>
                    </p>
                    <p>
                      Meja:{" "}
                      <span className="font-bold text-emerald-700">
                        {selectedOrderObj.tables?.table_number || "-"}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Pilih Metode Pembayaran */}
              <div>
                <label className="block text-slate-700 mb-1">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((pm) => {
                    const isSelected =
                      String(processForm.payment_method_id) === String(pm.id);
                    return (
                      <button
                        type="button"
                        key={pm.id}
                        onClick={() =>
                          setProcessForm({
                            ...processForm,
                            payment_method_id: String(pm.id),
                          })
                        }
                        className={`p-3 rounded-xl border flex items-center justify-between transition cursor-pointer text-left ${
                          isSelected
                            ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div>
                          <p className="font-bold">{pm.name}</p>
                          <span className="text-[10px] font-mono text-slate-400">
                            {pm.code}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle
                            size={18}
                            weight="bold"
                            className="text-emerald-600"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nominal Pembayaran */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">
                    Uang Diterima (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={processForm.amount_paid || ""}
                    onChange={(e) =>
                      setProcessForm({
                        ...processForm,
                        amount_paid:
                          e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-bold text-emerald-600 text-base"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">
                    Kembalian (Rp)
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono font-bold text-slate-700 text-base">
                    Rp {changeAmountCalculated.toLocaleString("id-ID")}
                  </div>
                </div>
              </div>

              {/* Nomor Referensi (Opsional) */}
              <div>
                <label className="block text-slate-700 mb-1">
                  Nomor Referensi Transaksi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="ID Transaksi QRIS / No. Rekening EDC"
                  value={processForm.reference_number || ""}
                  onChange={(e) =>
                    setProcessForm({
                      ...processForm,
                      reference_number: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-normal"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProcessModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={processLoading || unpaidOrders.length === 0}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {processLoading ? "Menyimpan..." : "Bayar Sekarang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL KOREKSI / EDIT PEMBAYARAN ================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-extrabold text-slate-900">
                Koreksi Data Pembayaran
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <form
              onSubmit={handleEditSubmit}
              className="p-6 space-y-4 text-xs font-semibold"
            >
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={editForm.payment_method_id}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      payment_method_id: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                >
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={String(pm.id)}>
                      {pm.name} ({pm.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">
                  Nominal Uang Diterima (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editForm.amount_paid || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      amount_paid:
                        e.target.value === "" ? 0 : Number(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-bold text-emerald-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">
                  Nomor Referensi
                </label>
                <input
                  type="text"
                  placeholder="ID Transaksi / Reference"
                  value={editForm.reference_number || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      reference_number: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-normal"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20 font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {editLoading ? "Menyimpan..." : "Perbarui Pembayaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL STRUK NOTA KASIR ================= */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Receipt size={18} className="text-emerald-600" />
                Struk Pembayaran Kasir
              </h3>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {receiptLoading ? (
                <p className="text-center py-8 text-slate-400 text-xs">
                  Menyiapkan struk kasir...
                </p>
              ) : !receiptData ? (
                <p className="text-center py-8 text-slate-400 text-xs">
                  Struk tidak ditemukan.
                </p>
              ) : (
                <div
                  id="printable-receipt"
                  className="space-y-4 font-mono text-xs"
                >
                  {/* Header Struk */}
                  <div className="text-center border-b border-dashed border-slate-300 pb-3">
                    <h2 className="text-base font-extrabold tracking-wider text-slate-900 font-sans">
                      RESTO NUSANTARA
                    </h2>
                    <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                      Jl. Kuliner Utama No. 88, Bekasi
                    </p>
                    <p className="text-[10px] text-slate-500 font-sans">
                      Telp: 0822-2194-3632
                    </p>
                  </div>

                  {/* Metadata Order */}
                  <div className="text-[11px] text-slate-600 space-y-1 border-b border-dashed border-slate-300 pb-3">
                    <div className="flex justify-between">
                      <span>No. Nota:</span>
                      <span className="font-bold text-slate-800">
                        {receiptData.orders?.order_number}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tanggal:</span>
                      <span>
                        {new Date(receiptData.paid_at).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kasir / Staf:</span>
                      <span>{receiptData.orders?.users?.name || "Kasir"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pelanggan / Meja:</span>
                      <span>
                        {receiptData.orders?.customer_name} (
                        {receiptData.orders?.tables?.table_number
                          ? `Meja ${receiptData.orders.tables.table_number}`
                          : "Bungkus"}
                        )
                      </span>
                    </div>
                  </div>

                  {/* Rincian Menu */}
                  <div className="border-b border-dashed border-slate-300 pb-3 space-y-2">
                    {receiptData.orders?.order_items?.map((item) => (
                      <div key={item.id} className="text-[11px]">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>{item.products?.name}</span>
                          <span>
                            Rp {Number(item.subtotal).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.quantity} x Rp{" "}
                          {Number(item.unit_price).toLocaleString("id-ID")}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Kalkulasi Pembayaran */}
                  <div className="text-[11px] space-y-1.5 border-b border-dashed border-slate-300 pb-3">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>
                        Rp{" "}
                        {Number(
                          receiptData.orders?.subtotal || 0,
                        ).toLocaleString("id-ID")}
                      </span>
                    </div>
                    {Number(receiptData.orders?.discount_amount) > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Diskon:</span>
                        <span>
                          - Rp{" "}
                          {Number(
                            receiptData.orders?.discount_amount,
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Pajak Restoran (10%):</span>
                      <span>
                        Rp{" "}
                        {Number(
                          receiptData.orders?.tax_amount || 0,
                        ).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 text-xs pt-1">
                      <span>TOTAL BILL:</span>
                      <span>
                        Rp{" "}
                        {Number(
                          receiptData.orders?.total_amount || 0,
                        ).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Bayar ({receiptData.payment_methods?.name}):</span>
                      <span>
                        Rp{" "}
                        {Number(receiptData.amount_paid).toLocaleString(
                          "id-ID",
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Kembali:</span>
                      <span>
                        Rp{" "}
                        {Number(receiptData.change_amount || 0).toLocaleString(
                          "id-ID",
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="text-center text-[10px] text-slate-400 font-sans pt-2">
                    <p className="font-semibold text-slate-700">
                      Terima kasih atas kunjungan Anda!
                    </p>
                    <p>Makanan yang sudah dibeli tidak dapat ditukar.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-sans font-semibold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 font-sans font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer size={15} weight="bold" />
                <span>Cetak Nota</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentsPage;
