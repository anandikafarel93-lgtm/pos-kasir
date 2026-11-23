import { useState, useEffect, type FC, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AdminLayoutContextType } from '../../components/layout/AdminLayout';
import { TopBar } from '../../components/layout/TopBar';
import Swal from 'sweetalert2';
import {
  Receipt,
  PlusCircle,
  MagnifyingGlass,
  X,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  CookingPot,
  Armchair,
  ShoppingBag,
  Trash,
  CalendarBlank,
} from '@phosphor-icons/react';
import {
  getOrdersApi,
  getOrderByIdApi,
  createOrderApi,
  updateOrderStatusApi,
} from '../../api/orderApi';
import { getTablesApi } from '../../api/tableApi';
import { getProductsApi } from '../../api/productApi';
import type {
  OrderItem,
  CreateOrderPayload,
  CreateOrderItemPayload,
  OrderFilterParams,
} from '../../types/order';
import type { TableItem } from '../../types/table';
import type { ProductItem } from '../../types/product';
import type { OrderStatusEnum, OrderTypeEnum } from '../../types/common';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

const ORDER_STATUS_LIST: OrderStatusEnum[] = ['PENDING', 'DIPROSES', 'SELESAI', 'BATAL'];
const ORDER_TYPE_LIST: OrderTypeEnum[] = ['DINE_IN', 'TAKE_AWAY'];

