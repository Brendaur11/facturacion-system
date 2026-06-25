'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn, Receipt } from 'lucide-react';
import { authService } from '@/services/auth.service';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { token, user } = await authService.login(email, password);
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(user));
      document.cookie = `token=${token}; path=/`;
      router.push(user.rol === 'SUPERADMIN' || user.rol === 'ADMIN' ? '/admin' : '/dashboard');
    } catch {
      toast.error('Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Panel izquierdo — decorativo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">Facturación</span>
        </div>

        <div>
          <blockquote className="text-white/80 text-xl font-light leading-relaxed">
            &ldquo;Gestioná tus facturas, clientes y productos desde un solo lugar.&rdquo;
          </blockquote>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { label: 'Facturas', desc: 'PDF, XLSX, DOCX, CSV' },
              { label: 'Clientes', desc: 'Gestión completa' },
              { label: 'Dashboard', desc: 'Métricas en tiempo real' },
            ].map(({ label, desc }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-white text-sm font-semibold">{label}</p>
                <p className="text-white/50 text-xs mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-xs">© 2026 Sistema de Facturación</p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo móvil */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-800">Facturación</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Bienvenido</h1>
            <p className="text-gray-500 mt-1 text-sm">Ingresá tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-gray-400 focus:ring-4 focus:ring-gray-100 hover:border-gray-300"
              />
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-11 px-4 pr-11 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-gray-400 focus:ring-4 focus:ring-gray-100 hover:border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <a href="/recuperar-contrasena" className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gray-900 hover:bg-gray-800 active:bg-gray-950 text-white text-sm font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-4 focus-visible:ring-gray-300 mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Ingresando...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Ingresar
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
