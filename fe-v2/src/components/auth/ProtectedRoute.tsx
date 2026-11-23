import { type FC } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute: FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { token, user } = useAuthStore();

  console.log('ProtectedRoute Check - Token:', !!token, 'User:', user);

  // 1. Jika token belum ada
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. Ekstrak string role secara fleksibel dan uppercase
  const rawRole =
    typeof user?.role === 'object'
      ? (user.role as any)?.code || (user.role as any)?.name
      : user?.role;

  const userRole = String(rawRole || '').trim().toUpperCase();

  // 3. Validasi role jika ada pembatasan
  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    console.warn('Akses ditolak oleh ProtectedRoute! Redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;