export const OrdersPage: FC = () => {
  const { openMobileSidebar } = useOutletContext<AdminLayoutContextType>();

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<OrderStatusEnum | ''>('');
  const [filterType, setFilterType] = useState<OrderTypeEnum | ''>('');
  const [filterTable, setFilterTable] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');

  // Modal Create State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string>('');
  const [newOrder, setNewOrder] = useState<{
    customer_name: string;
    order_type: OrderTypeEnum;
    table_id: string;
    discount_amount: number | '';
    items: { product_id: string; quantity: number; notes: string }[];
  }>({
    customer_name: '',
    order_type: 'DINE_IN',
    table_id: '',
    discount_amount: '',
    items: [],
  });

  // Modal Detail State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [detailOrder, setDetailOrder] = useState<OrderItem | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params: OrderFilterParams = {
        status: filterStatus || undefined,
        order_type: filterType || undefined,
        table_id: filterTable || undefined,
        date: filterDate || undefined,
      };
      const data = await getOrdersApi(params);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Gagal mengambil daftar pesanan:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxiliaryData = async () => {
    try {
      const [tableRes, productRes] = await Promise.all([
        getTablesApi(),
        getProductsApi({ is_active: true }),
      ]);
      setTables(Array.isArray(tableRes) ? tableRes : []);
      setProducts(Array.isArray(productRes) ? productRes : []);
    } catch (err: any) {
      console.error('Gagal memuat meja atau produk:', err);
    }
  };

  useEffect(() => {
    fetchAuxiliaryData();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [filterStatus, filterType, filterTable, filterDate]);

  const handleOpenCreateModal = () => {
    setNewOrder({
      customer_name: '',
      order_type: 'DINE_IN',
      table_id: tables.length > 0 ? String(tables[0].id) : '',
      discount_amount: '',
      items: products.length > 0 ? [{ product_id: String(products[0].id), quantity: 1, notes: '' }] : [],
    });
    setCreateError('');
    setIsCreateModalOpen(true);
  };

  const handleAddItemToOrder = () => {
    if (products.length === 0) return;
    setNewOrder((prev) => ({
      ...prev,
      items: [...prev.items, { product_id: String(products[0].id), quantity: 1, notes: '' }],
    }));
  };

  const handleRemoveItemFromOrder = (index: number) => {
    setNewOrder((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleItemFieldChange = (index: number, field: string, value: any) => {
    setNewOrder((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  // Kalkulasi estimasi biaya di modal checkout
  const calculateEstimate = () => {
    let subtotal = 0;
    for (const item of newOrder.items) {
      const prod = products.find((p) => String(p.id) === String(item.product_id));
      if (prod) {
        subtotal += Number(prod.price) * (Number(item.quantity) || 1);
      }
    }
    const discount = Number(newOrder.discount_amount) || 0;
    const taxable = Math.max(0, subtotal - discount);
    const tax = Math.round(taxable * 0.1);
    const total = taxable + tax;
    return { subtotal, discount, tax, total };
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (newOrder.items.length === 0) {
      setCreateError('Pilih minimal 1 menu makanan/minuman');
      return;
    }

    if (newOrder.order_type === 'DINE_IN' && !newOrder.table_id) {
      setCreateError('Pilih meja untuk pesanan Makan di Tempat (Dine-In)');
      return;
    }

    setCreateLoading(true);
    try {
      const payload: CreateOrderPayload = {
        customer_name: newOrder.customer_name.trim() || 'Tamu Resto',
        order_type: newOrder.order_type,
        table_id: newOrder.order_type === 'DINE_IN' ? newOrder.table_id : null,
        discount_amount: Number(newOrder.discount_amount) || 0,
        items: newOrder.items.map((i) => ({
          product_id: i.product_id,
          quantity: Number(i.quantity) || 1,
          notes: i.notes?.trim() || undefined,
        })),
      };

      const result = await createOrderApi(payload);
      Toast.fire({
        icon: 'success',
        title: `Pesanan ${result.order_number} berhasil dibuat`,
      });
      setIsCreateModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Gagal membuat pesanan';
      setCreateError(msg);
      Toast.fire({ icon: 'error', title: msg });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenDetail = async (id: string | number) => {
    try {
      setIsDetailModalOpen(true);
      setDetailLoading(true);
      const data = await getOrderByIdApi(id);
      setDetailOrder(data);
    } catch (err: any) {
      Toast.fire({
        icon: 'error',
        title: err.response?.data?.message || 'Gagal memuat detail pesanan',
      });
      setIsDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (id: string | number, newStatus: OrderStatusEnum) => {
    if (newStatus === 'BATAL') {
      const confirm = await Swal.fire({
        title: 'Batalkan Pesanan Ini?',
        text: 'Membatalkan pesanan akan mengembalikan stok produk ke gudang dan mengosongkan meja.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Batalkan!',
        cancelButtonText: 'Tutup',
        reverseButtons: true,
      });
      if (!confirm.isConfirmed) return;
    }

    try {
      await updateOrderStatusApi(id, newStatus);
      Toast.fire({
        icon: 'success',
        title: `Status pesanan diubah ke ${newStatus}`,
      });
      fetchOrders();
      if (detailOrder && String(detailOrder.id) === String(id)) {
        setDetailOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      Toast.fire({
        icon: 'error',
        title: err.response?.data?.message || 'Gagal mengubah status pesanan',
      });
    }
  };

  const renderStatusBadge = (status: OrderStatusEnum) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} weight="bold" /> PENDING
          </span>
        );
      case 'DIPROSES':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CookingPot size={12} weight="bold" /> DIPROSES
          </span>
        );
      case 'SELESAI':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle size={12} weight="bold" /> SELESAI
          </span>
        );
      case 'BATAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={12} weight="bold" /> BATAL
          </span>
        );
    }
  };

  const renderTypeBadge = (type: OrderTypeEnum) => {
    switch (type) {
      case 'DINE_IN':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700">
            <Armchair size={14} className="text-emerald-600" /> Dine In
          </span>
        );
      case 'TAKE_AWAY':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700">
            <ShoppingBag size={14} className="text-amber-600" /> Take Away
          </span>
        );
    }
  };

  const filteredOrders = (Array.isArray(orders) ? orders : []).filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    const orderNumMatch = o.order_number.toLowerCase().includes(q);
    const custMatch = o.customer_name ? o.customer_name.toLowerCase().includes(q) : false;
    const tableMatch = o.tables?.table_number ? o.tables.table_number.toLowerCase().includes(q) : false;
    return orderNumMatch || custMatch || tableMatch;
  });

  const countPending = orders.filter((o) => o.status === 'PENDING').length;
  const countDiproses = orders.filter((o) => o.status === 'DIPROSES').length;
  const countSelesai = orders.filter((o) => o.status === 'SELESAI').length;
  const totalOmzet = orders
    .filter((o) => o.status === 'SELESAI')
    .reduce((sum, curr) => sum + Number(curr.total_amount), 0);

  const estimate = calculateEstimate();

  return (
    <>
      <TopBar
        title="Daftar Pesanan (Orders)"
        subtitle="Kelola pesanan pelanggan, status masakan, rincian tagihan, dan pantau meja."
        onOpenMobileSidebar={openMobileSidebar}
        actions={
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-3.5 md:px-4 py-2 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer"
          >
            <PlusCircle size={18} weight="bold" />
            <span className="hidden sm:inline">Buat Pesanan Baru</span>
            <span className="sm:hidden">Pesanan Baru</span>
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Metrik Mini Order */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Pesanan Masuk (Pending)</p>
            <h3 className="text-xl font-extrabold text-amber-600 mt-1">{countPending} Order</h3>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs text-blue-600 font-medium">Sedang Dimasak</p>
            <h3 className="text-xl font-extrabold text-blue-600 mt-1">{countDiproses} Order</h3>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs text-emerald-600 font-medium">Pesanan Selesai</p>
            <h3 className="text-xl font-extrabold text-emerald-600 mt-1">{countSelesai} Order</h3>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Total Omzet Pesanan Selesai</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1 font-mono">
              Rp {totalOmzet.toLocaleString('id-ID')}
            </h3>
          </div>
        </div>

        {/* Tabel Data Pesanan */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header Filter Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-slate-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 flex-1">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nomor order / tamu..."
                  className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Semua Status</option>
                {ORDER_STATUS_LIST.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              {/* Type */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Semua Tipe</option>
                {ORDER_TYPE_LIST.map((tp) => (
                  <option key={tp} value={tp}>
                    {tp.replace('_', ' ')}
                  </option>
                ))}
              </select>

              {/* Meja */}
              <select
                value={filterTable}
                onChange={(e) => setFilterTable(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Semua Meja</option>
                {tables.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.table_number}
                  </option>
                ))}
              </select>

              {/* Date */}
              <div className="relative">
                <CalendarBlank size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <span className="text-xs text-slate-500 whitespace-nowrap">
              Total <b>{filteredOrders.length}</b> pesanan
            </span>
          </div>

          {/* Table List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">No. Pesanan</th>
                  <th className="py-3.5 px-6">Tamu / Meja</th>
                  <th className="py-3.5 px-6">Tipe</th>
                  <th className="py-3.5 px-6">Item Menu</th>
                  <th className="py-3.5 px-6">Total Tagihan</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-center">Ubah Status</th>
                  <th className="py-3.5 px-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                      Memuat daftar pesanan...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                      Tidak ada pesanan yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(ord.id)}
                          className="font-mono font-extrabold text-emerald-600 hover:underline cursor-pointer block text-left"
                        >
                          {ord.order_number}
                        </button>
                        <span className="text-[10px] text-slate-400">
                          {new Date(ord.created_at).toLocaleString('id-ID', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900">{ord.customer_name || 'Tamu Resto'}</p>
                        <p className="text-[11px] text-slate-500">
                          {ord.tables?.table_number ? (
                            <span className="font-semibold text-emerald-700">Meja: {ord.tables.table_number}</span>
                          ) : (
                            <span className="text-slate-400">Tanpa Meja</span>
                          )}
                        </p>
                      </td>

                      <td className="py-4 px-6">{renderTypeBadge(ord.order_type)}</td>

                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-700">
                          {ord.order_items?.length || 0} Item
                        </span>
                        <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
                          {ord.order_items?.map((i) => i.products?.name).filter(Boolean).join(', ')}
                        </p>
                      </td>

                      <td className="py-4 px-6 font-mono font-extrabold text-slate-900">
                        Rp {Number(ord.total_amount).toLocaleString('id-ID')}
                      </td>

                      <td className="py-4 px-6 text-center">{renderStatusBadge(ord.status)}</td>

                      <td className="py-4 px-6 text-center">
                        <select
                          value={ord.status}
                          disabled={ord.status === 'SELESAI' || ord.status === 'BATAL'}
                          onChange={(e) =>
                            handleStatusChange(ord.id, e.target.value as OrderStatusEnum)
                          }
                          className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {ORDER_STATUS_LIST.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(ord.id)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                            title="Detail Rincian Order"
                          >
                            <Eye size={16} weight="bold" />
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

      {/* ================= MODAL BUAT PESANAN BARU (CHECKOUT) ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Receipt size={22} weight="bold" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Buat Pesanan Baru</h3>
                  <p className="text-[11px] text-slate-400">Input transaksi pelanggan & kirim tiket ke dapur.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs font-semibold">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
                  {createError}
                </div>
              )}

              {/* Data Pelanggan & Meja */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Nama Pelanggan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Meja 03 / Bpk. Budi"
                    value={newOrder.customer_name}
                    onChange={(e) => setNewOrder({ ...newOrder, customer_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-normal"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Tipe Pesanan</label>
                  <select
                    value={newOrder.order_type}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, order_type: e.target.value as OrderTypeEnum })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    {ORDER_TYPE_LIST.map((tp) => (
                      <option key={tp} value={tp}>
                        {tp.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {newOrder.order_type === 'DINE_IN' && (
                  <div>
                    <label className="block text-slate-700 mb-1">Pilih Meja</label>
                    <select
                      required
                      value={newOrder.table_id}
                      onChange={(e) => setNewOrder({ ...newOrder, table_id: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Pilih Nomor Meja</option>
                      {tables.map((t) => (
                        <option key={t.id} value={String(t.id)}>
                          {t.table_number} ({t.status})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Daftar Menu Items */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-700 font-bold">Rincian Menu Pesanan</label>
                  <button
                    type="button"
                    onClick={handleAddItemToOrder}
                    className="text-emerald-600 hover:text-emerald-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle size={15} weight="bold" /> Tambah Item
                  </button>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {newOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs"
                    >
                      <div className="flex-1">
                        <select
                          value={item.product_id}
                          onChange={(e) => handleItemFieldChange(idx, 'product_id', e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-normal"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={String(p.id)}>
                              {p.name} - Rp {Number(p.price).toLocaleString('id-ID')} (Sisa: {p.stock})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-20">
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemFieldChange(idx, 'quantity', Number(e.target.value))
                          }
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Catatan (cth: tidak pedas)"
                          value={item.notes}
                          onChange={(e) => handleItemFieldChange(idx, 'notes', e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg font-normal focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {newOrder.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemFromOrder(idx)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer self-center"
                        >
                          <Trash size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Kalkulasi Ringkasan Biaya */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-normal">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold">
                    Rp {estimate.subtotal.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 text-slate-600">
                  <span>Potongan Diskon (Rp):</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newOrder.discount_amount}
                    onChange={(e) =>
                      setNewOrder({
                        ...newOrder,
                        discount_amount: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    className="w-32 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Pajak Restoran (PB1 10%):</span>
                  <span className="font-mono">Rp {estimate.tax.toLocaleString('id-ID')}</span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-900 font-extrabold text-sm">
                  <span>Total Tagihan:</span>
                  <span className="font-mono text-emerald-600">
                    Rp {estimate.total.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Tombol Aksi */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? 'Memproses Order...' : 'Kirim Pesanan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DETAIL PESANAN ================= */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 font-mono">
                  {detailOrder?.order_number}
                </h3>
                <p className="text-xs text-slate-500">
                  Tamu: <b>{detailOrder?.customer_name}</b> &bull; Meja:{' '}
                  <b>{detailOrder?.tables?.table_number || '-'}</b>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {detailLoading ? (
                <p className="text-center py-6 text-slate-400">Memuat rincian pesanan...</p>
              ) : !detailOrder ? (
                <p className="text-center py-6 text-slate-400">Data pesanan tidak ditemukan.</p>
              ) : (
                <>
                  {/* Status & Info Pelayan */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-[11px] text-slate-400">Kasir / Waiter Input</p>
                      <p className="font-bold text-slate-800">{detailOrder.users?.name || 'Staf'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400 mb-1">Status Saat Ini</p>
                      {renderStatusBadge(detailOrder.status)}
                    </div>
                  </div>

                  {/* List Item yang Dipesan */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2">Item Menu Hidangan</h4>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {detailOrder.order_items?.map((item) => (
                        <div key={item.id} className="p-3.5 flex items-center justify-between bg-white">
                          <div>
                            <p className="font-extrabold text-slate-900">{item.products?.name}</p>
                            <p className="text-[11px] text-slate-400">
                              {item.quantity} x Rp {Number(item.unit_price).toLocaleString('id-ID')}
                              {item.notes ? ` • Note: ${item.notes}` : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900">
                              Rp {Number(item.subtotal).toLocaleString('id-ID')}
                            </span>
                            <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                              {item.kitchen_status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rincian Finansial Tagihan */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-normal">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal Item</span>
                      <span className="font-mono font-bold">
                        Rp {Number(detailOrder.subtotal).toLocaleString('id-ID')}
                      </span>
                    </div>
                    {Number(detailOrder.discount_amount) > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Potongan Diskon</span>
                        <span className="font-mono font-bold">
                          - Rp {Number(detailOrder.discount_amount).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Pajak Restoran PB1 (10%)</span>
                      <span className="font-mono">
                        Rp {Number(detailOrder.tax_amount).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-900 font-extrabold text-sm">
                      <span>Total Biaya Akhir</span>
                      <span className="font-mono text-emerald-600">
                        Rp {Number(detailOrder.total_amount).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Riwayat Pembayaran (Jika Sudah Bayar) */}
                  {detailOrder.payments && detailOrder.payments.length > 0 && (
                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                      <p className="font-bold">Informasi Pembayaran</p>
                      <p className="text-[11px] mt-0.5">
                        Metode: <b>{detailOrder.payments[0].payment_methods?.name || 'Tunai'}</b> &bull; Dibayar:{' '}
                        <b>Rp {Number(detailOrder.payments[0].amount_paid).toLocaleString('id-ID')}</b>
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              {detailOrder && detailOrder.status !== 'SELESAI' && detailOrder.status !== 'BATAL' ? (
                <button
                  type="button"
                  onClick={() => handleStatusChange(detailOrder.id, 'BATAL')}
                  className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-bold transition cursor-pointer"
                >
                  Batalkan Order
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrdersPage;