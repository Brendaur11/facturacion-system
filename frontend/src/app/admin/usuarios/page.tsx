'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, ShieldCheck, Shield, User as UserIcon, Eye, EyeOff, Building2, ChevronRight } from 'lucide-react';
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

const MAX_VISIBLE = 4;
const emptyForm: CreateUserPayload = { nombre: '', email: '', password: '', rol: 'USER', empresaId: '' };

type UserWithoutPassword = Omit<User, 'password'>;

// ── Row compartido ─────────────────────────────────────────────────────────────
function UserRow({
  u,
  canAct,
  onEdit,
  onDelete,
}: {
  u: UserWithoutPassword;
  canAct: boolean;
  onEdit: (u: UserWithoutPassword) => void;
  onDelete: (u: UserWithoutPassword) => void;
}) {
  const cfg = ROL_CONFIG[u.rol];
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 px-4 hover:bg-gray-50 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{u.nombre}</p>
        <p className="text-xs text-gray-400 truncate">{u.email}</p>
      </div>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
        <cfg.Icon className="h-3.5 w-3.5" />{cfg.label}
      </span>
      {canAct && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onEdit(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Card por empresa (solo SUPERADMIN) ─────────────────────────────────────────
function EmpresaCard({
  empresa,
  users,
  onEdit,
  onDelete,
  onVerTodos,
}: {
  empresa: Empresa | null;
  users: UserWithoutPassword[];
  onEdit: (u: UserWithoutPassword) => void;
  onDelete: (u: UserWithoutPassword) => void;
  onVerTodos: (empresa: Empresa | null, users: UserWithoutPassword[]) => void;
}) {
  const visible = users.slice(0, MAX_VISIBLE);
  const remaining = users.length - MAX_VISIBLE;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-gray-800 truncate">
            {empresa?.nombre ?? <span className="italic text-gray-400">Sin empresa</span>}
          </p>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">
          {users.length} usuario{users.length !== 1 ? 's' : ''}
        </span>
      </div>

      {users.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">Sin usuarios</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {visible.map((u) => (
            <UserRow
              key={u.id}
              u={u}
              canAct={u.rol !== 'SUPERADMIN'}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {remaining > 0 && (
            <button
              onClick={() => onVerTodos(empresa, users)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              Ver todos ({users.length}) <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UserWithoutPassword[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUser = authService.getStoredUser();
  const isSuperAdmin = currentUser?.rol === 'SUPERADMIN';
  const canEdit = isSuperAdmin || currentUser?.rol === 'ADMIN';

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserWithoutPassword | null>(null);
  const [form, setForm] = useState<CreateUserPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<UserWithoutPassword | null>(null);
  const [deleting, setDeleting] = useState(false);

  // "Ver todos" modal
  const [verTodosEmpresa, setVerTodosEmpresa] = useState<Empresa | null | undefined>(undefined);
  const [verTodosUsers, setVerTodosUsers] = useState<UserWithoutPassword[]>([]);

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

  function openCreate() { setEditing(null); setForm(emptyForm); setShowPassword(false); setDialogOpen(true); }
  function openEdit(u: UserWithoutPassword) {
    setEditing(u);
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, empresaId: u.empresaId ?? '' });
    setShowPassword(false);
    setDialogOpen(true);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleSave() {
    if (!form.nombre.trim() || !form.email.trim()) { toast.error('Nombre y email son obligatorios'); return; }
    if (!emailRegex.test(form.email)) { toast.error('El email no tiene un formato válido'); return; }
    if (!editing && !form.password) { toast.error('La contraseña es obligatoria'); return; }
    setSaving(true);
    try {
      if (editing) {
        await adminService.updateUsuario(editing.id, {
          nombre: form.nombre,
          email: form.email,
          rol: form.rol,
          empresaId: form.empresaId || undefined,
          ...(form.password ? { password: form.password } : {}),
        });
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

  // Agrupar usuarios por empresa (solo para SUPERADMIN)
  const empresaMap = Object.fromEntries(empresas.map((e) => [e.id, e]));
  const grouped = isSuperAdmin
    ? [
        ...empresas.map((e) => ({ empresa: e, users: usuarios.filter((u) => u.empresaId === e.id) })),
        ...(usuarios.some((u) => !u.empresaId)
          ? [{ empresa: null, users: usuarios.filter((u) => !u.empresaId) }]
          : []),
      ]
    : [];

  const totalUsuarios = isSuperAdmin ? usuarios.length : usuarios.length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {totalUsuarios} usuario{totalUsuarios !== 1 ? 's' : ''} registrado{totalUsuarios !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nuevo usuario
          </Button>
        </div>

        {/* Vista SUPERADMIN — agrupada por empresa */}
        {isSuperAdmin && (
          loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="h-5 bg-gray-100 rounded animate-pulse w-1/2" />
                  {Array.from({ length: 3 }).map((_, j) => <div key={j} className="h-8 bg-gray-100 rounded animate-pulse" />)}
                </div>
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-400">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {grouped.map(({ empresa, users }) => (
                <EmpresaCard
                  key={empresa?.id ?? '__sin_empresa__'}
                  empresa={empresa}
                  users={users}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onVerTodos={(emp, u) => { setVerTodosEmpresa(emp); setVerTodosUsers(u); }}
                />
              ))}
            </div>
          )
        )}

        {/* Vista ADMIN — lista plana */}
        {!isSuperAdmin && (
          <>
            {/* Mobile: cards */}
            <div className="md:hidden space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="h-5 bg-gray-100 rounded animate-pulse mb-3" />
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                  </div>
                ))
              ) : usuarios.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-400">No hay usuarios registrados</p>
                </div>
              ) : usuarios.map((u) => {
                const cfg = ROL_CONFIG[u.rol];
                return (
                  <div key={u.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{u.nombre}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                      {canEdit && !(u.rol === 'SUPERADMIN' && !isSuperAdmin) && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        <cfg.Icon className="h-3 w-3" />{cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/70">
                    {['Usuario', 'Rol', ''].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}><td colSpan={3} className="px-5 py-4"><div className="h-8 bg-gray-100 rounded animate-pulse" /></td></tr>
                    ))
                  ) : usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-16 text-center">
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
                            <cfg.Icon className="h-3.5 w-3.5" />{cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {canEdit && !(u.rol === 'SUPERADMIN' && !isSuperAdmin) && (
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
          </>
        )}
      </div>

      {/* ── Create / Edit dialog ───────────────────────────────────────────── */}
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
            {(!editing || canEdit) && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">
                  Contraseña {editing ? <span className="text-gray-400 font-normal">(dejá vacío para no cambiar)</span> : '*'}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="bg-gray-50 focus:bg-white pr-10"
                    placeholder={editing ? '••••••••' : ''}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Rol</Label>
              <select
                value={form.rol}
                onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value as CreateUserPayload['rol'] }))}
                className="w-full h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USER">Usuario</option>
                <option value="ADMIN">Admin</option>
                {isSuperAdmin && <option value="SUPERADMIN">Superadmin</option>}
              </select>
            </div>
            {isSuperAdmin && (
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
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete dialog ──────────────────────────────────────────────────── */}
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

      {/* ── "Ver todos" modal ──────────────────────────────────────────────── */}
      <Dialog open={verTodosEmpresa !== undefined} onOpenChange={(open) => { if (!open) setVerTodosEmpresa(undefined); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {verTodosEmpresa?.nombre ?? 'Sin empresa'} — {verTodosUsers.length} usuarios
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="p-0">
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {verTodosUsers.map((u) => (
                <UserRow
                  key={u.id}
                  u={u}
                  canAct={u.rol !== 'SUPERADMIN'}
                  onEdit={(u) => { setVerTodosEmpresa(undefined); openEdit(u); }}
                  onDelete={(u) => { setVerTodosEmpresa(undefined); setDeleteTarget(u); }}
                />
              ))}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerTodosEmpresa(undefined)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
