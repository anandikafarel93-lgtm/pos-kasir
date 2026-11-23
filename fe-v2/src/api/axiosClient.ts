import axios from 'axios';

// Konfigurasi instance Axios
const axiosClient = axios.create({
  // Menggunakan IPv4 127.0.0.1 agar stabil di Windows maupun macOS
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Timeout 10 detik
});

// Request Interceptor: Otomatis cantumkan Authorization Bearer Token jika ada di localStorage
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Tangani respon atau redirect otomatis saat 401 Unauthorized
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Jika token expired atau tidak valid, bersihkan sesi dan arahkan kembali ke login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;