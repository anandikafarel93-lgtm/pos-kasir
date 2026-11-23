import { useState, useEffect, type FC, type FormEvent } from 'react';
import Swal from 'sweetalert2';
import {
  Person,
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  X,
  Phone,
  Medal,
  Coins,
} from '@phosphor-icons/react';
import {
  getCustomersApi,
  createCustomerApi,
  updateCustomerApi,
  deleteCustomerApi,
} from '../../api/customerApi';
import type { CustomerItem } from '../../types/customer';

export const CustomersPage: FC = () => {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    member_tier: 'REGULER',
    points: 0,
    notes: '',
  });

  const fetchCustomers = async (keyword = '') => {
    try {
      setLoading(true);
      const data = await getCustomersApi(keyword);
      const sortedData = [...data].sort((a, b) => Number(a.id) - Number(b.id))
      setCustomers(sortedData);
    } catch (err: any) {
      Swal.fire('Error', err.response?.data?.message || 'Gagal memuat data pelanggan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    fetchCustomers(search);
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      member_tier: 'REGULER',
      points: 0,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cust: CustomerItem) => {
    setEditingCustomer(cust);
    setFormData({
      name: cust.name,
      phone: cust.phone,
      email: cust.email || '',
      address: cust.address || '',
      member_tier: cust.member_tier || 'REGULER',
      points: cust.points || 0,
      notes: cust.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingCustomer) {
        await updateCustomerApi(editingCustomer.id, formData);
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data pelanggan diperbarui', timer: 1500, showConfirmButton: false });
      } else {
        await createCustomerApi(formData);
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Pelanggan baru ditambahkan', timer: 1500, showConfirmButton: false });
      }
      setIsModalOpen(false);
      fetchCustomers(search);
    } catch (err: any) {
      Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (cust: CustomerItem) => {
    Swal.fire({
      title: `Hapus ${cust.name}?`,
      text: 'Data pelanggan akan dinonaktifkan dari daftar aktif.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteCustomerApi(cust.id);
          Swal.fire({ icon: 'success', title: 'Terhapus', timer: 1300, showConfirmButton: false });
          fetchCustomers(search);
        } catch (err: any) {
          Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus pelanggan', 'error');
        }
      }
    });
  };

  const getTierBadge = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case 'VIP':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'GOLD':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'SILVER':
        return 'bg-slate-200 text-slate-700 border-slate-300';
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <Person size={22} weight="bold" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Data Pelanggan (Member)</h1>
            <p className="text-xs text-slate-500">Kelola data member, tier loyalitas, dan poin pelanggan</p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition cursor-pointer shadow-sm"
        >
          <Plus size={16} weight="bold" />
          <span>Tambah Pelanggan</span>
        </button>
      </div>

      {/* Filter & Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, nomor HP, atau kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
        >
          Cari
        </button>
      </form>

      {/* Tabel Data */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">             
              <th className="py-3.5 px-4">Id</th>
              <th className="py-3.5 px-4">Kode</th>
              <th className="py-3.5 px-4">Pelanggan</th>
              <th className="py-3.5 px-4">Kontak</th>
              <th className="py-3.5 px-4">Tier</th>
              <th className="py-3.5 px-4">Poin</th>
              <th className="py-3.5 px-4">Total Belanja</th>
              <th className="py-3.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">Memuat data pelanggan...</td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">Belum ada data pelanggan.</td>
              </tr>
            ) : (
              customers.map((cust) => (
                <tr key={cust.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-600">{cust.id}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-600">{cust.code}</td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{cust.name}</p>
                    {cust.notes && <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{cust.notes}</p>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 font-mono text-slate-700">
                      <Phone size={13} className="text-emerald-600" />
                      <span>{cust.phone}</span>
                    </div>
                    {cust.email && <p className="text-[11px] text-slate-400">{cust.email}</p>}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-extrabold ${getTierBadge(cust.member_tier)}`}>
                      <Medal size={12} weight="bold" />
                      {cust.member_tier}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-amber-600">
                    <span className="inline-flex items-center gap-1">
                      <Coins size={14} weight="bold" /> {cust.points}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    Rp {Number(cust.total_spent || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5">
                    <button
                      onClick={() => openEditModal(cust)}
                      className="inline-flex items-center justify-center rounded-lg p-2 hover:text-emerald-600 hover:bg-emerald-100 transition cursor-pointer"
                      title="Edit"
                    >
                      <PencilSimple size={15} weight="bold" />
                    </button>
                    <button
                      onClick={() => handleDelete(cust)}
                      className="inline-flex items-center justify-center rounded-lg hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Hapus"
                    >
                      <Trash size={15} weight="bold" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                {editingCustomer ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. HP / WA *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tier Member</label>
                  <select
                    value={formData.member_tier}
                    onChange={(e) => setFormData({ ...formData, member_tier: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="REGULER">REGULER</option>
                    <option value="SILVER">SILVER</option>
                    <option value="GOLD">GOLD</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email (Opsional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {editingCustomer && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Poin Loyalitas</label>
                    <input
                      type="number"
                      value={formData.points}
                      onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alamat</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Preferensi</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Less sugar, alergi kacang..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;