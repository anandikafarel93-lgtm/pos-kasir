import {
  useState,
  useEffect,
  type FC,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { useOutletContext } from "react-router-dom";
import type { AdminLayoutContextType } from "../../components/layout/AdminLayout";
import { TopBar } from "../../components/layout/TopBar";
import Swal from "sweetalert2";
import {
  ForkKnife,
  PlusCircle,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  X,
  UploadSimple,
  CheckCircle,
  XCircle,
  Tag,
  CookingPot,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import {
  getProductsApi,
  createProductApi,
  updateProductApi,
  deleteProductApi,
} from "../../api/productApi";
import { getCategoriesApi } from "../../api/categoryApi";
import type { ProductItem, ProductPayload } from "../../types/product";
import type { CategoryItem } from "../../types/category";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

export const ProductsPage: FC = () => {
  const { openMobileSidebar } = useOutletContext<AdminLayoutContextType>();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("");
  const [selectedStationFilter, setSelectedStationFilter] =
    useState<string>("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(
    null,
  );
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");

  // Form State
  const [formData, setFormData] = useState<ProductPayload>({
    category_id: "",
    sku: "",
    name: "",
    points: 0,
    description: "",
    cost_price: 0,
    price: 0,
    stock: 0,
    kitchen_station: "dapur_utama",
    is_active: true,
    image_file: null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const data = await getCategoriesApi();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Gagal mengambil kategori:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getProductsApi({
        category_id: selectedCategoryFilter || undefined,
        kitchen_station: selectedStationFilter || undefined,
      });
      setProducts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Gagal mengambil produk:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategoryFilter, selectedStationFilter]);

  const handleOpenAdd = () => {
    setSelectedProduct(null);
    setFormData({
      category_id: categories.length > 0 ? categories[0].id : "",
      sku: "",
      name: "",
      points: 0,
      description: "",
      cost_price: 0,
      price: 0,
      stock: 50,
      kitchen_station: "dapur_utama",
      is_active: true,
      image_file: null,
    });
    setImagePreview(null);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: ProductItem) => {
    setSelectedProduct(product);
    setFormData({
      category_id: product.category_id,
      sku: product.sku || "",
      name: product.name,
      points: product.points || 0,
      description: product.description || "",
      cost_price: product.cost_price || 0,
      price: product.price,
      stock: product.stock,
      kitchen_station: product.kitchen_station || "dapur_utama",
      is_active: Boolean(product.is_active),
      image_file: null,
    });
    setImagePreview(
      product.image_url ? `http://127.0.0.1:5000${product.image_url}` : null,
    );
    setFormError("");
    setIsModalOpen(true);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData((prev) => ({ ...prev, image_file: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.category_id) {
      setFormError("Silakan pilih kategori menu");
      return;
    }

    setSubmitLoading(true);
    try {
      if (selectedProduct) {
        await updateProductApi(selectedProduct.id, formData);
        Toast.fire({
          icon: "success",
          title: `Produk "${formData.name}" berhasil diperbarui`,
        });
      } else {
        await createProductApi(formData);
        Toast.fire({
          icon: "success",
          title: `Produk "${formData.name}" berhasil ditambahkan`,
        });
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Gagal menyimpan produk menu";
      setFormError(msg);
      Toast.fire({ icon: "error", title: msg });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (product: ProductItem) => {
    const result = await Swal.fire({
      title: "Hapus Produk Menu?",
      text: `Menu "${product.name}" akan dihapus permanen dari katalog.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        await deleteProductApi(product.id);
        Toast.fire({
          icon: "success",
          title: `Menu "${product.name}" berhasil dihapus`,
        });
        fetchProducts();
      } catch (err: any) {
        Swal.fire({
          icon: "warning",
          title: "Tidak Bisa Menghapus",
          text:
            err.response?.data?.message ||
            "Produk memiliki riwayat transaksi dan tidak dapat dihapus.",
          confirmButtonColor: "#059669",
        });
      }
    }
  };

  const filteredProducts = (Array.isArray(products) ? products : []).filter(
    (p) => {
      const nameMatch = p.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const skuMatch = p.sku
        ? p.sku.toLowerCase().includes(searchQuery.toLowerCase())
        : false;
      return nameMatch || skuMatch;
    },
  );

  return (
    <>
      <TopBar
        title="Daftar Produk Menu"
        subtitle="Manajemen harga, resep, stasiun dapur, stok, dan foto hidangan."
        onOpenMobileSidebar={openMobileSidebar}
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 md:px-4 py-2 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer"
          >
            <PlusCircle size={18} weight="bold" />
            <span className="hidden sm:inline">Tambah Menu</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Metrik Ringkasan */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Total Menu</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">
              {products.length} Menu
            </h3>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs text-emerald-600 font-medium">
              Menu Aktif Dijual
            </p>
            <h3 className="text-xl font-extrabold text-emerald-600 mt-1">
              {products.filter((p) => p.is_active).length} Menu
            </h3>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs text-rose-600 font-medium">
              Stok Menipis (&lt; 10)
            </p>
            <h3 className="text-xl font-extrabold text-rose-600 mt-1">
              {products.filter((p) => Number(p.stock) < 10).length} Menu
            </h3>
          </div>
        </div>

        {/* Tabel Data Produk */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative w-full sm:w-64">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau SKU..."
                  className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Filter Kategori */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">Semua Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Filter Stasiun Dapur */}
              <select
                value={selectedStationFilter}
                onChange={(e) => setSelectedStationFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">Semua Stasiun</option>
                <option value="dapur_utama">Dapur Utama</option>
                <option value="bar_minuman">Bar Minuman</option>
              </select>
            </div>

            <span className="text-xs text-slate-500">
              Total <b>{filteredProducts.length}</b> menu terdaftar
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Foto</th>
                  <th className="py-3.5 px-6">Nama & SKU</th>
                  <th className="py-3.5 px-6">point</th>
                  <th className="py-3.5 px-6">Kategori</th>
                  <th className="py-3.5 px-6">Stasiun</th>
                  <th className="py-3.5 px-6">Harga Jual</th>
                  <th className="py-3.5 px-6">Stok</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-slate-400 font-medium"
                    >
                      Memuat daftar produk menu...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-slate-400 font-medium"
                    >
                      Tidak ada produk menu yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-6">
                        {p.image_url ? (
                          <img
                            src={`http://127.0.0.1:5000${p.image_url}`}
                            alt={p.name}
                            className="w-11 h-11 object-cover rounded-xl border border-slate-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://placehold.co/100x100?text=Food";
                            }}
                          />
                        ) : (
                          <div className="w-11 h-11 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center">
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        <p className="font-extrabold text-slate-900">
                          {p.name}
                        </p>
                        <span className="font-mono text-[10px] text-slate-400">
                          SKU: {p.sku || "-"}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span>{p.points}</span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          <Tag size={12} />
                          {p.categories?.name || "Uncategorized"}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-medium capitalize">
                          <CookingPot size={14} className="text-slate-400" />
                          {p.kitchen_station
                            ? p.kitchen_station.replace("_", " ")
                            : "Dapur Utama"}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-mono font-extrabold text-emerald-600">
                        Rp {Number(p.price).toLocaleString("id-ID")}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`font-semibold ${
                            Number(p.stock) < 10
                              ? "text-rose-600 font-bold"
                              : "text-slate-700"
                          }`}
                        >
                          {p.stock} porsi
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {p.is_active ? (
                            <>
                              <CheckCircle size={11} weight="bold" /> Aktif
                            </>
                          ) : (
                            <>
                              <XCircle size={11} weight="bold" /> Nonaktif
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Edit Menu"
                          >
                            <PencilSimple size={16} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Hapus Menu"
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

      {/* ================= MODAL TAMBAH / EDIT PRODUK ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h3 className="text-base font-extrabold text-slate-900">
                {selectedProduct ? "Edit Menu Hidangan" : "Tambah Menu Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-4 text-xs font-semibold"
            >
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
                  {formError}
                </div>
              )}

              {/* Upload Foto & Preview */}
              <div>
                <label className="block text-slate-700 mb-2">
                  Foto Hidangan
                </label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-20 h-20 rounded-xl object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 gap-1">
                      <ImageIcon size={24} />
                      <span className="text-[10px]">No Photo</span>
                    </div>
                  )}
                  <div>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition">
                      <UploadSimple size={16} weight="bold" />
                      <span>{imagePreview ? "Ganti Foto" : "Pilih Foto"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1 font-normal">
                      Format: JPG, PNG, WEBP (Maks 2MB)
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 mb-1">Nama Menu</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Nasi Goreng Spesial"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-normal"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">
                    Kode SKU / Barcode
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: FOOD-001"
                    value={formData.sku || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 mb-1">
                    Kategori Menu
                  </label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData({ ...formData, category_id: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id.toString()}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">
                    Stasiun Dapur
                  </label>
                  <select
                    value={formData.kitchen_station}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kitchen_station: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="dapur_utama">Dapur Utama (Makanan)</option>
                    <option value="bar_minuman">Bar Minuman</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 mb-1">
                    Harga Modal (HPP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.cost_price || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, cost_price: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-normal"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">
                    Harga Jual (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-bold text-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">
                    Stok Harian
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-normal"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">
                    Poin Member
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.points || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        points: Number(e.target.value),
                      })
                    }
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-bold text-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">
                  Deskripsi / Catatan Menu
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan bahan, rasa pedas/manis, dsb."
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-normal"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-slate-700 font-bold">
                    Tampilkan produk ini di daftar kasir & menu aktif
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
                  {submitLoading ? "Menyimpan..." : "Simpan Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductsPage;
