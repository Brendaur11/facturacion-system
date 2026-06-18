'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, ShieldCheck, Shield, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { adminService, CreateUserPayload } from '@/services/admin.service';
import { authService } from '@/services/auth.service';
import { Empresa, User } from '@/types';

const ROL_CONFIG = {
  SUPERADMIN: { label: 'Superadmin', Icon: ShieldCheck, bg: 'bg-amber-50',  color: 'text-amber-700'  },
  ADMIN:      { label: 'Admin',      Icon: Shield,      bg: 'bg-blue-50',   color: 'text-blue-700'   },
  USER:       { label: 'Usuario',    Icon: UserIcon,    bg: 'bg-gray-100',  color: 'text-gray-600'   },
} as const;

const emptyForm: CreateUserPayload = { nombre: '', email: '', password: '', rol: 'ADMIN', empresaId: '' };

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Omit<User, 'password'>[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = authService.getStoredUser();
  const canEdit = currentUser?.rol === 'SUPERADMIN';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Omit<User, 'password'> | null>(null);
  const [form, setForm] = useState<CreateUserPayload>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Omit<User, 'password'> | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [u, e] = await Promise.all([adminService.getUsuarios(), adminService.getEmpresas()]);
      setUsuarios(u);
      setEmpresas(e);
    } catch { toast.error('Error al cargar los usuarios'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(u: Omit<User, 'password'>) {
    setEditing(u);
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, empresaId: u.empresaId ?? '' });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.nombre.trim() || !form.email.trim()) { toast.error('Nombre y email son obligatorios'); return; }
    if (!editing && !form.password) { toast.error('La contraseña es obligatoria'); return; }
    setSaving(true);
    try {
      if (editing) {
        await adminService.updateUsuario(editing.id, { nombre: form.nombre, email: form.email, rol: form.rol, empresaId: form.empresaId || undefined });
        toast.success('Usuario actualizado');
      } else {
        await adminService.createUsuario({ ...form, empresaId: form.empresaId || undefined });
        toast.success('Usuario creado');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al guardar el usuario');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.removeUsuario(deleteTarget.id);
      toast.success('Usuario eliminado');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Error al eliminar el usuario'); }
    finally { setDeleting(false); }
  }

  const empresaMap = Object.fromEntries(empresas.map((e) => [e.id, e.nombre]));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
            <p className="text-sm text-gray-500 mt-0.5">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nuevo usuario
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/70">
                {['Usuario', 'Rol', 'Empresa', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={4} className="px-5 py-4"><div className="h-8 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center">
                    <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-400">No hay usuarios registrados</p>
                  </td>
                </tr>
              ) : usuarios.map((u) => {
                const cfg = ROL_CONFIG[u.rol];
                return (
                  <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{u.nombre}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        <cfg.Icon className="h-3 w-3" />{cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {u.empresaId ? (empresaMap[u.empresaId] ?? <span className="text-gray-400 italic text-xs">ID sin empresa</span>) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      {canEdit && (
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} className="bg-gray-50 focus:bg-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="bg-gray-50 focus:bg-white" />
            </div>
            {!editing && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Contraseña *</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} className="bg-gray-50 focus:bg-white" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Rol</Label>
              <select
                value={form.rol}
                onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value as CreateUserPayload['rol'] }))}
                className="w-full h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ADMIN">Admin</option>
                <option value="USER">Usuario</option>
                <option value="SUPERADMIN">Superadmin</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Empresa</Label>
              <select
                value={form.empresaId ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, empresaId: e.target.value }))}
                className="w-full h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Sin empresa —</option>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar usuario</DialogTitle></DialogHeader>
          <DialogBody>
            <p className="text-sm text-gray-600">
              ¿Estás seguro que querés eliminar a <span className="font-semibold text-gray-900">{deleteTarget?.nombre}</span>?
              Esta acción no se puede deshacer.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? 'Eliminando...' : 'Eliminar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
