import type { FC } from "react";
import Swal from "sweetalert2";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Storefront,
  ChartPieSlice,
  ForkKnife,
  Tag,
  Armchair,
  Wallet,
  Receipt,
  MoneyIcon,
  UserCheckIcon,
  UsersIcon ,
  SignOut,
  PersonIcon,
  X,
} from "@phosphor-icons/react";
import { useAuthStore } from "../../stores/authStore";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

const handleLogout = () => {
  Swal.fire({
    title: "Keluar dari Sistem?",
    text: "Anda harus masuk kembali untuk mengakses portal admin.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#e11d48", // Warna merah ros
    cancelButtonColor: "#64748b",  // Warna slate abu-abu
    confirmButtonText: "Ya, Keluar!",
    cancelButtonText: "Batal",
    reverseButtons: true, // Letak tombol Batal di sebelah kiri
  }).then((result) => {
    // Diproses hanya jika mengklik "Ya, Keluar!"
    if (result.isConfirmed) {
      logout(); // Reset state login di Zustand
      
      // Pop-up notifikasi sukses singkat
      Swal.fire({
        icon: "success",
        title: "Berhasil Keluar",
        text: "Anda telah keluar dari akun.",
        timer: 1500,
        showConfirmButton: false,
      });

      // Redirect ke halaman login
      navigate("/login", { replace: true });
    }
  });
};

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-xs font-semibold ${
      isActive
        ? "bg-emerald-600 text-white shadow-sm"
        : "text-slate-400 hover:text-white hover:bg-slate-800"
    }`;

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AD";

  return (
    <>
      {/* Backdrop Gelap untuk Mobile */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 md:hidden ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Kontainer Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 h-screen select-none transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Resto */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-bold">
              <Storefront size={24} weight="bold" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm tracking-wide">
                CMS RESTO
              </h2>
              <p className="text-[11px] text-slate-400">Portal Admin Pusat</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Tutup Menu"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Menu Navigasi */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Ringkasan
          </div>
          <NavLink to="/admin/dashboard" onClick={onClose} className={navClass}>
            <ChartPieSlice size={18} weight="bold" />
            <span>Dashboard</span>
          </NavLink>

          <div className="pt-4 px-3 py-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Data Master
          </div>

          <NavLink to="/admin/roles" onClick={onClose} className={navClass}>
            <UsersIcon  size={18} weight="bold" />
            <span>User Role</span>
          </NavLink>

          <NavLink to="/admin/users" onClick={onClose} className={navClass}>
            <UserCheckIcon   size={18} weight="bold" />
            <span>User</span>
          </NavLink>

          <NavLink to="/admin/categories" onClick={onClose} className={navClass}>
            <Tag size={18} weight="bold" />
            <span>Kategori Menu</span>
          </NavLink>

          <NavLink to="/admin/menu" onClick={onClose} className={navClass}>
            <ForkKnife size={18} weight="bold" />
            <span>Kelola Menu</span>
          </NavLink>

          <NavLink to="/admin/tables" onClick={onClose} className={navClass}>
            <Armchair size={18} weight="bold" />
            <span>Data Meja Resto</span>
          </NavLink>

          <NavLink
            to="/admin/payment-methods"
            onClick={onClose}
            className={navClass}
          >
            <Wallet size={18} weight="bold" />
            <span>Metode Pembayaran</span>
          </NavLink>

          <NavLink to="/admin/orders" onClick={onClose} className={navClass}>
            <Receipt size={18} weight="bold" />
            <span>Riwayat Transaksi</span>
          </NavLink>

          <NavLink to="/admin/payment" onClick={onClose} className={navClass}>
            <MoneyIcon size={18} weight="bold" />
            <span>Pembayaran</span>
          </NavLink>

          <NavLink to="/admin/customer" onClick={onClose} className={navClass}>
            <PersonIcon size={18} weight="bold" />
            <span>Pelanggan</span>
          </NavLink>
        </nav>

        {/* Profil User Login & Tombol Logout */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
              {userInitials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white leading-tight truncate">
                {user?.name || "Administrator"}
              </p>
              <p className="text-[10px] text-emerald-400 font-mono font-semibold truncate">
                {user?.role || "SUPERADMIN"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
            title="Keluar"
          >
            <SignOut size={20} weight="bold" />
          </button>
        </div>
      </aside>
    </>
  );
};
