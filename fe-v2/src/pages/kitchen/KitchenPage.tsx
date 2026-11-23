import { useState, useEffect, useMemo, useRef, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  CookingPot,
  ArrowsClockwise,
  SignOut,
  SpeakerHigh,
  SpeakerSlash,
  Clock,
  CheckCircle,
  WarningCircle,
  Armchair,
  ShoppingBag,
  Flame,
  Tray,
} from '@phosphor-icons/react';
import { useAuthStore } from '../../stores/authStore';
import { getOrdersApi, updateOrderStatusApi } from '../../api/orderApi';
import type { OrderItem } from '../../types/order';
import type { OrderStatusEnum } from '../../types/common';

//  Audio Bell menggunakan Web Audio API murni
const playChimeSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(590.00, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (err) {
    console.warn('Audio chime dicegah oleh browser sebelum ada interaksi:', err);
  }
};

// ketika click sebagian sajian
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#0f172a',
  color: '#f8fafc',
});

export const KitchenPage: FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [selectedStation, setSelectedStation] = useState<string>('ALL');

  // Tracking checklist item koki { "orderId-itemId": true/false }
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Timer realtime
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const previousOrderCountRef = useRef<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [] );

  const fetchKitchenOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [pendingOrders, inProgressOrders] = await Promise.all([
        getOrdersApi({ status: 'PENDING' }),
        getOrdersApi({ status: 'DIPROSES' }),
      ]);

      const combined = [
        ...(Array.isArray(pendingOrders) ? pendingOrders : []),
        ...(Array.isArray(inProgressOrders) ? inProgressOrders : []),
      ];

      // Urutkan pesanan terlama di depan (FIFO)
      combined.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      if (
        silent &&
        isAudioEnabled &&
        combined.length > previousOrderCountRef.current
      ) {
        playChimeSound();
      }

      previousOrderCountRef.current = combined.length;
      setOrders(combined);
    } catch (err: any) {
      console.error('Gagal memuat pesanan dapur:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();
    const pollInterval = setInterval(() => {
      fetchKitchenOrders(true);
    }, 8000);

    return () => clearInterval(pollInterval);
  }, [isAudioEnabled]);

  const availableStations = useMemo(() => {
    const stations = new Set<string>();
    orders.forEach((o) => {
      o.order_items?.forEach((i) => {
        if (i.products?.kitchen_station) {
          stations.add(i.products.kitchen_station);
        }
      });
    });
    return Array.from(stations);
  }, [orders]);

  const filteredOrders = useMemo<OrderItem[]>(() => {
    if (selectedStation === 'ALL') return orders;

    return orders.reduce<OrderItem[]>((acc, ord) => {
      const matchingItems = ord.order_items?.filter(
        (i) => i.products?.kitchen_station === selectedStation
      );

      if (matchingItems && matchingItems.length > 0) {
        acc.push({
          ...ord,
          order_items: matchingItems,
        });
      }

      return acc;
    }, []);
  }, [orders, selectedStation]);

  const getElapsedTime = (createdAt: string) => {
    const diffMs = Math.max(0, currentTime.getTime() - new Date(createdAt).getTime());
    const totalMinutes = Math.floor(diffMs / 60000);
    const totalSeconds = Math.floor((diffMs % 60000) / 1000);    

    const pad = (n: number) => String(n).padStart(2, '0'); //gmana ini
    return {
      formatted: `${pad(totalMinutes)}:${pad(totalSeconds)}`,
      minutes: totalMinutes,
    };
  };

  // Handler Sajikan Sebagian: Tiket TETAP ADA di layar
  const handlePartialServe = (ord: OrderItem, checkedCount: number, totalItems: number) => {
    if (checkedCount === 0) {
      Toast.fire({
        icon: 'warning',
        title: 'Centang hidangan yang sudah matang terlebih dahulu.',
      });
      return;
    }

    const tableLabel =
      ord.order_type === 'TAKE_AWAY' ? 'Bungkus' : `Meja ${ord.tables?.table_number || '-'}`;

    Toast.fire({
      icon: 'success',
      title: `${checkedCount} hidangan (${tableLabel}) dipanggil untuk disajikan pelayan. Sisa ${totalItems - checkedCount} hidangan masih dimasak.`,
    });
  };

  // Handler Selesai Penuh: Tiket DIHAPUS dari layar dapur
  const handleFullComplete = async (ord: OrderItem) => {
    try {
      await updateOrderStatusApi(ord.id, 'SELESAI');
      fetchKitchenOrders(true);
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Update Status',
        text: err.response?.data?.message || 'Terjadi kesalahan sistem.',
        background: '#0f172a',
        color: '#f8fafc',
      });
    }
  };

  // Handler Mulai Masak (PENDING -> DIPROSES)
  const handleStartCooking = async (orderId: string | number) => {
    try {
      await updateOrderStatusApi(orderId, 'DIPROSES');
      fetchKitchenOrders(true);
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Update Status',
        text: err.response?.data?.message || 'Terjadi kesalahan sistem.',
        background: '#0f172a',
        color: '#f8fafc',
      });
    }
  };

  const handleToggleCheckItem = (orderId: string | number, itemId: string | number) => {
    const key = `${orderId}-${itemId}`;
    setCheckedItems((prev) => ({
      ...prev, 
      [key]: !prev[key],
    }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      {/* Top Navbar KDS */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Flame size={24} weight="bold" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-wider text-white">KITCHEN DISPLAY (KDS)</h1>
            <p className="text-[11px] text-slate-400">
              Koki / Dapur: <span className="font-semibold text-amber-400">{user?.name || 'Staf Dapur'}</span>
            </p>
          </div>
        </div>

        {/* Station Filter Tabs & Tools */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setSelectedStation('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedStation === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua Pos
            </button>
            {availableStations.map((st) => (
              <button
                type="button"
                key={st}
                onClick={() => setSelectedStation(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                  selectedStation === st
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setIsAudioEnabled(!isAudioEnabled);
              if (!isAudioEnabled) playChimeSound();
            }}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition cursor-pointer ${
              isAudioEnabled
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-slate-800 bg-slate-900 text-slate-500'
            }`}
            title={isAudioEnabled ? 'Audio Aktif' : 'Audio Mati'}
          >
            {isAudioEnabled ? <SpeakerHigh size={20} weight="bold" /> : <SpeakerSlash size={20} />}
          </button>

          <button
            type="button"
            onClick={() => fetchKitchenOrders(false)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 active:scale-95 transition cursor-pointer"
            title="Segarkan Tiket"
          >
            <ArrowsClockwise size={18} weight="bold" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 text-xs font-bold text-rose-400 hover:bg-rose-500/20 active:scale-95 transition cursor-pointer"
          >
            <SignOut size={16} weight="bold" />
            <span className="hidden md:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Grid Tiket Pesanan Masak */}
      <main className="flex-1 overflow-x-auto overflow-y-auto p-4 lg:p-6">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
            Menghubungkan ke antrean dapur...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 mb-3">
              <CheckCircle size={36} weight="bold" />
            </div>
            <h3 className="text-base font-extrabold text-white">Semua Masakan Selesai!</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Tidak ada antrean tiket pesanan yang sedang menunggu atau dimasak.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 items-start">
            {filteredOrders.map((ord) => {
              const elapsed = getElapsedTime(ord.created_at);
              const isTakeaway = ord.order_type === 'TAKE_AWAY';
              const isCooking = ord.status === 'DIPROSES';

              const totalItems = ord.order_items?.length || 0;
              const checkedCount = (ord.order_items || []).filter(
                (item) => checkedItems[`${ord.id}-${item.id}`]
              ).length;
              const isAllChecked = totalItems > 0 && checkedCount === totalItems;

              // Color Aging Alert
              let alertBorder = 'border-slate-800';
              let badgeColor = 'bg-slate-800 text-slate-300';

              if (elapsed.minutes >= 20) {
                alertBorder = 'border-rose-500 animate-pulse';
                badgeColor = 'bg-rose-500 text-white font-black';
              } else if (elapsed.minutes >= 10) {
                alertBorder = 'border-amber-500';
                badgeColor = 'bg-amber-500 text-slate-950 font-black';
              } else if (isCooking) {
                alertBorder = isAllChecked ? 'border-emerald-500' : 'border-blue-500/80';
                badgeColor = isAllChecked
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
              }

              return (
                <div
                  key={ord.id}
                  className={`flex flex-col rounded-2xl bg-slate-900 border ${alertBorder} shadow-xl overflow-hidden transition`}
                >
                  {/* Header Kartu Tiket */}
                  <div className="p-3.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black tracking-wider text-slate-200">
                          {ord.order_number}
                        </span>
                        {isTakeaway ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                            <ShoppingBag size={12} weight="bold" /> Bungkus
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <Armchair size={12} weight="bold" /> Meja {ord.tables?.table_number || '-'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate max-w-[150px]">
                        {ord.customer_name || 'Tamu Resto'}
                      </p>
                    </div>

                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${badgeColor}`}>
                      <Clock size={13} weight="bold" />
                      <span>{elapsed.formatted}</span>
                    </div>
                  </div>

                  {/* Daftar Item Tiket */}
                  <div className="p-3.5 space-y-2.5 flex-1 max-h-80 overflow-y-auto">
                    {ord.order_items?.map((item) => {
                      const itemKey = `${ord.id}-${item.id}`;
                      const isChecked = !!checkedItems[itemKey];

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleCheckItem(ord.id, item.id)}
                          className={`p-2.5 rounded-xl border transition cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-950/20 border-emerald-800/40 opacity-70 line-through text-slate-400'
                              : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600 text-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <span
                                className={`font-mono text-sm font-black min-w-5 ${
                                  isChecked ? 'text-emerald-400' : 'text-amber-400'
                                }`}
                              >
                                {item.quantity}x
                              </span>
                              <div>
                                <p className="text-xs font-extrabold leading-tight">
                                  {item.products?.name}
                                </p>
                                {item.products?.kitchen_station && (
                                  <span className="text-[9px] font-bold text-slate-500 uppercase">
                                    {item.products.kitchen_station.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                                isChecked
                                  ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                  : 'border-slate-600 bg-slate-900'
                              }`}
                            >
                              {isChecked && <CheckCircle size={14} weight="bold" />}
                            </div>
                          </div>

                          {item.notes && (
                            <div className="mt-2 flex items-start gap-1 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-bold no-underline">
                              <WarningCircle size={14} weight="bold" className="shrink-0 mt-0.5" />
                              <span>Catatan: {item.notes}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Tombol Aksi Bawah */}
                  <div className="p-3 bg-slate-950/80 border-t border-slate-800/80">
                    {!isCooking ? (
                      <button
                        type="button"
                        onClick={() => handleStartCooking(ord.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 py-3 text-xs font-black text-white shadow-lg shadow-blue-600/20 transition cursor-pointer"
                      >
                        <CookingPot size={18} weight="bold" />
                        <span>Mulai Masak</span>
                      </button>
                    ) : isAllChecked ? (
                      /* SEMUA SELESAI -> Tiket Dihapus dari Layar Dapur */
                      <button
                        type="button"
                        onClick={() => handleFullComplete(ord)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 py-3 text-xs font-black text-white shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                      >
                        <CheckCircle size={18} weight="bold" />
                        <span>Semua Selesai & Sajikan</span>
                      </button>
                    ) : (
                      /* BELUM SEMUA SELESAI -> Sajikan sebagian & TIKET TETAP DI LAYAR */
                      <button
                        type="button"
                        onClick={() => handlePartialServe(ord, checkedCount, totalItems)}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black transition cursor-pointer active:scale-98 border ${
                          checkedCount > 0
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25'
                            : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <Tray size={18} weight="bold" />
                        <span>
                          {checkedCount > 0
                            ? `Sajikan Sebagian (${checkedCount}/${totalItems} Siap)`
                            : `Centang Item (${checkedCount}/${totalItems})`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default KitchenPage;