'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Eye, EyeOff, Receipt, ArrowLeft, CheckCircle } from 'lucide-react';
import { authService } from '@/services/auth.service';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(token, newPassword);
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'El link es inválido o ha expirado';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-gray-800 text-lg">Facturación</span>
        </div>

        {done ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">¡Contraseña actualizada!</h2>
            <p className="text-sm text-gray-500 mt-2">Serás redirigido al login en unos segundos.</p>
            <Link href="/login" className="mt-4 inline-block text-sm font-medium text-gray-600 hover:text-gray-900">
              Ir al login →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Nueva contraseña</h1>
              <p className="text-sm text-gray-500 mt-1">Ingresá y confirmá tu nueva contraseña</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: 'Nueva contraseña', value: newPassword, setter: setNewPassword, show: showNew, toggle: () => setShowNew(v => !v), id: 'newPwd' },
                { label: 'Confirmar contraseña', value: confirmPassword, setter: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(v => !v), id: 'confirmPwd' },
              ].map(({ label, value, setter, show, toggle, id }) => (
                <div key={id} className="space-y-1.5">
                  <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
                  <div className="relative">
                    <input
                      id={id}
                      type={show ? 'text' : 'password'}
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      className="w-full h-11 px-4 pr-11 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={toggle}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Actualizando...' : 'Establecer contraseña'}
              </button>
            </form>

            <div className="mt-5 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver al login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
