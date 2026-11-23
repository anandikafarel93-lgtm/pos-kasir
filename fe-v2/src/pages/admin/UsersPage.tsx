import { useState, useEffect, type FC, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AdminLayoutContextType } from '../../components/layout/AdminLayout';
import { TopBar } from '../../components/layout/TopBar';
import Swal from 'sweetalert2';
import {
  Users,
  PlusCircle,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  X,
  ShieldCheck,
  CheckCircle,
  XCircle,
  LockKey,
  Key,
} from '@phosphor-icons/react';
import {
  getUsersApi,
  createUserApi,
  updateUserApi,
  deleteUserApi,
} from '../../api/userApi';
import { getRolesApi } from '../../api/roleApi';
import type { UserItem, UserPayload } from '../../types/user';
import type { RoleModel } from '../../types/role';

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

export const UsersPage: FC = () => {
  const { openMobileSidebar } = useOutletContext<AdminLayoutContextType>();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState<UserPayload>({
    role_id: '',
    name: '',
    username: '',
    email: '',
    password: '',
    pin_code: '',
    phone: '',
    is_active: true,
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsersApi();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Gagal mengambil daftar pengguna:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await getRolesApi();
      setRoles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Gagal mengambil daftar role:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleOpenAdd = () => {
    setSelectedUser(null);
    setFormData({
      role_id: roles.length > 0 ? roles[0].id : '',
      name: '',
      username: '',
      email: '',
      password: '',
      pin_code: '',
      phone: '',
      is_active: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserItem) => {
    setSelectedUser(user);
    setFormData({
      role_id: user.role_id,
      name: user.name,
      username: user.username,
      email: user.email || '',
      password: '',
      pin_code: '',
      phone: user.phone || '',
      is_active: Boolean(user.is_active),
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.role_id) {
      setFormError('Silakan pilih role staf.');
      return;
    }

    if (!selectedUser && (!formData.password || formData.password.trim() === '')) {
      setFormError('Password wajib diisi untuk pengguna baru.');
      return;
    }

    setSubmitLoading(true);
    try {
      const payload: UserPayload = {
        role_id: formData.role_id,
        name: formData.name.trim(),
        username: formData.username?.trim(),
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        is_active: formData.is_active,
      };

      if (formData.password && formData.password.trim() !== '') {
        payload.password = formData.password;
      }

      if (formData.pin_code && formData.pin_code.trim() !== '') {
        payload.pin_code = formData.pin_code.trim();
      }

      if (selectedUser) {
        await updateUserApi(selectedUser.id, payload);
        Toast.fire({
          icon: 'success',
          title: `Pengguna "${payload.name}" berhasil diperbarui`,
        });
      } else {
        await createUserApi(payload);
        Toast.fire({
          icon: 'success',
          title: `Pengguna "${payload.name}" berhasil ditambahkan`,
        });
      }

      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyimpan data pengguna.';
      setFormError(msg);
      Toast.fire({ icon: 'error', title: msg });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (user: UserItem) => {
    const result = await Swal.fire({
      title: 'Hapus Pengguna Ini?',
      text: `Akun "${user.name}" (@${user.username}) akan dihapus permanen dari sistem.`,
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
        await deleteUserApi(user.id);
        Toast.fire({
          icon: 'success',
          title: `Pengguna "${user.name}" berhasil dihapus`,
        });
        fetchUsers();
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'Tidak Bisa Menghapus',
          text: err.response?.data?.message || 'Gagal menghapus pengguna.',
          confirmButtonColor: '#059669',
        });
      }
    }
  };

  const renderRoleBadge = (code?: string, name?: string) => {
    switch (code?.toUpperCase()) {
      case 'SUPERADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldCheck size={12} weight="bold" /> {name || 'SUPERADMIN'}
          </span>
        );
      case 'KASIR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {name || 'KASIR'}
          </span>
        );
      case 'PELAYAN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {name || 'PELAYAN'}
          </span>
        );
      case 'DAPUR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            {name || 'DAPUR'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {name || 'STAF'}
          </span>
        );
    }
  };

  const filteredUsers = (Array.isArray(users) ? users : []).filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchName = u.name.toLowerCase().includes(q);
    const matchUsername = u.username.toLowerCase().includes(q);
    const matchEmail = u.email ? u.email.toLowerCase().includes(q) : false;
    const matchRole =
      selectedRoleFilter === '' || String(u.role_id) === String(selectedRoleFilter);

    return (matchName || matchUsername || matchEmail) && matchRole;
  });

  return (
    <>
      <TopBar
        title="Manajemen Pengguna & Staf"
        subtitle="Kelola akun staf resto, pembagian hak akses role, PIN kasir, dan kata sandi."
        onOpenMobileSidebar={openMobileSidebar}
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 md:px-4 py-2 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer"
          >
            <PlusCircle size={18} weight="bold" />
            <span className="hidden sm:inline">Tambah Pengguna</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Ringkasan Jumlah Staf */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Akun Staf</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{users.length} Akun</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-2xl">
              <Users size={28} weight="bold" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Staf Aktif Bekerja</p>
              <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">
                {users.filter((u) => u.is_active).length} Aktif
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
              <CheckCircle size={28} weight="bold" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Staf Nonaktif / Cuti</p>
              <h3 className="text-2xl font-extrabold text-rose-600 mt-1">
                {users.filter((u) => !u.is_active).length} Nonaktif
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl">
              <XCircle size={28} weight="bold" />
            </div>
          </div>
        </div>

        {/* Tabel Data Staf */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative w-full sm:w-64">
                <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, username, email..."
                  className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Filter Role Berdasarkan Data Backend */}
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Semua Role</option>
                {roles.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs text-slate-500">
              Total <b>{filteredUsers.length}</b> akun
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Nama Staf</th>
                  <th className="py-3.5 px-6">Username</th>
                  <th className="py-3.5 px-6">Role Akses</th>
                  <th className="py-3.5 px-6">Kontak / Email</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Memuat daftar pengguna...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Tidak ada pengguna yang cocok dengan kriteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 font-extrabold text-slate-900">
                        {user.name}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] text-slate-700 font-bold border border-slate-200">
                          @{user.username}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {renderRoleBadge(user.roles?.code, user.roles?.name)}
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <p>{user.email || '-'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{user.phone || '-'}</p>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            user.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {user.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Edit Pengguna"
                          >
                            <PencilSimple size={16} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Hapus Pengguna"
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

      {/* ================= MODAL TAMBAH / EDIT PENGGUNA ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h3 className="text-base font-extrabold text-slate-900">
                {selectedUser ? 'Edit Akun Staf' : 'Tambah Staf Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-normal"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    disabled={!!selectedUser}
                    placeholder="Contoh: budi_kasir"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 mb-1">Role Hak Akses</label>
                  <select
                    required
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Pilih Role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={String(r.id)}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="0812xxxxxxx"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-normal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Alamat Email (Opsional)</label>
                <input
                  type="email"
                  placeholder="staf@restoran.com"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-normal"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 mb-1">
                    {selectedUser ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi (Password)'}
                  </label>
                  <div className="relative">
                    <LockKey size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-normal"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">
                    PIN Cepat Kasir / POS (4-6 Angka)
                  </label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      maxLength={6}
                      placeholder="1234"
                      value={formData.pin_code || ''}
                      onChange={(e) => setFormData({ ...formData, pin_code: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-normal"
                    />
                  </div>
                </div>
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
                    Akun staf aktif dan diizinkan masuk ke sistem
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {submitLoading ? 'Menyimpan...' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UsersPage;