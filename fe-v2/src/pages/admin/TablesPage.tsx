import { useState, useEffect, type FC, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AdminLayoutContextType } from '../../components/layout/AdminLayout';
import { TopBar } from '../../components/layout/TopBar';
import Swal from 'sweetalert2';
import {
  Armchair,
  PlusCircle,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  X,
  Eye,
  Users,
  Receipt,
  CheckCircle,
  WarningCircle,
  Clock,
} from '@phosphor-icons/react';
import {
  getTablesApi,
  getTableByIdApi,
  createTableApi,
  updateTableApi,
  patchTableApi,
  deleteTableApi,
} from '../../api/tableApi';
import type { TableItem, TablePayload } from '../../types/table';
import type { TableStatusEnum } from '../../types/common';

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

const TABLE_STATUS_OPTIONS: TableStatusEnum[] = ['TERSEDIA', 'TERISI', 'DIPESAN'];

export const TablesPage: FC = () => {
  const { openMobileSidebar } = useOutletContext<AdminLayoutContextType>();

  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<TableStatusEnum | ''>('');

  // State Modal Form (Tambah / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [formData, setFormData] = useState<TablePayload>({
    table_number: '',
    capacity: 4,
    status: 'TERSEDIA',
  });
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // State Modal Detail (Pesanan Aktif di Meja)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [detailTable, setDetailTable] = useState<TableItem | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const fetchTables = async () => {
  try {
    setLoading(true);
    const data = await getTablesApi(filterStatus);

    const validData = Array.isArray(data) ? data : [];
    const sortedData = [...validData].sort((a, b) => Number(a.id) - Number(b.id));
    setTables(sortedData)
  } catch (err: any) {
    console.error('Gagal mengambil daftar meja:', err);
    setTables([]); // Tetap set array kosong saat error
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchTables();
  }, [filterStatus]);

  const handleOpenAdd = () => {
    setSelectedTable(null);
    setFormData({ table_number: '', capacity: 4, status: 'TERSEDIA' });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (table: TableItem) => {
    setSelectedTable(table);
    setFormData({
      table_number: table.table_number,
      capacity: table.capacity || 4,
      status: table.status,
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = async (id: string | number) => {
    try {
      setIsDetailModalOpen(true);
      setDetailLoading(true);
      const data = await getTableByIdApi(id);
      setDetailTable(data);
    } catch (err: any) {
      Toast.fire({
        icon: 'error',
        title: err.response?.data?.message || 'Gagal memuat detail meja',
      });
      setIsDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleQuickStatusChange = async (id: string | number, newStatus: TableStatusEnum) => {
    try {
      await patchTableApi(id, { status: newStatus });
      Toast.fire({
        icon: 'success',
        title: `Status meja berhasil diubah ke ${newStatus}`,
      });
      fetchTables();
    } catch (err: any) {
      Toast.fire({
        icon: 'error',
        title: err.response?.data?.message || 'Gagal mengubah status meja',
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitLoading(true);

    try {
      const payload: TablePayload = {
        table_number: formData.table_number.trim(),
        capacity: Number(formData.capacity) || 4,
        status: formData.status,
      };

      if (selectedTable) {
        await updateTableApi(selectedTable.id, payload);
        Toast.fire({
          icon: 'success',
          title: `Meja "${payload.table_number}" berhasil diperbarui`,
        });
      } else {
        await createTableApi(payload);
        Toast.fire({
          icon: 'success',
          title: `Meja baru "${payload.table_number}" berhasil ditambahkan`,
        });
      }

      setIsFormModalOpen(false);
      fetchTables();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Terjadi kesalahan saat memproses data meja.';
      setFormError(msg);
      Toast.fire({ icon: 'error', title: msg });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (table: TableItem) => {
    const result = await Swal.fire({
      title: 'Hapus Meja Ini?',
      text: `Nomor meja "${table.table_number}" akan dihapus permanen dari sistem.`,
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
        await deleteTableApi(table.id);
        Toast.fire({
          icon: 'success',
          title: `Meja "${table.table_number}" berhasil dihapus`,
        });
        fetchTables();
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'Tidak Bisa Menghapus',
          text: err.response?.data?.message || 'Gagal menghapus meja dari database.',
          confirmButtonColor: '#059669',
        });
      }
    }
  };

  const renderStatusBadge = (status: TableStatusEnum) => {
    switch (status) {
      case 'TERSEDIA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle size={12} weight="bold" />
            TERSEDIA
          </span>
        );
      case 'TERISI':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <WarningCircle size={12} weight="bold" />
            TERISI
          </span>
        );
      case 'DIPESAN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} weight="bold" />
            DIPESAN
          </span>
        );
    }
  };

  const filteredTables = tables.filter((t) =>
    t.table_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const countTersedia = tables.filter((t) => t.status === 'TERSEDIA').length;
  const countTerisi = tables.filter((t) => t.status === 'TERISI').length;
  const countDipesan = tables.filter((t) => t.status === 'DIPESAN').length;

  return (
    <>
      <TopBar
        title="Data Meja Resto"
        subtitle="Atur ketersediaan meja, kapasitas kursi, dan pantau tamu aktif."
        onOpenMobileSidebar={openMobileSidebar}
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 md:px-4 py-2 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer"
          >
            <PlusCircle size={18} weight="bold" />
            <span className="hidden sm:inline">Tambah Meja</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Ringkasan Status Meja */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Total Meja</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">{tables.length} Unit</h3>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs text-emerald-600 font-medium">Tersedia (Kosong)</p>
            <h3 className="text-xl font-extrabold text-emerald-600 mt-1">{countTersedia} Meja</h3>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs text-rose-600 font-medium">Terisi Tamu</p>
            <h3 className="text-xl font-extrabold text-rose-600 mt-1">{countTerisi} Meja</h3>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs text-amber-600 font-medium">Direservasi / Dipesan</p>
            <h3 className="text-xl font-extrabold text-amber-600 mt-1">{countDipesan} Meja</h3>
          </div>
        </div>

        {/* Tabel Data Meja */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative w-full sm:w-64">
                <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nomor meja..."
                  className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Filter Status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as TableStatusEnum | '')}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">Semua Status</option>
                {TABLE_STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs text-slate-500">
              Total <b>{filteredTables.length}</b> meja terdaftar
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">ID</th>
                  <th className="py-3.5 px-6">Nomor / Nama Meja</th>
                  <th className="py-3.5 px-6">Kapasitas Kursi</th>
                  <th className="py-3.5 px-6">Status Meja</th>
                  <th className="py-3.5 px-6 text-center">Ganti Status Cepat</th>
                  <th className="py-3.5 px-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Memuat daftar meja...
                    </td>
                  </tr>
                ) : filteredTables.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Tidak ada meja yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredTables.map((table) => (
                    <tr key={table.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">
                        {table.id.toString()}
                      </td>
                      <td className="py-4 px-6 font-extrabold text-slate-900">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(table.id)}
                          className="hover:text-emerald-600 transition cursor-pointer flex items-center gap-2"
                        >
                          <Armchair size={18} className="text-slate-500" />
                          <span>{table.table_number}</span>
                        </button>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <Users size={14} className="text-slate-400" />
                          {table.capacity || 4} Kursi
                        </span>
                      </td>
                      <td className="py-4 px-6">{renderStatusBadge(table.status)}</td>
                      <td className="py-4 px-6 text-center">
                        <select
                          value={table.status}
                          onChange={(e) =>
                            handleQuickStatusChange(table.id, e.target.value as TableStatusEnum)
                          }
                          className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          {TABLE_STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(table.id)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                            title="Detail Order di Meja"
                          >
                            <Eye size={16} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(table)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Edit Meja"
                          >
                            <PencilSimple size={16} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(table)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Hapus Meja"
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

      {/* ================= MODAL TAMBAH / EDIT MEJA ================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-extrabold text-slate-900">
                {selectedTable ? 'Edit Data Meja' : 'Tambah Meja Baru'}
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
                <label className="block text-slate-700 mb-1">Nomor / Kode Meja</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Meja 01, VIP-A, Outdoor 2"
                  value={formData.table_number}
                  onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-normal"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Kapasitas Tempat Duduk (Orang)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={formData.capacity ?? 4}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-normal"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Status Meja</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as TableStatusEnum })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-bold"
                >
                  {TABLE_STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
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
                  {submitLoading ? 'Menyimpan...' : 'Simpan Meja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DETAIL STATUS PESANAN MEJA ================= */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Armchair size={22} weight="bold" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Status: {detailTable?.table_number}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {detailTable && renderStatusBadge(detailTable.status)}
                    <span className="text-[11px] text-slate-400">
                      Kapasitas: {detailTable?.capacity || 4} orang
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="p-5 max-h-80 overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Pesanan Berlangsung (Pending / Diproses)
              </h4>

              {detailLoading ? (
                <p className="text-center py-6 text-slate-400 text-xs">Memeriksa pesanan meja...</p>
              ) : !detailTable?.orders || detailTable.orders.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-100 text-slate-400 text-xs">
                  Tidak ada pesanan aktif pada meja ini saat ini. Meja dalam keadaan siap pakai.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {detailTable.orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Receipt size={16} className="text-slate-400" />
                          <span className="font-mono font-bold text-slate-800">
                            {order.order_number}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            {order.status}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-1">
                          Tamu: <span className="font-semibold text-slate-700">{order.customer_name || 'Tanpa Nama'}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-extrabold text-emerald-600 font-mono text-sm">
                          Rp {Number(order.total_amount).toLocaleString('id-ID')}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {new Date(order.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 text-right">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
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

export default TablesPage;