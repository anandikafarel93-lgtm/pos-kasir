import { useState, useEffect, type FC, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AdminLayoutContextType } from '../../components/layout/AdminLayout';
import { TopBar } from '../../components/layout/TopBar';
import Swal from 'sweetalert2';
import {
  Tag,
  PlusCircle,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  X,
  ForkKnife,
  Eye,
  Coffee,
  Pizza,
  Hamburger,
  BowlFood,
  Cookie,
  BeerBottle,
  Flame,
} from '@phosphor-icons/react';
import {
  getCategoriesApi,
  getCategoryByIdApi,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
} from '../../api/categoryApi';
import type { CategoryItem, CategoryPayload } from '../../types/category';

// Toast SweetAlert2 di pojok kanan atas
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

// Pilihan template icon cepat untuk resto
const ICON_OPTIONS = [
  'ForkKnife',
  'Coffee',
  'Pizza',
  'Hamburger',
  'BowlFood',
  'Cookie',
  'BeerBottle',
  'Flame',
];

export const CategoriesPage: FC = () => {
  const { openMobileSidebar } = useOutletContext<AdminLayoutContextType>();

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // State Form Modal (Tambah / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [formData, setFormData] = useState<CategoryPayload>({
    name: '',
    icon: 'ForkKnife',
  });
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // State Detail Modal (Lihat Daftar Produk Terikat)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [detailCategory, setDetailCategory] = useState<CategoryItem | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getCategoriesApi();
      setCategories(data);
    } catch (err: any) {
      console.error('Gagal mengambil daftar kategori:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAdd = () => {
    setSelectedCategory(null);
    setFormData({ name: '', icon: 'ForkKnife' });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (category: CategoryItem) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon || 'ForkKnife',
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = async (id: string | number) => {
    try {
      setIsDetailModalOpen(true);
      setDetailLoading(true);
      const data = await getCategoryByIdApi(id);
      setDetailCategory(data);
    } catch (err: any) {
      Toast.fire({
        icon: 'error',
        title: err.response?.data?.message || 'Gagal memuat detail kategori',
      });
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
      const payload: CategoryPayload = {
        name: formData.name.trim(),
        icon: formData.icon?.trim() || undefined,
      };

      if (selectedCategory) {
        await updateCategoryApi(selectedCategory.id, payload);
        Toast.fire({
          icon: 'success',
          title: `Kategori "${payload.name}" berhasil diperbarui`,
        });
      } else {
        await createCategoryApi(payload);
        Toast.fire({
          icon: 'success',
          title: `Kategori "${payload.name}" berhasil ditambahkan`,
        });
      }

      setIsFormModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Terjadi kesalahan saat memproses data.';
      setFormError(msg);
      Toast.fire({ icon: 'error', title: msg });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (category: CategoryItem) => {
    const productCount = category._count?.products || 0;

    if (productCount > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Tidak Bisa Menghapus',
        text: `Kategori "${category.name}" masih terhubung dengan ${productCount} produk menu. Hapus atau pindahkan menu terkait terlebih dahulu.`,
        confirmButtonColor: '#059669',
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Hapus Kategori?',
      text: `Kategori "${category.name}" beserta slug-nya akan dihapus permanen.`,
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
        await deleteCategoryApi(category.id);
        Toast.fire({
          icon: 'success',
          title: `Kategori "${category.name}" telah dihapus`,
        });
        fetchCategories();
      } catch (err: any) {
        Toast.fire({
          icon: 'error',
          title: err.response?.data?.message || 'Gagal menghapus kategori',
        });
      }
    }
  };

  // Helper render icon
  const renderIconBadge = (iconName?: string | null) => {
    switch (iconName) {
      case 'Coffee':
        return <Coffee size={18} weight="bold" className="text-amber-600" />;
      case 'Pizza':
        return <Pizza size={18} weight="bold" className="text-orange-600" />;
      case 'Hamburger':
        return <Hamburger size={18} weight="bold" className="text-yellow-600" />;
      case 'BowlFood':
        return <BowlFood size={18} weight="bold" className="text-rose-600" />;
      case 'Cookie':
        return <Cookie size={18} weight="bold" className="text-amber-700" />;
      case 'BeerBottle':
        return <BeerBottle size={18} weight="bold" className="text-blue-600" />;
      case 'Flame':
        return <Flame size={18} weight="bold" className="text-red-500" />;
      default:
        return <ForkKnife size={18} weight="bold" className="text-emerald-600" />;
    }
  };

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <TopBar
        title="Kategori Menu"
        subtitle="Manajemen klasifikasi hidangan, minuman, dan slug otomatis."
        onOpenMobileSidebar={openMobileSidebar}
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 md:px-4 py-2 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer"
          >
            <PlusCircle size={18} weight="bold" />
            <span className="hidden sm:inline">Tambah Kategori</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Ringkasan Kartu Metrik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Kategori</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{categories.length} Klasifikasi</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
              <Tag size={28} weight="bold" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Menu Makanan & Minuman</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                {categories.reduce((acc, curr) => acc + (curr._count?.products || 0), 0)} Item
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl">
              <ForkKnife size={28} weight="bold" />
            </div>
          </div>
        </div>

        {/* Tabel Data Kategori */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative w-full sm:w-72">
              <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau slug kategori..."
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <span className="text-xs text-slate-500">
              Total <b>{filteredCategories.length}</b> kategori
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">ID</th>
                  <th className="py-3.5 px-6">Icon</th>
                  <th className="py-3.5 px-6">Nama Kategori</th>
                  <th className="py-3.5 px-6">Slug (URL Backend)</th>
                  <th className="py-3.5 px-6 text-center">Jumlah Menu</th>
                  <th className="py-3.5 px-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Memuat data kategori...
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Tidak ada kategori yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">
                        {item.id.toString()}
                      </td>
                      <td className="py-4 px-6">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          {renderIconBadge(item.icon)}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item.id)}
                          className="hover:text-emerald-600 transition cursor-pointer text-left"
                        >
                          {item.name}
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[11px]">
                          {item.slug}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
                        >
                          <ForkKnife size={13} />
                          {item._count?.products ?? 0} Menu
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item.id)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                            title="Lihat Daftar Menu"
                          >
                            <Eye size={16} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Edit Kategori"
                          >
                            <PencilSimple size={16} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Hapus Kategori"
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

      {/* ================= MODAL TAMBAH / EDIT KATEGORI ================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-extrabold text-slate-900">
                {selectedCategory ? 'Edit Kategori Menu' : 'Tambah Kategori Baru'}
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
                <label className="block text-slate-700 mb-1">Nama Kategori</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Makanan Utama, Minuman Dingin, Snack..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-normal"
                />
                <p className="text-[11px] text-slate-400 mt-1 font-normal">
                  Slug URL akan dibuat otomatis oleh backend.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 mb-2">Pilih Icon Representatif</label>
                <div className="grid grid-cols-4 gap-2">
                  {ICON_OPTIONS.map((iconKey) => {
                    const isSelected = formData.icon === iconKey;
                    return (
                      <button
                        type="button"
                        key={iconKey}
                        onClick={() => setFormData({ ...formData, icon: iconKey })}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        {renderIconBadge(iconKey)}
                        <span className="text-[10px] font-medium">{iconKey}</span>
                      </button>
                    );
                  })}
                </div>
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
                  {submitLoading ? 'Menyimpan...' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL LIHAT DAFTAR PRODUK ================= */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                  {renderIconBadge(detailCategory?.icon)}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Menu di Kategori: {detailCategory?.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Slug: <code className="font-mono text-emerald-600 font-bold">/{detailCategory?.slug}</code>
                  </p>
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
              {detailLoading ? (
                <p className="text-center py-6 text-slate-400 text-xs">Memuat daftar menu...</p>
              ) : !detailCategory?.products || detailCategory.products.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Belum ada menu produk aktif di bawah kategori ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {detailCategory.products.map((product) => (
                    <div key={product.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{product.name}</p>
                        <p className="text-slate-400 text-[11px] font-mono">
                          SKU: {product.sku || '-'} &bull; Posisi: {product.kitchen_station || 'dapur_utama'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-emerald-600 font-mono">
                          Rp {Number(product.price).toLocaleString('id-ID')}
                        </span>
                        <p className="text-[10px] text-slate-400">Stok: {product.stock}</p>
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

export default CategoriesPage;