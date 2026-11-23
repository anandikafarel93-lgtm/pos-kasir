import { useState, type FC, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Storefront, LockKey, User } from '@phosphor-icons/react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { loginApi, googleLoginApi } from '../../api/authApi';
import { useAuthStore } from '../../stores/authStore';
import Swal from 'sweetalert2';

export const LoginPage: FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fungsi terpusat untuk menyimpan token & mengarahkan halaman sesuai role staf
  const handleAuthSuccess = (data: any) => {
    const user = data.user;

    const rawRole =
      typeof user?.role === 'object'
        ? (user.role as any)?.code || (user.role as any)?.name
        : user?.role;

    const roleCode = String(rawRole || '').trim().toUpperCase();

    setAuth(data.token, data.user);

    switch (roleCode) {
      case 'SUPERADMIN':
        navigate('/admin/roles', { replace: true });
        break;
      case 'PELAYAN':
        navigate('/waiter/order', { replace: true });
        break;
      case 'KASIR':
        navigate('/cashier/kasir', { replace: true });
        break;
      case 'DAPUR':
        navigate('/kitchen/dapur', { replace: true });
        break;
      default:
        Swal.fire({
          icon: 'error',
          title: 'Akses Dibatasi',
          text: `Role "${roleCode || 'Tidak Terdefinisi'}" belum memiliki akses aplikasi.`,
          confirmButtonColor: '#e11d48',
        });
        break;
    }
  };

  // 1. Login Form Biasa
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const data = await loginApi({
        username: username.trim(),
        password,
      });
      handleAuthSuccess(data);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Login gagal. Periksa username dan password Anda.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 2. Login via Google
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setErrorMessage('Kredensial Google tidak ditemukan.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const data = await googleLoginApi(credentialResponse.credential);
      handleAuthSuccess(data);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Email Google belum terdaftar sebagai staf.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        {/* Brand Resto */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl font-bold mb-3 shadow-inner">
            <Storefront weight="bold" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">POS KASIR MINI</h1>
          <p className="text-xs text-slate-400 mt-1">Masuk dengan akun staf atau Superadmin</p>
        </div>

        {/* Notifikasi Error */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold text-center">
            {errorMessage}
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Username atau Email
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username..."
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Kata Sandi (Password)
            </label>
            <div className="relative">
              <LockKey size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password..."
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-3 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition cursor-pointer">
            {loading ? (
              <span>Memproses...</span>
            ) : (
              <>
                <span>Masuk ke Dashboard</span>
              </>
            )}
          </button>
        </form>

        {/* Pemisah & Tombol Login Google */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-[11px] font-semibold text-slate-500 uppercase">or</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setErrorMessage('Popup Login Google ditutup atau gagal.')}
            theme="filled_black"
            shape="pill"
            text="signin_with"
            width="320"
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;