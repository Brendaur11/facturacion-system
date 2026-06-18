'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Camera, KeyRound, User as UserIcon, Mail, Shield, Building2 } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { empresaService } from '@/services/empresa.service';
import { AppLayout } from '@/components/layout/app-layout';
import { Empresa, User } from '@/types';

function Avatar({ user, onUpload }: { user: User; onUpload: (file: File) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  }

  return (
    <div
      className="relative cursor-pointer group w-24 h-24"
      onClick={() => fileRef.current?.click()}
      title="Cambiar foto"
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.nombre}
          className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-md"
        />
      ) : (
        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-3xl font-bold ring-4 ring-white shadow-md">
          {user.nombre?.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Camera className="h-6 w-6 text-white" />
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleChange} />
    </div>
  );
}

const rolLabel: Record<string, string> = {
  SUPERADMIN: 'Superadmin',
  ADMIN: 'Administrador',
  USER: 'Usuario',
};

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [nombre, setNombre] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    const stored = authService.getStoredUser();
    if (!stored) { router.push('/login'); return; }
    setUser(stored);
    setNombre(stored.nombre);
    if (stored.empresaId) {
      empresaService.get().then(setEmpresa).catch(() => {});
    }
  }, [router]);

  async function handleAvatarUpload(file: File) {
    try {
      const { avatarUrl } = await authService.uploadAvatar(file);
      const updated = { ...user!, avatarUrl };
      setUser(updated);
      authService.saveUser(updated);
      toast.success('Foto actualizada');
    } catch {
      toast.error('No se pudo subir la imagen');
    }
  }

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSavingInfo(true);
    try {
      const updated = await authService.updateProfile({ nombre: nombre.trim() });
      const merged = { ...user!, ...updated };
      setUser(merged);
      authService.saveUser(merged);
      toast.success('Nombre actualizado');
    } catch {
      toast.error('No se pudo actualizar el perfil');
    } finally {
      setSavingInfo(false);
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas nuevas no coinciden');
      return;
    }
    setSavingPass(true);
    try {
      await authService.updateProfile({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Contraseña actualizada');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'No se pudo cambiar la contraseña';
      toast.error(msg);
    } finally {
      setSavingPass(false);
    }
  }

  if (!user) return null;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-sm text-gray-500 mt-1">Administrá tu información personal y seguridad</p>
        </div>

        {/* Header de perfil */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-6">
          <Avatar user={user} onUpload={handleAvatarUpload} />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user.nombre}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              <Shield className="h-3 w-3" />
              {rolLabel[user.rol] ?? user.rol}
            </span>
          </div>
        </div>

        {/* Información personal */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-gray-400" />
            Información personal
          </h3>
          <form onSubmit={handleSaveInfo} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">El email no se puede modificar</p>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingInfo || nombre.trim() === user.nombre}
                className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingInfo ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>

        {/* Empresa vinculada */}
        {empresa && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              Empresa vinculada
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Nombre</span>
                <span className="text-sm font-medium text-gray-900">{empresa.nombre}</span>
              </div>
              {empresa.cuit && (
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">CUIT</span>
                  <span className="text-sm font-medium text-gray-900">{empresa.cuit}</span>
                </div>
              )}
              {empresa.email && (
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">Email</span>
                  <span className="text-sm font-medium text-gray-900">{empresa.email}</span>
                </div>
              )}
              {empresa.telefono && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">Teléfono</span>
                  <span className="text-sm font-medium text-gray-900">{empresa.telefono}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cambiar contraseña */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-gray-400" />
            Cambiar contraseña
          </h3>
          <form onSubmit={handleSavePassword} className="space-y-4">
            {[
              { label: 'Contraseña actual', value: currentPassword, setter: setCurrentPassword, id: 'currentPwd' },
              { label: 'Nueva contraseña', value: newPassword, setter: setNewPassword, id: 'newPwd' },
              { label: 'Confirmar nueva contraseña', value: confirmPassword, setter: setConfirmPassword, id: 'confirmPwd' },
            ].map(({ label, value, setter, id }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                <input
                  id={id}
                  type="password"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100 transition-all"
                />
              </div>
            ))}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPass || !currentPassword || !newPassword || !confirmPassword}
                className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPass ? 'Actualizando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
