import { useState, useEffect, useMemo, type FC } from "react";
import Swal from "sweetalert2";
import {
  Receipt,
  Armchair,
  ShoppingBag,
  CreditCard,
  Money,
  QrCode,
  MagnifyingGlass,
  ArrowsClockwise,
  SignOut,
  Printer,
  CheckCircle,
  X,
  Clock,
  Hash,
  Intersect,
  Percent,
  CalendarBlank,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { getOrdersApi } from "../../api/orderApi";
import { getPaymentMethodsApi } from "../../api/paymentMethodApi";
import {
  processPaymentApi,
  createMidtransTokenApi,
} from "../../api/paymentApi";
import type { OrderItem } from "../../types/order";
import type { PaymentMethodItem } from "../../types/paymentMethod";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

const getTodayLocalDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const checkOrderPaid = (o: any): boolean => {
  if (Array.isArray(o.payments)) {
    return o.payments.length > 0;
  }
  return Boolean(
    o.payments && (o.payments.id || o.payments.payment_status === "LUNAS"),
  );
};

export const CashierPage: FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter & Pencarian
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFilter, setSelectedFilter] = useState<
    "ALL" | "DINE_IN" | "TAKE_AWAY"
  >("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    "ALL" | "UNPAID" | "PAID"
  >("UNPAID");
  const [filterDate, setFilterDate] = useState<string>(
    getTodayLocalDateString(),
  );

  // Mode Gabung Tagihan & State Tagihan Terpilih
  const [isMergeMode, setIsMergeMode] = useState<boolean>(false);
  const [selectedOrders, setSelectedOrders] = useState<OrderItem[]>([]);

  // Input Pembayaran Kasir
  const [customDiscountInput, setCustomDiscountInput] = useState<string>("0");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | number
  >("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);

  // Modal Cetak Struk
  const [completedPaymentData, setCompletedPaymentData] = useState<any | null>(
    null,
  );

  const fetchOrdersAndMethods = async () => {
    try {
      setLoading(true);
      const [orderRes, methodRes] = await Promise.all([
        getOrdersApi(),
        getPaymentMethodsApi(),
      ]);

      const allOrders: OrderItem[] = Array.isArray(orderRes) ? orderRes : [];
      // Saring hanya pesanan yang belum lunas dan tidak berstatus BATAL

      const validOrders = allOrders.filter(
        (o) => String(o.status).toUpperCase() !== "BATAL",
      );

      validOrders.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setOrders(validOrders);

      const rawMethods: PaymentMethodItem[] = Array.isArray(methodRes)
        ? methodRes
        : [];
      const activeMethods = rawMethods.filter((m) => m.is_active);
      setPaymentMethods(activeMethods);
    } catch (err: any) {
      Toast.fire({
        icon: "error",
        title: err.response?.data?.message || "Gagal memuat data kasir.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndMethods();
  }, []);

  // Filter Tagihan
  const ordersByDate = useMemo(() => {
    if (!filterDate) return orders;
    return orders.filter((o) => {
      const d = new Date(o.created_at);
      const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(d.getDate()).padStart(2, "0")}`;
      return localDate === filterDate;
    });
  }, [orders, filterDate]);

  const filteredOrders = useMemo(() => {
    return ordersByDate.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        o.order_number.toLowerCase().includes(q) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        (o.tables?.table_number &&
          o.tables.table_number.toLowerCase().includes(q));

      const matchType =
        selectedFilter === "ALL" || o.order_type === selectedFilter;

      const isPaid = checkOrderPaid(o);
      const matchPaymentStatus =
        paymentStatusFilter === "ALL"
          ? true
          : paymentStatusFilter === "PAID"
            ? isPaid
            : !isPaid;

      return matchSearch && matchType && matchPaymentStatus;
    });
  }, [ordersByDate, searchQuery, selectedFilter, paymentStatusFilter]);

  // Kalkulasi Finansial dengan Input Diskon Kasir
  const billingCalculation = useMemo(() => {
    if (selectedOrders.length === 0) {
      return {
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        totalPayable: 0,
        paid: 0,
        changeAmount: 0,
        allItems: [],
      };
    }

    let subtotal = 0;
    const allItems: any[] = [];

    selectedOrders.forEach((ord) => {
      subtotal += Number(ord.subtotal) || 0;
      if (ord.order_items) {
        allItems.push(...ord.order_items);
      }
    });

    const parsedDiscount = Math.max(
      0,
      Number(customDiscountInput.replace(/\D/g, "")) || 0,
    );
    const discountAmount = Math.min(parsedDiscount, subtotal);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.round(taxableAmount * 0.1);
    const totalPayable = taxableAmount + taxAmount;

    const paid = Number(amountPaidInput.replace(/\D/g, "")) || 0;
    const changeAmount = Math.max(0, paid - totalPayable);

    return {
      subtotal,
      taxAmount,
      discountAmount,
      totalPayable,
      paid,
      changeAmount,
      allItems,
    };
  }, [selectedOrders, customDiscountInput, amountPaidInput]);

  // Handler Pemilihan Tagihan
  const handleToggleSelectOrder = (order: OrderItem) => {
    if (checkOrderPaid(order)) {
      Toast.fire({
        icon: "info",
        title: `Pesanan ${order.order_number} sudah lunas.`,
      });

      return;
    }

    if (!isMergeMode) {
      setSelectedOrders([order]);
      setCustomDiscountInput(String(Number(order.discount_amount) || 0));
      setAmountPaidInput("");
      setReferenceNumber("");
      return;
    }

    setSelectedOrders((prev) => {
      const exists = prev.some((o) => o.id === order.id);
      const updated = exists
        ? prev.filter((o) => o.id !== order.id)
        : [...prev, order];

      const combinedInitialDiscount = updated.reduce(
        (sum, o) => sum + (Number(o.discount_amount) || 0),
        0,
      );
      setCustomDiscountInput(String(combinedInitialDiscount));
      return updated;
    });
  };

  const handleQuickCash = (amount: number) => {
    setAmountPaidInput(amount.toString());
  };

  // Deteksi Metode Pembayaran Midtrans (Semua metode selain CASH)
  const selectedMethodObj = paymentMethods.find(
    (m) => String(m.id) === String(selectedPaymentMethodId),
  );
  const isMidtransMethod =
    Boolean(selectedMethodObj) &&
    selectedMethodObj?.code?.toUpperCase() !== "CASH";

  // Helper Tampilkan Modal Struk
  const showReceiptModal = (
    finalPaid: number,
    finalChange: number,
    refCode: string | null,
  ) => {
    const { subtotal, discountAmount, taxAmount, totalPayable, allItems } =
      billingCalculation;
    const orderNumbers = selectedOrders.map((o) => o.order_number).join(", ");
    const tableNumbers = Array.from(
      new Set(
        selectedOrders.map((o) => o.tables?.table_number).filter(Boolean),
      ),
    ).join(" & ");
    const customerNames = Array.from(
      new Set(selectedOrders.map((o) => o.customer_name).filter(Boolean)),
    ).join(" / ");

    setCompletedPaymentData({
      order_number: orderNumbers,
      customer_name: customerNames || "Tamu Resto",
      table_number: tableNumbers || null,
      order_type:
        selectedOrders.length > 1 ? "GABUNGAN" : selectedOrders[0].order_type,
      cashier_name: user?.name || "Kasir Resto",
      created_at: new Date().toLocaleString("id-ID"),
      items: allItems,
      subtotal,
      discountAmount,
      taxAmount,
      totalPayable,
      amount_paid: finalPaid,
      change_amount: finalChange,
      payment_method_name: selectedMethodObj?.name || "Tunai (Cash)",
      reference_number: refCode,
    });
  };

  // Helper Reset State Kasir
  const resetCashierState = () => {
    setSelectedOrders([]);
    setIsMergeMode(false);
    setCustomDiscountInput("0");
    setAmountPaidInput("");
    setReferenceNumber("");
    fetchOrdersAndMethods();
  };

  // Proses Pembayaran Kasir (Tunai & Midtrans Snap)
  const handleProcessPayment = async () => {
    if (selectedOrders.length === 0) return;

    if (!selectedPaymentMethodId) {
      Toast.fire({
        icon: "warning",
        title: "Pilih metode pembayaran terlebih dahulu",
      });
      return;
    }

    const { totalPayable, paid, changeAmount, subtotal, discountAmount } =
      billingCalculation;

    // 1. Validasi Uang Diterima: Wajib diisi (> 0) dan tidak boleh kurang dari total tagihan
    if (!paid || paid <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Nominal Uang Belum Diisi",
        text: 'Masukkan nominal "Uang Diterima" atau klik tombol "Uang Pas" terlebih dahulu.',
        confirmButtonColor: "#059669",
      });
      return;
    }

    if (paid < totalPayable) {
      Swal.fire({
        icon: "warning",
        title: "Uang Pembayaran Kurang",
        text: `Total tagihan: Rp ${totalPayable.toLocaleString(
          "id-ID",
        )}, Uang diterima: Rp ${paid.toLocaleString("id-ID")}.`,
        confirmButtonColor: "#059669",
      });
      return;
    }

    // 2. Hitung pembagian diskon, pajak, dan total per order secara akurat
    let remainingDiscount = discountAmount;
    const orderPayloads = selectedOrders.map((ord, index) => {
      const ordSubtotal = Number(ord.subtotal) || 0;

      let ordDiscount = 0;
      if (subtotal > 0 && discountAmount > 0) {
        ordDiscount =
          index === selectedOrders.length - 1
            ? remainingDiscount
            : Math.round((ordSubtotal / subtotal) * discountAmount);
        remainingDiscount -= ordDiscount;
      }

      const ordTaxable = Math.max(0, ordSubtotal - ordDiscount);
      const ordTax = Math.round(ordTaxable * 0.1);
      const ordTotal = ordTaxable + ordTax;

      return {
        order_id: ord.id,
        discount_amount: ordDiscount,
        tax_amount: ordTax,
        total_amount: ordTotal,
      };
    });

    setSubmittingPayment(true);
    try {
      // ================= JALUR A: PEMBAYARAN VIA MIDTRANS =================
      if (isMidtransMethod) {
        const { snapToken, midtransOrderId } = await createMidtransTokenApi({
          order_ids: selectedOrders.map((o) => o.id),
          payment_method_id: selectedPaymentMethodId,
          discount_amount: discountAmount,
          total_amount: totalPayable,
        });

        setSubmittingPayment(false);

        (window as any).snap.pay(snapToken, {
          onSuccess: async (result: any) => {
            try {
              const finalRef = result.transaction_id || midtransOrderId;

              // Panggil API backend agar database lokal (payments, orders, tables) langsung ter-update
              if (orderPayloads.length === 1) {
                const item = orderPayloads[0];
                await processPaymentApi({
                  order_id: item.order_id,
                  payment_method_id: selectedPaymentMethodId,
                  amount_paid: paid,
                  discount_amount: item.discount_amount,
                  tax_amount: item.tax_amount,
                  total_amount: item.total_amount,
                  reference_number: finalRef,
                });
              } else {
                for (const item of orderPayloads) {
                  await processPaymentApi({
                    order_id: item.order_id,
                    payment_method_id: selectedPaymentMethodId,
                    amount_paid: item.total_amount,
                    discount_amount: item.discount_amount,
                    tax_amount: item.tax_amount,
                    total_amount: item.total_amount,
                    reference_number: finalRef,
                  });
                }
              }

              showReceiptModal(paid, changeAmount, finalRef);
              Toast.fire({
                icon: "success",
                title: "Pembayaran Midtrans Lunas & Tersimpan!",
              });
              resetCashierState();
            } catch (err: any) {
              Swal.fire(
                "Peringatan",
                err.response?.data?.message ||
                  "Lunas di Midtrans, namun gagal menyimpan ke database lokal.",
                "warning",
              );
            }
          },
          onPending: async () => {
            // Muncul otomatis saat klik "Check status" di pop-up Midtrans
            // Memungkinkan kasir melunaskan langsung tanpa buka web simulator Midtrans
            const confirmSim = await Swal.fire({
              icon: "question",
              title: "Konfirmasi Pembayaran Midtrans",
              text: "Tagihan sudah terhubung ke Midtrans. Langsung tandai Lunas sekarang?",
              showCancelButton: true,
              confirmButtonText: "Ya, Langsung Lunas",
              cancelButtonText: "Tunggu Pembayaran",
              confirmButtonColor: "#059669",
            });

            if (confirmSim.isConfirmed) {
              for (const item of orderPayloads) {
                await processPaymentApi({
                  order_id: item.order_id,
                  payment_method_id: selectedPaymentMethodId,
                  amount_paid:
                    orderPayloads.length === 1 ? paid : item.total_amount,
                  discount_amount: item.discount_amount,
                  tax_amount: item.tax_amount,
                  total_amount: item.total_amount,
                  reference_number: midtransOrderId,
                });
              }
              showReceiptModal(paid, changeAmount, midtransOrderId);
              Toast.fire({
                icon: "success",
                title: "Pembayaran Midtrans Berhasil Dilunaskan!",
              });
              resetCashierState();
            }
          },
          onError: () => {
            Swal.fire("Gagal", "Pembayaran Midtrans gagal diproses.", "error");
          },
          onClose: () => {
            Toast.fire({
              icon: "warning",
              title: "Popup Midtrans ditutup sebelum lunas.",
            });
          },
        });
        return;
      }

      // ================= JALUR B: PEMBAYARAN TUNAI (CASH) =================
      if (orderPayloads.length === 1) {
        await processPaymentApi({
          order_id: orderPayloads[0].order_id,
          payment_method_id: selectedPaymentMethodId,
          amount_paid: paid,
          reference_number: referenceNumber.trim() || undefined,
        });
      } else {
        for (const item of orderPayloads) {
          await processPaymentApi({
            order_id: item.order_id,
            payment_method_id: selectedPaymentMethodId,
            amount_paid: item.total_amount,
            reference_number: referenceNumber.trim() || undefined,
          });
        }
      }

      showReceiptModal(paid, changeAmount, referenceNumber.trim() || null);
      Toast.fire({
        icon: "success",
        title: `${selectedOrders.length} Tagihan berhasil diselesaikan!`,
      });
      resetCashierState();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Pembayaran Gagal",
        text:
          err.response?.data?.message ||
          "Terjadi kesalahan sistem saat memproses pembayaran.",
        confirmButtonColor: "#e11d48",
      });
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const renderMethodIcon = (code?: string) => {
    const c = code?.toUpperCase();
    if (c === "CASH") return <Money size={18} weight="bold" />;
    if (c === "QRIS") return <QrCode size={18} weight="bold" />;
    return <CreditCard size={18} weight="bold" />;
  };
  const unpaidCount = ordersByDate.filter((o) => !checkOrderPaid(o)).length;
  const paidCount = ordersByDate.filter((o) => checkOrderPaid(o)).length;
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-800 select-none">
      {/* ================= SISI KIRI: DAFTAR TAGIHAN ================= */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar Kasir */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-blue-600/20">
              <Receipt size={22} weight="bold" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-slate-900">
                KASIR RESTO (BILLING)
              </h1>
              <p className="text-[10px] text-slate-500">
                Kasir:{" "}
                <span className="font-semibold text-blue-600">
                  {user?.name || "Kasir"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Mode Gabung Tagihan */}
            <button
              type="button"
              onClick={() => {
                setIsMergeMode(!isMergeMode);
                setSelectedOrders([]);
                setCustomDiscountInput("0");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                isMergeMode
                  ? "bg-amber-500 border-amber-600 text-slate-950 shadow-sm"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Intersect size={16} weight="bold" />
              <span>{isMergeMode ? "Mode Gabung Aktif" : "Gabung Bill"}</span>
            </button>

            <button
              type="button"
              onClick={fetchOrdersAndMethods}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
              title="Segarkan Tagihan"
            >
              <ArrowsClockwise size={16} weight="bold" />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 active:scale-95 transition cursor-pointer"
            >
              <SignOut size={16} weight="bold" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        {/* Filter Bar */}
        <section className="flex flex-col gap-3 border-b border-slate-200 bg-white p-3 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedFilter === "ALL"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua ({ordersByDate.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter("DINE_IN")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedFilter === "DINE_IN"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Dine In ({orders.filter((o) => o.order_type === "DINE_IN").length}
              )
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter("TAKE_AWAY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedFilter === "TAKE_AWAY"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Take Away (
              {orders.filter((o) => o.order_type === "TAKE_AWAY").length})
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setPaymentStatusFilter("UNPAID")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                paymentStatusFilter === "UNPAID"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua Status ({ordersByDate.length})
            </button>
            <button
              type="button"
              onClick={() => setPaymentStatusFilter("PAID")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                paymentStatusFilter === "PAID"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Lunas ({paidCount})
            </button>
            <button
              type="button"
              onClick={() => setPaymentStatusFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                paymentStatusFilter === "ALL"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Belum Lunas ({unpaidCount})
            </button>
          </div>

          <div className="relative">
            <CalendarBlank
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setSelectedOrders([]);
              }}
              className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="relative w-full sm:w-64">
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari meja / nota / nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-normal"
            />
          </div>
        </section>

        {/* Grid Kartu Tagihan */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-xs text-slate-400">
              Memuat data tagihan aktif kasir...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
              <CheckCircle size={44} className="mb-2 text-emerald-500" />
              <p className="text-xs font-extrabold text-slate-700">
                Tidak Ada Tagihan Aktif
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Semua pesanan tamu saat ini sudah lunas terbayar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredOrders.map((ord) => {
                const isSelected = selectedOrders.some((o) => o.id === ord.id);
                const isTakeaway = ord.order_type === "TAKE_AWAY";
                const isPaid = checkOrderPaid(ord);
                const totalAmountNumber = Number(ord.total_amount) || 0;

                return (
                  <div
                    key={ord.id}
                    onClick={() => handleToggleSelectOrder(ord)}
                    className={`relative flex flex-col justify-between rounded-2xl border p-4 transition select-none cursor-pointer ${
                      isPaid
                        ? "border-emerald-200 bg-emerald-50/30 opacity-85 cursor-default"
                        : isSelected
                          ? "border-blue-600 bg-emerald-50/40 shadow-lg ring-2 ring-blue-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        {isTakeaway ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                            <ShoppingBag size={12} weight="bold" /> Bungkus
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-800">
                            <Armchair size={13} weight="bold" /> Meja{" "}
                            {ord.tables?.table_number || "-"}
                          </span>
                        )}

                        <div className="flex items-center gap-1.5">
                          {isMergeMode && !isPaid && (
                            <input
                              type="checkbox"
                              readOnly
                              checked={isSelected}
                              className="h-4 w-4 rounded text-blue-600 accent-blue-600 cursor-pointer pointer-events-none"
                            />
                          )}
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                              <CheckCircle size={11} weight="fill" /> Lunas
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">
                              Belum Lunas
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <h4 className="text-xs font-extrabold text-slate-900 truncate">
                          {ord.customer_name || "Tamu Resto"}
                        </h4>
                        <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0">
                          {ord.order_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                        <Clock size={12} />
                        <span>
                          {new Date(ord.created_at).toLocaleTimeString(
                            "id-ID",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                        <span>&bull; {ord.order_items?.length || 0} menu</span>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400">
                        Tagihan Saat Ini
                      </span>
                      <span className="font-mono text-xs font-black text-blue-600">
                        Rp {totalAmountNumber.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ================= SISI KANAN: PANEL PEMBAYARAN KASIR ================= */}
      <aside className="w-full max-w-sm lg:max-w-md shrink-0 border-l border-slate-200 bg-white flex flex-col shadow-xl">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-2">
            <Receipt size={20} weight="bold" className="text-blue-600" />
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                {selectedOrders.length > 1
                  ? `Pembayaran Gabungan (${selectedOrders.length} Bill)`
                  : "Rincian Pembayaran"}
              </h3>
              <p className="text-[10px] text-slate-400">
                {selectedOrders.length === 1 ? (
                  <>
                    Nota:{" "}
                    <b className="text-blue-600">
                      {selectedOrders[0].order_number}
                    </b>{" "}
                    (
                    {selectedOrders[0].order_type === "TAKE_AWAY"
                      ? "Bungkus"
                      : `Meja ${selectedOrders[0].tables?.table_number || "-"}`}
                    )
                  </>
                ) : selectedOrders.length > 1 ? (
                  <b className="text-amber-600">
                    {selectedOrders
                      .map((o) =>
                        o.tables?.table_number
                          ? `M-${o.tables.table_number}`
                          : "Bungkus",
                      )
                      .join(" + ")}
                  </b>
                ) : (
                  "Pilih tagihan di sebelah kiri"
                )}
              </p>
            </div>
          </div>
          {selectedOrders.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedOrders([]);
                setCustomDiscountInput("0");
              }}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X size={16} weight="bold" />
            </button>
          )}
        </div>

        {/* Form Kasir */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {selectedOrders.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
              <Receipt size={48} className="mb-2 text-slate-200" />
              <p className="text-xs font-bold text-slate-600">
                Belum Ada Tagihan Dipilih
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                {isMergeMode
                  ? "Centang beberapa nota / meja di kiri untuk digabung pembayarannya."
                  : "Ketuk salah satu kartu pesanan tamu di sebelah kiri untuk memproses kasir."}
              </p>
            </div>
          ) : (
            <>
              {/* Daftar Item Menu */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 space-y-2 max-h-40 overflow-y-auto">
                {billingCalculation.allItems.map((item: any, idx: number) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="flex justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5 flex-1 pr-2 truncate">
                      <span className="font-mono font-bold text-slate-500">
                        {item.quantity}x
                      </span>
                      <span className="font-bold text-slate-800 truncate">
                        {item.products?.name}
                      </span>
                    </div>
                    <span className="font-mono text-slate-700 font-bold shrink-0">
                      Rp {Number(item.subtotal).toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Input Diskon Kasir */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <Percent size={13} weight="bold" /> Potongan Diskon Kasir (Rp)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="0"
                    value={customDiscountInput}
                    onChange={(e) =>
                      setCustomDiscountInput(e.target.value.replace(/\D/g, ""))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono font-bold text-rose-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  {billingCalculation.discountAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setCustomDiscountInput("0")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              {/* Pilihan Metode Pembayaran */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {paymentMethods.map((m) => {
                    const isSelected =
                      String(selectedPaymentMethodId) === String(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setSelectedPaymentMethodId(m.id)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 px-2 text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? "border-blue-600 bg-emerald-600 text-white shadow-sm"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {renderMethodIcon(m.code)}
                        <span className="truncate">{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nomor Referensi (Khusus Non-Tunai) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <Hash size={13} weight="bold" /> Nomor Referensi / Approval
                  Code (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: REF-123456 / QRIS RRN"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-normal"
                />
              </div>

              {/* Input Uang Diterima & Quick Cash */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Uang Diterima dari Pelanggan (Rp)
                </label>
                <input
                  type="text"
                  placeholder="0"
                  value={amountPaidInput}
                  onChange={(e) =>
                    setAmountPaidInput(e.target.value.replace(/\D/g, ""))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />

                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickCash(billingCalculation.totalPayable)
                    }
                    className="rounded-lg bg-slate-100 py-1 text-[10px] font-black text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                  >
                    Uang Pas
                  </button>
                  {[50000, 100000, 200000].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => handleQuickCash(amt)}
                      className="rounded-lg bg-slate-100 py-1 text-[10px] font-black text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                    >
                      {amt / 1000}k
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Ringkasan & Tombol Konfirmasi Bayar */}
        {selectedOrders.length > 0 && (
          <div className="border-t border-slate-200 bg-white p-5 space-y-3">
            <div className="space-y-1 text-xs font-semibold text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal Menu</span>
                <span className="font-mono">
                  Rp {billingCalculation.subtotal.toLocaleString("id-ID")}
                </span>
              </div>
              {billingCalculation.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Potongan Diskon</span>
                  <span className="font-mono">
                    - Rp{" "}
                    {billingCalculation.discountAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Pajak Restoran (PB1 10%)</span>
                <span className="font-mono">
                  Rp {billingCalculation.taxAmount.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-black text-slate-900">
                <span>TOTAL TAGIHAN</span>
                <span className="font-mono text-blue-600 text-base">
                  Rp {billingCalculation.totalPayable.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-xs font-bold pt-1 text-slate-800">
                <span>Kembalian</span>
                <span className="font-mono text-emerald-600 text-sm">
                  Rp {billingCalculation.changeAmount.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={submittingPayment}
              onClick={handleProcessPayment}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-black text-white shadow-lg shadow-blue-600/25 hover:bg-emerald-500 active:scale-98 disabled:opacity-50 transition cursor-pointer"
            >
              <CheckCircle size={18} weight="bold" />
              <span>
                {submittingPayment
                  ? "Memproses Pembayaran..."
                  : selectedOrders.length > 1
                    ? `Konfirmasi Bayar Gabungan (${selectedOrders.length} Bill)`
                    : "Konfirmasi Pembayaran Lunas"}
              </span>
            </button>
          </div>
        )}
      </aside>

      {/* ================= MODAL CETAK STRUK PEMBAYARAN ================= */}
      {completedPaymentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div
              id="receipt-print"
              className="font-mono text-[11px] text-slate-800 space-y-2"
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h3 className="text-xs font-black tracking-wider uppercase">
                  RESTO POS INDONESIA
                </h3>
                <p className="text-[9px] text-slate-500">
                  Jl. Kuliner Lezat No. 88, Bekasi
                </p>
                <p className="text-[9px] text-slate-400 mt-1">
                  {completedPaymentData.created_at}
                </p>
              </div>

              <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between">
                  <span>Nota:</span>
                  <span className="font-bold">
                    {completedPaymentData.order_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir:</span>
                  <span>{completedPaymentData.cashier_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tamu:</span>
                  <span>{completedPaymentData.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tipe / Meja:</span>
                  <span>
                    {completedPaymentData.table_number
                      ? `Meja ${completedPaymentData.table_number}`
                      : "Bungkus (Take Away)"}
                  </span>
                </div>
                {completedPaymentData.reference_number && (
                  <div className="flex justify-between">
                    <span>Ref / Trx:</span>
                    <span className="font-bold">
                      {completedPaymentData.reference_number}
                    </span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-1.5 py-1 border-b border-dashed border-slate-300">
                {completedPaymentData.items?.map((item: any, idx: number) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="flex justify-between"
                  >
                    <div>
                      <p className="font-bold">{item.products?.name}</p>
                      <p className="text-[9px] text-slate-500">
                        {item.quantity} x Rp{" "}
                        {Number(item.unit_price).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <span className="font-bold">
                      Rp {Number(item.subtotal).toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total & Rincian */}
              <div className="space-y-0.5 pt-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>
                    Rp {completedPaymentData.subtotal.toLocaleString("id-ID")}
                  </span>
                </div>
                {completedPaymentData.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon:</span>
                    <span>
                      - Rp{" "}
                      {completedPaymentData.discountAmount.toLocaleString(
                        "id-ID",
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>PB1 (10%):</span>
                  <span>
                    Rp {completedPaymentData.taxAmount.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
                  <span>TOTAL:</span>
                  <span>
                    Rp{" "}
                    {completedPaymentData.totalPayable.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>Metode:</span>
                  <span>{completedPaymentData.payment_method_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bayar:</span>
                  <span>
                    Rp{" "}
                    {completedPaymentData.amount_paid.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Kembali:</span>
                  <span>
                    Rp{" "}
                    {completedPaymentData.change_amount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="text-center pt-3 text-[9px] text-slate-400">
                <p>Terima kasih atas kunjungan Anda!</p>
                <p>Silakan berkunjung kembali</p>
              </div>
            </div>

            {/* Tombol Cetak & Tutup */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCompletedPaymentData(null)}
                className="flex-1 rounded-xl py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-md"
              >
                <Printer size={15} weight="bold" />
                <span>Cetak Struk</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierPage;
