import { useState, useEffect, type FC, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AdminLayoutContextType } from '../../components/layout/AdminLayout';
import { TopBar } from '../../components/layout/TopBar';
import Swal from 'sweetalert2';
import {
  Wallet,
  PlusCircle,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  X,
  CreditCard,
  QrCode,
  Money,
  CheckCircle,
  XCircle,
} from '@phosphor-icons/react';
import {
  getPaymentMethodsApi,
  createPaymentMethodApi,
  updatePaymentMethodApi,
  patchPaymentMethodApi,
  deletePaymentMethodApi,
} from '../../api/paymentMethodApi';
import type { PaymentMethodItem, PaymentMethodPayload } from '../../types/paymentMethod';

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

export const PaymentMethodsPage: FC = () => {
  const { openMobileSidebar } = useOutletContext<AdminLayoutContextType>();

  const [methods, setMethods] = useState<PaymentMethodItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodItem | null>(null);
  const [formData, setFormData] = useState<PaymentMethodPayload>({
    name: '',
    code: '',
    is_active: true,
  });
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const activeParam =
        statusFilter === 'all' ? undefined : statusFilter === 'active';
      const data = await getPaymentMethodsApi(activeParam);
      setMethods(data);
    } catch (err: any) {
      console.error('Gagal mengambil data metode pembayaran:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, [statusFilter]);

  const handleOpenAdd = () => {
    setSelectedMethod(null);
    setFormData({ name: '', code: '', is_active: true });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (item: PaymentMethodItem) => {
    setSelectedMethod(item);
    setFormData({
      name: item.name,
      code: item.code,
      is_active: item.is_active,
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Toggle status aktif/nonaktif langsung dari baris tabel
  const handleToggleActive = async (item: PaymentMethodItem) => {
    try {
      const updatedStatus = !item.is_active;
      await patchPaymentMethodApi(item.id, { is_active: updatedStatus });
      Toast.fire({
        icon: 'success',
        title: `Metode ${item.name} berhasil di-${updatedStatus ? 'aktifkan' : 'nonaktifkan'}`,
      });
      fetchPaymentMethods();
    } catch (err: any) {
      Toast.fire({
        icon: 'error',
        title: err.response?.data?.message || 'Gagal mengubah status',
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitLoading(true);

    try {
      const payload: PaymentMethodPayload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        is_active: formData.is_active,
      };

      if (selectedMethod) {
        await updatePaymentMethodApi(selectedMethod.id, payload);
        Toast.fire({
          icon: 'success',
          title: `Metode "${payload.name}" berhasil diperbarui`,
        });
      } else {
        await createPaymentMethodApi(payload);
        Toast.fire({
          icon: 'success',
          title: `Metode "${payload.name}" berhasil ditambahkan`,
        });
      }

      setIsFormModalOpen(false);
      fetchPaymentMethods();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Terjadi kesalahan saat memproses data.';
      setFormError(msg);
      Toast.fire({ icon: 'error', title: msg });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (item: PaymentMethodItem) => {
    const result = await Swal.fire({
      title: 'Hapus Metode Pembayaran?',
      text: `Metode "${item.name}" (${item.code}) akan dihapus permanen.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        await deletePaymentMethodApi(item.id);
        Toast.fire({
          icon: 'success',
          title: `Metode "${item.name}" berhasil dihapus`,
        });
        fetchPaymentMethods();
      } catch (err: any) {
        Swal.fire({
          icon: 'warning',
          title: 'Tidak Bisa Menghapus',
          text: err.response?.data?.message || 'Gagal menghapus metode pembayaran.',
          confirmButtonColor: '#059669',
        });
      }
    }
  };

  // Helper icon visual berdasarkan nama/kode
  const renderMethodIcon = (code: string) => {
    const upper = code.toUpperCase();
    if (upper.includes('TUNAI') || upper.includes('CASH')) {
      return <Money size={20} className="text-emerald-600" weight="bold" />;
    }
    if (upper.includes('QRIS') || upper.includes('QR')) {
      return <QrCode size={20} className="text-purple-600" weight="bold" />;
    }
    return <CreditCard size={20} className="text-blue-600" weight="bold" />;
  };

  const filteredMethods = methods.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalActive = methods.filter((m) => m.is_active).length;

  return (
    <>
      <TopBar
        title="Metode Pembayaran"
        subtitle="Kelola opsi transaksi kasir (Tunai, QRIS, Debit, Transfer, dll.)."
        onOpenMobileSidebar={openMobileSidebar}
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 md:px-4 py-2 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer"
          >
            <PlusCircle size={18} weight="bold" />
            <span className="hidden sm:inline">Tambah Metode</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Metrik Mini */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Channel Pembayaran</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{methods.length} Channel</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
              <Wallet size={28} weight="bold" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Channel Aktif di Kasir</p>
              <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{totalActive} Aktif</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
              <CreditCard size={28} weight="bold" />
            </div>
          </div>
        </div>

        {/* Tabel Data */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative w-full sm:w-64">
                <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau kode bayar..."
                  className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Filter Aktif */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="all">Semua Status</option>
                <option value="active">Hanya Aktif</option>
                <option value="inactive">Hanya Nonaktif</option>
              </select>
            </div>

            <span className="text-xs text-slate-500">
              Total <b>{filteredMethods.length}</b> metode pembayaran
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[620px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">ID</th>
                  <th className="py-3.5 px-6">Icon</th>
                  <th className="py-3.5 px-6">Nama Metode</th>
                  <th className="py-3.5 px-6">Kode Unik</th>
                  <th className="py-3.5 px-6 text-center">Status di Kasir</th>
                  <th className="py-3.5 px-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Memuat daftar metode pembayaran...
                    </td>
                  </tr>
                ) : filteredMethods.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Tidak ada metode pembayaran yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredMethods.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">
                        {item.id.toString()}
                      </td>
                      <td className="py-4 px-6">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                          {renderMethodIcon(item.code)}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900">{item.name}</td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-bold border border-slate-200">
                          {item.code}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition cursor-pointer border ${
                            item.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Klik untuk mengubah status aktif/nonaktif"
                        >
                          {item.is_active ? (
                            <>
                              <CheckCircle size={12} weight="bold" />
                              <span>AKTIF</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={12} weight="bold" />
                              <span>NONAKTIF</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Edit Metode"
                          >
                            <PencilSimple size={16} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Hapus Metode"
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

      {/* ================= MODAL TAMBAH / EDIT METODE ================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-extrabold text-slate-900">
                {selectedMethod ? 'Edit Metode Pembayaran' : 'Tambah Metode Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-semibold">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 mb-1">Nama Metode Pembayaran</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Tunai / Cash, QRIS BCA, EDC Mandiri"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-normal"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Kode Unik Sistem (Otomatis Kapital)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: CASH, QRIS, DEBIT_BCA, GO_PAY"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
                <p className="text-[11px] text-slate-400 mt-1 font-normal">
                  Digunakan untuk identifikasi unik saat transaksi di kasir.
                </p>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-slate-700 font-bold">
                    Aktifkan opsi ini di menu kasir
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {submitLoading ? 'Menyimpan...' : 'Simpan Metode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentMethodsPage;