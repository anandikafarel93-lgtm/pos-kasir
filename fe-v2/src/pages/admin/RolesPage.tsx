import { useState, useEffect, type FC, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AdminLayoutContextType } from '../../components/layout/AdminLayout';
import { TopBar } from '../../components/layout/TopBar';
import {
  ShieldCheck,
  PlusCircle,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  X,
  UsersThree,
  Key,
  Eye,
} from '@phosphor-icons/react';
import {
  getRolesApi,
  getRoleByIdApi,
  createRoleApi,
  updateRoleApi,
  deleteRoleApi,
  type RoleItem,
  type RolePayload,
} from '../../api/roleApi';
import type { RoleCodeEnum } from '../../types';
import Swal from 'sweetalert2';

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

const ROLE_ENUM_OPTIONS: RoleCodeEnum[] = ['SUPERADMIN', 'KASIR', 'DAPUR', 'PELAYAN'];

export const RolesPage: FC = () => {
  const { openMobileSidebar } = useOutletContext<AdminLayoutContextType>();

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // State Form Modal (Tambah / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [formData, setFormData] = useState<RolePayload>({
    name: '',
    code: 'SUPERADMIN',
    description: '',
  });
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // State Detail Modal (Lihat Pengguna Terikat)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [detailRole, setDetailRole] = useState<RoleItem | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await getRolesApi();
      setRoles(data);
    } catch (err: any) {
      console.error('Gagal mengambil daftar roles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleOpenAdd = () => {
    setSelectedRole(null);
    setFormData({ name: '', code: 'SUPERADMIN', description: '' });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (role: RoleItem) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      code: role.code,
      description: role.description || '',
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = async (id: string | number) => {
    try {
      setIsDetailModalOpen(true);
      setDetailLoading(true);
      const data = await getRoleByIdApi(id);
      setDetailRole(data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal memuat detail pengguna');
      setIsDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitLoading(true);

    try {
      const payload: RolePayload = {
        name: formData.name.trim(),
        code: formData.code,
        description: formData.description?.trim() || undefined,
      };

      if (selectedRole) {
        // 1. UPDATE DATA (PUT)
        await updateRoleApi(selectedRole.id, payload);
        
        // Munculkan Toast Berhasil Edit
        Toast.fire({
          icon: 'success',
          title: `Role "${payload.name}" berhasil diperbarui`,
        });
      } else {
        // 2. CREATE DATA (POST)
        await createRoleApi(payload);
        
        // Munculkan Toast Berhasil Simpan Baru
        Toast.fire({
          icon: 'success',
          title: `Role baru "${payload.name}" berhasil ditambahkan`,
        });
      }

      setIsFormModalOpen(false); // Tutup modal form
      fetchRoles();              // Refresh data tabel
    } catch (err: any) {
      // Pesan error tetap bisa ditaruh di dalam modal form atau pakai Toast error
      const msg = err.response?.data?.message || 'Terjadi kesalahan saat memproses data.';
      setFormError(msg);

      Toast.fire({
        icon: 'error',
        title: msg,
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (role: RoleItem) => {
    const userCount = role._count?.users || 0;

    // 1. Peringatan modal jika role masih dipakai oleh staf aktif
    if (userCount > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Tidak Bisa Menghapus',
        text: `Role "${role.name}" masih digunakan oleh ${userCount} staf. Pindahkan atau hapus staf terkait terlebih dahulu.`,
        confirmButtonColor: '#059669',
      });
      return;
    }

    // 2. Modal konfirmasi hapus (tetap di tengah layar)
    const result = await Swal.fire({
      title: 'Hapus Role Ini?',
      text: `Role "${role.name}" (${role.code}) akan dihapus secara permanen.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48', // Rose-600
      cancelButtonColor: '#64748b',  // Slate-500
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        await deleteRoleApi(role.id);
        Toast.fire({
          icon: 'success',
          title: `Role "${role.name}" berhasil dihapus`,
        });

        fetchRoles();
      } catch (err: any) {
        Toast.fire({
          icon: 'error',
          title: err.response?.data?.message || 'Gagal menghapus role dari server.',
        });
      }
    }
  };

  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (role.description && role.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <TopBar
        title="Hak Akses (Roles)"
        subtitle="Kelola nama peran dan mapping enum role_code_enum Prisma."
        onOpenMobileSidebar={openMobileSidebar}
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 md:px-4 py-2 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer"
          >
            <PlusCircle size={18} weight="bold" />
            <span className="hidden sm:inline">Tambah Role</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Ringkasan Statistik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Role Terdaftar</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{roles.length} Role</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
              <ShieldCheck size={28} weight="bold" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Enum Tersedia</p>
              <h3 className="text-xs font-mono font-bold text-slate-700 mt-1">
                SUPERADMIN, KASIR, DAPUR, PELAYAN
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
              <Key size={28} weight="bold" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Staf Terikat</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                {roles.reduce((acc, curr) => acc + (curr._count?.users || 0), 0)} Staf
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl">
              <UsersThree size={28} weight="bold" />
            </div>
          </div>
        </div>

        {/* Tabel Data Roles */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative w-full sm:w-72">
              <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama role atau kode enum..."
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <span className="text-xs text-slate-500 text-right sm:text-left">
              Total <b>{filteredRoles.length}</b> role
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">ID</th>
                  <th className="py-3.5 px-6">Nama Role</th>
                  <th className="py-3.5 px-6">Kode Enum</th>
                  <th className="py-3.5 px-6">Deskripsi</th>
                  <th className="py-3.5 px-6 text-center">Staf Terikat</th>
                  <th className="py-3.5 px-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Memuat daftar role...
                    </td>
                  </tr>
                ) : filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Tidak ada role ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role) => (
                    <tr key={role.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">
                        {role.id.toString()}
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900">{role.name}</td>
                      <td className="py-4 px-6 font-mono font-semibold">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                            role.code === 'SUPERADMIN'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : role.code === 'KASIR'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : role.code === 'DAPUR'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {role.code}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-500 max-w-xs truncate">
                        {role.description || '-'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(role.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
                          title="Lihat pengguna dengan role ini"
                        >
                          <UsersThree size={14} />
                          {role._count?.users ?? 0} Staf
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(role.id)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                            title="Detail Staf"
                          >
                            <Eye size={16} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(role)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Edit Role"
                          >
                            <PencilSimple size={16} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(role)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Hapus Role"
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

      {/* ================= MODAL TAMBAH / EDIT ROLE ================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-extrabold text-slate-900">
                {selectedRole ? 'Edit Data Role' : 'Tambah Role Baru'}
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
                <label className="block text-slate-700 mb-1">Nama Role</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Petugas Kasir Resto"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-normal"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Kode Enum (Code)</label>
                <select
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value as RoleCodeEnum })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                >
                  {ROLE_ENUM_OPTIONS.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1 font-normal">
                  Sesuai dengan <code>role_code_enum</code> pada Prisma.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Deskripsi Tugas</label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Menginput pesanan, mencetak struk, dan memproses transaksi kasir"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-normal resize-none"
                />
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
                  {submitLoading ? 'Menyimpan...' : 'Simpan Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DETAIL USER PER ROLE ================= */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Pengguna Terdaftar: {detailRole?.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kode Enum: <span className="font-mono font-bold text-slate-700">{detailRole?.code}</span>
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

            <div className="p-5 max-h-80 overflow-y-auto">
              {detailLoading ? (
                <p className="text-center py-6 text-slate-400 text-xs">Memuat detail pengguna...</p>
              ) : !detailRole?.users || detailRole.users.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Belum ada staf yang terdaftar dengan role ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {detailRole.users.map((user) => (
                    <div key={user.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{user.name}</p>
                        <p className="text-slate-400 text-[11px]">
                          @{user.username} {user.email ? `• ${user.email}` : ''}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {user.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
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

export default RolesPage;