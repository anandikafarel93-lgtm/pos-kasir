import { useState, useEffect, useMemo, useRef, type FC } from 'react';
import Swal from 'sweetalert2';
import {
  Armchair,
  MagnifyingGlass,
  Plus,
  Minus,
  Trash,
  ShoppingBagOpen,
  CookingPot,
  NotePencil,
  CheckCircle,
  X,
  ForkKnife,
  ArrowsClockwise,
  SignOut,
  Bell,
  Tray,
  ShoppingBag,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { getTablesApi } from '../../api/tableApi';
import { getCategoriesApi } from '../../api/categoryApi';
import { getProductsApi } from '../../api/productApi';
import { createOrderApi, getOrdersApi } from '../../api/orderApi';
import { getCustomersApi } from '../../api/customerApi';
import type { TableItem } from '../../types/table';
import type { ProductItem, CategoryItem } from '../../types';
import type { OrderItem, CreateOrderPayload } from '../../types/order';
import type { CustomerItem } from '../../types/customer';

interface CartItem {
  product: ProductItem;
  quantity: number;
  notes: string;
}

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

// Chime lembut saat ada masakan siap disajikan dari dapur
const playServeChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {
    console.warn('Audio diblokir browser sebelum ada interaksi:', e);
  }
};

export const WaiterOrderPage: FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [tables, setTables] = useState<TableItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Persistence ID Pesanan yang Sudah Disajikan
  const [deliveredIds, setDeliveredIds] = useState<Set<string | number>>(() => {
    try {
      const saved = localStorage.getItem('waiter_delivered_order_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Notifikasi Pesanan Siap Saji dari Dapur
  const [readyOrders, setReadyOrders] = useState<OrderItem[]>([]);
  const [isReadyModalOpen, setIsReadyModalOpen] = useState(false);
  const previousReadyIdsRef = useRef<Set<string | number>>(new Set());

  // Mode Pesanan: Dine In vs Take Away
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKE_AWAY'>('DINE_IN');

  // Filter & Form States
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | number>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart & Mobile Drawer State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Note Modal State
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [tempNote, setTempNote] = useState('');

  // Polling Pesanan Siap Antar (Disaring dengan daftar yang sudah disajikan)
  const fetchReadyOrders = async () => {
    try {
      const res = await getOrdersApi({ status: 'SELESAI' });
      const rawList: OrderItem[] = Array.isArray(res) ? res : [];

      let currentDelivered = new Set<string | number>();
      try {
        const saved = localStorage.getItem('waiter_delivered_order_ids');
        if (saved) currentDelivered = new Set(JSON.parse(saved));
      } catch {}

      const readyList = rawList.filter((o) => !currentDelivered.has(o.id));

      const currentIds = new Set(readyList.map((o) => o.id));
      const hasNewReady = readyList.some((o) => !previousReadyIdsRef.current.has(o.id));

      if (hasNewReady && previousReadyIdsRef.current.size > 0) {
        playServeChime();
        Toast.fire({
          icon: 'info',
          title: '🔔 Ada hidangan baru yang siap diantar dari dapur!',
        });
      }

      previousReadyIdsRef.current = currentIds;
      setReadyOrders(readyList);
    } catch (err) {
      console.error('Gagal memuat pesanan siap saji:', err);
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [tableRes, categoryRes, productRes, customerRes] = await Promise.all([
        getTablesApi(),
        getCategoriesApi(),
        getProductsApi({ is_active: true }),
        getCustomersApi(),
      ]);
      setTables(Array.isArray(tableRes) ? tableRes : []);
      setCategories(Array.isArray(categoryRes) ? categoryRes : []);
      setProducts(Array.isArray(productRes) ? productRes : []);
      setCustomers(Array.isArray(customerRes) ? customerRes : []);
      await fetchReadyOrders();
    } catch (err: any) {
      Toast.fire({
        icon: 'error',
        title: err.response?.data?.message || 'Gagal memuat data menu resto.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Auto-polling notifikasi dapur tiap 10 detik
    const pollInterval = setInterval(() => {
      fetchReadyOrders();
    }, 10000);

    return () => clearInterval(pollInterval);
  }, []);

  // Filter Katalog Produk
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory =
        selectedCategory === 'ALL' || String(p.category_id) === String(selectedCategory);
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Handler Pemilihan Meja Pintar
  const handleSelectTable = (table: TableItem) => {
    if (table.status !== 'TERISI') {
      setSelectedTable(table);
      return;
    }

    Swal.fire({
      title: `Meja ${table.table_number} Sedang Terisi`,
      html: `Meja ini sedang digunakan oleh tamu resto.<br><br>Apakah Anda ingin <b>menambah pesanan</b> untuk meja ini?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Tambah Pesanan',
      cancelButtonText: 'Batal',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        setSelectedTable(table);
        if (!customerName.trim() && !selectedCustomerId) {
          setCustomerName(`Tamu ${table.table_number} (Tambahan)`);
        }
        Toast.fire({
          icon: 'info',
          title: `Mode Tambah Pesanan untuk Meja ${table.table_number}`,
        });
      }
    });
  };

  // Handler Keranjang
  const handleAddToCart = (product: ProductItem) => {
    if (Number(product.stock) <= 0) {
      Toast.fire({ icon: 'warning', title: `Stok ${product.name} sedang habis` });
      return;
    }

    setCart((prev) => {
      const existingItem = prev.find(
        (item) => String(item.product.id) === String(product.id)
      );

      if (existingItem) {
        if (existingItem.quantity >= Number(product.stock)) {
          Toast.fire({
            icon: 'warning',
            title: `Maksimal stok tercapai (${product.stock})`,
          });
          return prev;
        }

        return prev.map((item) =>
          String(item.product.id) === String(product.id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, { product, quantity: 1, notes: '' }];
    });
  };

  // Handler Stepper Kuantitas Cart
  const handleUpdateQty = (index: number, delta: number) => {
    setCart((prev) => {
      const item = prev[index];
      if (!item) return prev;

      const newQty = item.quantity + delta;

      if (newQty <= 0) {
        return prev.filter((_, idx) => idx !== index);
      }

      if (newQty > Number(item.product.stock)) {
        Toast.fire({
          icon: 'warning',
          title: `Stok terbatas sisa ${item.product.stock}`,
        });
        return prev;
      }

      return prev.map((el, idx) =>
        idx === index ? { ...el, quantity: newQty } : el
      );
    });
  };

  const handleOpenNoteModal = (index: number) => {
    setEditingNoteIndex(index);
    setTempNote(cart[index]?.notes || '');
  };

  const handleSaveNote = () => {
    if (editingNoteIndex !== null) {
      setCart((prev) => {
        const updated = [...prev];
        updated[editingNoteIndex].notes = tempNote.trim();
        return updated;
      });
      setEditingNoteIndex(null);
    }
  };

  // Kalkulasi Finansial
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  }, [cart]);
  

  const taxAmount = Math.round(subtotal * 0.1);
  const totalAmount = subtotal + taxAmount;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Submit Order ke Dapur
  const handleSubmitOrder = async () => {
    if (orderType === 'DINE_IN' && !selectedTable) {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Meja Tamu',
        text: 'Silakan pilih nomor meja customer terlebih dahulu untuk pesanan Makan di Tempat (Dine In).',
        confirmButtonColor: '#059669',
      });
      return;
    }

    if (orderType === 'TAKE_AWAY' && !customerName.trim() && !selectedCustomerId) {
      Swal.fire({
        icon: 'warning',
        title: 'Isi Nama Tamu',
        text: 'Silakan pilih member atau masukkan nama pelanggan untuk pesanan Bungkus (Take Away).',
        confirmButtonColor: '#059669',
      });
      return;
    }

    if (cart.length === 0) {
      Toast.fire({ icon: 'warning', title: 'Keranjang pesanan masih kosong' });
      return;
    }

    const isAddOn = selectedTable?.status === 'TERISI';
    const typeLabel =
      orderType === 'DINE_IN'
        ? isAddOn
          ? `Makan di Tempat (Tambahan Meja ${selectedTable?.table_number})`
          : 'Makan di Tempat (Dine In)'
        : 'Bungkus (Take Away)';
    const tableInfo =
      orderType === 'DINE_IN' ? `Meja: <b>${selectedTable?.table_number}</b><br>` : '';

    const confirm = await Swal.fire({
      title: isAddOn ? 'Kirim Pesanan Tambahan?' : 'Kirim Order ke Dapur?',
      html: `Tipe: <b>${typeLabel}</b><br>${tableInfo}Tamu: <b>${customerName || 'Tamu Resto'}</b><br>Total <b>${totalItemsCount} item</b> seharga <b>Rp ${totalAmount.toLocaleString('id-ID')}</b>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Kirim Sekarang!',
      cancelButtonText: 'Cek Kembali',
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      console.log('llll' + selectedCustomerId);
      
      const payload: CreateOrderPayload & { customer_id?: string | null } = {
        table_id: orderType === 'DINE_IN' && selectedTable ? selectedTable.id : null,
        customer_id: selectedCustomerId || null,
        customer_name:
          customerName.trim() ||
          (orderType === 'DINE_IN' ? `Tamu ${selectedTable?.table_number}` : 'Take Away'),
        order_type: orderType,
        discount_amount: 0,
        items: cart.map((c) => ({
          product_id: c.product.id,
          quantity: c.quantity,
          notes: c.notes || undefined,
        })),
      };

      const res = await createOrderApi(payload);

      Swal.fire({
        icon: 'success',
        title: isAddOn ? 'Pesanan Tambahan Terkirim!' : 'Pesanan Terkirim!',
        text: `Tiket pesanan ${res.order_number} (${orderType}) berhasil diteruskan ke stasiun dapur.`,
        confirmButtonColor: '#059669',
      });

      setCart([]);
      setSelectedTable(null);
      setSelectedCustomerId('');
      setCustomerName('');
      setIsCartOpen(false);
      loadInitialData();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengirim Order',
        text: err.response?.data?.message || 'Terjadi kesalahan sistem saat mengirim order.',
        confirmButtonColor: '#e11d48',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Pelayan Menandai Pesanan Sudah Disajikan ke Tamu
  const handleMarkDelivered = (orderId: string | number) => {
    try {
      const updated = new Set(deliveredIds);
      updated.add(orderId);
      setDeliveredIds(updated);

      localStorage.setItem(
        'waiter_delivered_order_ids',
        JSON.stringify(Array.from(updated))
      );

      setReadyOrders((prev) => prev.filter((o) => o.id !== orderId));

      Toast.fire({
        icon: 'success',
        title: 'Pesanan telah disajikan ke meja tamu.',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-800">
      {/* ================= AREA UTAMA: KATALOG & TIPE ORDER ================= */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar Pelayan */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <CookingPot size={22} weight="bold" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-slate-900">ORDER PELAYAN</h1>
              <p className="text-[10px] text-slate-500">
                Staf: <span className="font-semibold text-emerald-600">{user?.name || 'Pelayan'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tombol Lonceng Pesanan Siap Saji */}
            <button
              type="button"
              onClick={() => setIsReadyModalOpen(true)}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="Pesanan Siap Saji dari Dapur"
            >
              <Bell size={18} weight="bold" />
              {readyOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white ring-2 ring-white animate-bounce">
                  {readyOrders.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={loadInitialData}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
              title="Segarkan Data"
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

        {/* Banner Alert Melayang Saat Ada Pesanan Siap Diantar */}
        {readyOrders.length > 0 && (
          <div
            onClick={() => setIsReadyModalOpen(true)}
            className="flex items-center justify-between bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-inner cursor-pointer hover:bg-emerald-700 transition"
          >
            <div className="flex items-center gap-2">
              <Tray size={18} weight="bold" className="animate-bounce" />
              <span>
                Ada <b>{readyOrders.length} pesanan</b> selesai dimasak & siap diantar ke tamu!
              </span>
            </div>
            <span className="text-[11px] underline">Lihat Meja &rarr;</span>
          </div>
        )}

        {/* Section: Tipe Pesanan, Meja & Select Pelanggan */}
        <section className="border-b border-slate-200 bg-white p-3 lg:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Toggle Mode Dine In vs Take Away */}
            <div className="flex shrink-0 items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setOrderType('DINE_IN')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  orderType === 'DINE_IN'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Armchair size={15} weight="bold" />
                <span>Dine In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrderType('TAKE_AWAY');
                  setSelectedTable(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  orderType === 'TAKE_AWAY'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingBagOpen size={15} weight="bold" />
                <span>Take Away</span>
              </button>
            </div>

            {/* Selector Meja (Hanya tampil jika Dine In) */}
            {orderType === 'DINE_IN' ? (
              <div className="flex-1 overflow-x-auto pb-1 lg:pb-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap mr-1">
                    Pilih Meja:
                  </span>
                  {tables.map((t) => {
                    const isSelected = selectedTable?.id === t.id;
                    const isOccupied = t.status === 'TERISI';
                    const isReadyToServe = readyOrders.some(
                      (ord) => String(ord.table_id) === String(t.id)
                    );

                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => handleSelectTable(t)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition cursor-pointer border ${
                          isReadyToServe
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500 animate-pulse'
                            : isSelected && isOccupied
                            ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                            : isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                            : isOccupied
                            ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <Armchair size={15} weight="bold" />
                        <span>{t.table_number}</span>

                        {isReadyToServe ? (
                          <span className="text-[10px] font-black text-emerald-700">🔔 Siap!</span>
                        ) : isOccupied ? (
                          <span className="text-[9px] font-black uppercase px-1 py-0.2 bg-rose-200/80 text-rose-800 rounded">
                            Terisi
                          </span>
                        ) : (
                          <span className="text-[10px] opacity-75">({t.capacity || 4}k)</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center text-xs text-amber-700 font-semibold px-2">
                <span>Pesanan bawa pulang / bungkus (tanpa meja resto)</span>
              </div>
            )}

            {/* Dropdown Select Pelanggan (Member) + Input Tamu Umum */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedCustomerId(id);

                  const member = customers.find((c) => String(c.id) === id);
                  setCustomerName(member ? member.name : '');
                }}
                className="w-full sm:w-52 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value=""> Tamu Umum (Non-Member) </option>
                {customers.map((cust) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.code} - {cust.name} ({cust.member_tier})
                  </option>
                ))}
              </select>

              {!selectedCustomerId && (
                <input
                  type="text"
                  required={orderType === 'TAKE_AWAY'}
                  placeholder={
                    orderType === 'TAKE_AWAY'
                      ? 'Nama Tamu / Antrean (Wajib)...'
                      : 'Nama Tamu (Opsional)...'
                  }
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full sm:w-48 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-normal"
                />
              )}
            </div>
          </div>
        </section>

        {/* Filter Kategori & Search */}
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-3 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              Semua Menu
            </button>
            {categories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari hidangan / minuman..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Grid Katalog Menu */}
        <main className="flex-1 overflow-y-auto p-3 lg:p-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-xs text-slate-400">
              Memuat katalog hidangan resto...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
              <ForkKnife size={36} className="mb-2 text-slate-300" />
              <p className="text-xs font-medium">Menu tidak ditemukan pada kategori ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {filteredProducts.map((product) => {
                const isOutOfStock = Number(product.stock) <= 0;
                const inCart = cart.find((c) => String(c.product.id) === String(product.id));

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && handleAddToCart(product)}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-2.5 transition select-none ${
                      isOutOfStock
                        ? 'opacity-50 cursor-not-allowed border-slate-200'
                        : 'cursor-pointer border-slate-200 hover:border-emerald-500 hover:shadow-lg active:scale-98'
                    }`}
                  >
                    {inCart && (
                      <span className="absolute top-2 left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-black text-white shadow-md">
                        {inCart.quantity}
                      </span>
                    )}

                    <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
                      {product.image_url ? (
                        <img
                          src={`http://127.0.0.1:5000${product.image_url}`}
                          alt={product.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://placehold.co/200x200?text=Food';
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <ForkKnife size={28} />
                        </div>
                      )}
                      {isOutOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 text-[11px] font-black text-white uppercase tracking-wider">
                          Habis
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="line-clamp-2 text-xs font-extrabold text-slate-800 leading-tight">
                        {product.name}
                      </h4>
                      <p className="mt-0.5 text-[10px] text-slate-400 capitalize">
                        {product.kitchen_station?.replace('_', ' ') || 'Dapur'}
                      </p>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                      <div>
                        <span className="block font-mono text-xs font-black text-emerald-600">
                          Rp {Number(product.price).toLocaleString('id-ID')}
                        </span>
                        <span className="text-[9px] text-slate-400">Stok: {product.stock}</span>
                      </div>
                      <div className="flex h-7 w-7 pointer-events-none items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <Plus size={14} weight="bold" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Floating Mobile Trigger Drawer */}
        {cart.length > 0 && (
          <div className="border-t border-slate-200 bg-white p-3 lg:hidden">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="flex w-full items-center justify-between rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 active:scale-98 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShoppingBagOpen size={18} weight="bold" />
                <span>
                  {totalItemsCount} Menu Dipilih ({orderType})
                </span>
              </div>
              <span className="font-mono text-sm font-black">
                Rp {totalAmount.toLocaleString('id-ID')}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ================= AREA KANAN: CART DRAWER ================= */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 lg:static lg:translate-x-0 ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-2">
            <ShoppingBagOpen size={20} weight="bold" className="text-emerald-600" />
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Rincian Pesanan
              </h3>
              <p className="text-[10px] text-slate-400">
                {orderType === 'DINE_IN' ? (
                  <>
                    Meja: <b className="text-emerald-700">{selectedTable?.table_number || 'Belum Dipilih'}</b>
                    {selectedTable?.status === 'TERISI' && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[9px]">
                        + Tambahan
                      </span>
                    )}
                  </>
                ) : (
                  <b className="text-amber-600 uppercase">Pesanan Bawa Pulang (Take Away)</b>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden cursor-pointer"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Daftar Item Keranjang */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
              <ShoppingBagOpen size={48} className="mb-2 text-slate-200" />
              <p className="text-xs font-semibold">Keranjang masih kosong</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Pilih menu di katalog untuk menambahkan pesanan tamu.
              </p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={item.product.id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-extrabold text-slate-900 leading-tight">
                      {item.product.name}
                    </p>
                    <span className="font-mono text-[11px] font-bold text-emerald-600">
                      Rp {Number(item.product.price).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdateQty(idx, -item.quantity)}
                    className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                  >
                    <Trash size={15} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleOpenNoteModal(idx)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-emerald-600 cursor-pointer"
                  >
                    <NotePencil size={13} />
                    <span>{item.notes ? item.notes : '+ Tambah Catatan'}</span>
                  </button>

                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateQty(idx, -1);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                    >
                      <Minus size={11} weight="bold" />
                    </button>

                    <span className="w-6 text-center font-mono font-bold text-xs select-none">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateQty(idx, 1);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                    >
                      <Plus size={11} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Ringkasan & Tombol Kirim Pesanan */}
        {cart.length > 0 && (
          <div className="border-t border-slate-200 bg-white p-4 space-y-3">
            <div className="space-y-1.5 text-xs text-slate-600 font-medium">
              <div className="flex justify-between">
                <span>Subtotal ({totalItemsCount} item)</span>
                <span className="font-mono font-bold text-slate-800">
                  Rp {subtotal.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pajak Resto (10%)</span>
                <span className="font-mono">Rp {taxAmount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900">
                <span>Total Biaya</span>
                <span className="font-mono text-emerald-600">
                  Rp {totalAmount.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitOrder}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white shadow-lg active:scale-98 disabled:opacity-50 transition cursor-pointer ${
                orderType === 'DINE_IN'
                  ? selectedTable?.status === 'TERISI'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/25'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
                  : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/25'
              }`}
            >
              <CheckCircle size={18} weight="bold" />
              <span>
                {submitting
                  ? 'Mengirim ke Dapur...'
                  : selectedTable?.status === 'TERISI'
                  ? `Kirim Tambahan (Meja ${selectedTable.table_number})`
                  : `Kirim Pesanan ${orderType === 'DINE_IN' ? 'Dine In' : 'Take Away'}`}
              </span>
            </button>
          </div>
        )}
      </aside>

      {/* ================= MODAL CATATAN KHUSUS ================= */}
      {editingNoteIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h4 className="text-xs font-extrabold text-slate-900 mb-1">
              Catatan untuk: {cart[editingNoteIndex]?.product.name}
            </h4>
            <p className="text-[10px] text-slate-400 mb-3">
              Keterangan selera tamu (contoh: pedas manis, es dipisah, tanpa bawang goreng).
            </p>

            <textarea
              rows={3}
              autoFocus
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              placeholder="Tulis instruksi koki di sini..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-normal"
            />

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingNoteIndex(null)}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer"
              >
                Simpan Catatan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DAFTAR PESANAN SIAP DIANTAR ================= */}
      {isReadyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-50/60 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                  <Tray size={20} weight="bold" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Pesanan Siap Diantar ({readyOrders.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Masakan telah matang & siap disajikan dari dapur ke tamu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReadyModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {readyOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                  <CheckCircle size={44} className="mb-2 text-emerald-500" />
                  <p className="text-xs font-bold text-slate-700">Semua Masakan Sudah Diantar</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Belum ada hidangan baru yang siap saji dari dapur.
                  </p>
                </div>
              ) : (
                readyOrders.map((ord) => {
                  const isTakeaway = ord.order_type === 'TAKE_AWAY';

                  return (
                    <div
                      key={ord.id}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-3 transition hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isTakeaway ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-800">
                              <ShoppingBag size={14} weight="bold" /> Bungkus
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-xs">
                              <Armchair size={14} weight="bold" /> Meja {ord.tables?.table_number || '-'}
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-800">
                            {ord.customer_name || 'Tamu Resto'}
                          </span>
                        </div>

                        <span className="font-mono text-[11px] font-bold text-slate-400">
                          {ord.order_number}
                        </span>
                      </div>

                      <div className="rounded-xl border border-emerald-100 bg-white p-2.5 space-y-1">
                        {ord.order_items?.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs text-slate-700 font-semibold"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-emerald-600 font-black">
                                {item.quantity}x
                              </span>
                              <span>{item.products?.name}</span>
                            </div>
                            {item.notes && (
                              <span className="text-[10px] text-amber-600 italic">
                                ({item.notes})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleMarkDelivered(ord.id)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 active:scale-98 transition cursor-pointer"
                      >
                        <CheckCircle size={16} weight="bold" />
                        <span>Sudah Disajikan ke Meja</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaiterOrderPage;