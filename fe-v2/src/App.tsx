import { BrowserRouter, Routes, Route, Navigate, useOutletContext } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout, type AdminLayoutContextType } from './components/layout/AdminLayout';
import { TopBar } from './components/layout/TopBar';
import { LoginPage } from './pages/auth/LoginPage';
import RolePage  from './pages/admin/RolesPage';
import CategoriesPage from './pages/admin/CategoriesPage';
import TablePage from './pages/admin/TablesPage';
import PaymentMethodsPage from './pages/admin/PaymentMethodsPage';
import ProductsPage from './pages/admin/ProductsPage';
import OrdersPage from './pages/admin/OrdersPage';
import PaymentsPage from './pages/admin/PaymentsPage';
import UsersPage from './pages/admin/UsersPage';
import WaiterOrderPage from './pages/waiter/WaiterOrderPage';
import KitchenPage from './pages/kitchen/KitchenPage';
import CashierPage from './pages/cashier/CashierPage';
import CustomerPage from './pages/admin/CustomerPage';


const GenericPage = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const { openMobileSidebar } = useOutletContext<AdminLayoutContextType>();

  return (
    <>
      <TopBar title={title} subtitle={subtitle} onOpenMobileSidebar={openMobileSidebar} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-lg font-bold text-slate-800">Konten Halaman: {title}</h2>
          <p className="text-slate-500 text-xs md:text-sm mt-2">
            Halaman ini siap kita isi komponen CRUD.
          </p>
        </div>
      </main>
    </>
  );
};

export default function App() {
  return (
    <>
    <BrowserRouter>
      <Routes>
        {/* Rute Publik */}
        <Route path="/login" element={<LoginPage />} />

        {/* Redirect Root ke Menu Admin */}
        <Route path="/" element={<Navigate to="/admin/menu" replace />} />

        {/* Rute Dilindungi Login */}
        <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="menu" replace />} />
            <Route path="dashboard" element={<GenericPage title="Dashboard" subtitle="Ringkasan penjualan dan metrik resto." />} />
            <Route path="roles" element={<RolePage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="tables" element={<TablePage/>} />
            <Route path="payment-methods" element={<PaymentMethodsPage />} />
            <Route path="menu" element={<ProductsPage/>} />
            <Route path="orders" element={<OrdersPage/>} />
            <Route path="payment" element={<PaymentsPage/>} />
            <Route path="users" element={<UsersPage/>} />
            <Route path="customer" element={<CustomerPage/>} />

            {/* <Route path="settings" element={<GenericPage title="Pengaturan Resto" subtitle="Konfigurasi umum restoran." />} /> */}
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['PELAYAN']} />}>
          <Route path="/waiter/order" element={<WaiterOrderPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['DAPUR']} />}>
          <Route path="/kitchen/dapur" element={<KitchenPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['KASIR']} />}>
          <Route path="/cashier/kasir" element={<CashierPage />} />
        </Route>


        {/* Fallback 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
    </>
  );
}