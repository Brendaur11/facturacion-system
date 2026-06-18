import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined') {
      if (error.response?.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        document.cookie = 'token=; path=/; max-age=0';
        window.location.href = '/login';
      }
      if (error.response?.status === 429) {
        import('sonner').then(({ toast }) => {
          toast.error('Demasiados intentos. Esperá unos minutos e intentá de nuevo.');
        });
      }
    }
    return Promise.reject(error);
  }
);

export default api;
