'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { adminService, CreateEmpresaPayload } from '@/services/admin.service';
import { authService } from '@/services/auth.service';
import { Empresa, User } from '@/types';

const emptyForm: CreateEmpresaPayload = { nombre: '', cuit: '', direccion: '', telefono: '', email: '' };

const FIELDS = [
  { key: 'nombre',    label: 'Nombre *',  type: 'text'  },
  { key: 'cuit',      label: 'CUIT',      type: 'text'  },
  { key: 'email',     label: 'Email',     type: 'email' },
  { key: 'telefono',  label: 'Teléfono',  type: 'text'  },
  { key: 'direccion', label: 'Dirección', type: 'text'  },
] as const;

export default function AdminEmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuarios, setUsuarios] = useState<Omit<User, 'password'>[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = authService.getStoredUser();
  const canEdit = currentUser?.rol === 'SUPERADMIN';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [form, setForm] = useState<CreateEmpresaPayload>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Empresa | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [e, u] = await Promise.all([adminService.getEmpresas(), adminService.getUsuarios()]);
      setEmpresas(e);
      setUsuarios(u);
    } catch { toast.error('Error al cargar las empresas'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(e: Empresa) {
    setEditing(e);
    setForm({ nombre: e.nombre, cuit: e.cuit, email: e.email, telefono: e.telefono, direccion: e.direccion });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      if (editing) { await adminService.updateEmpresa(editing.id, form); toast.success('Empresa actualizada'); }
      else { await adminService.createEmpresa(form); toast.success('Empresa creada'); }
      setDialogOpen(false);
      load();
    } catch { toast.error('Error al guardar la empresa'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.removeEmpresa(deleteTarget.id);
      toast.success('Empresa eliminada');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Error al eliminar la empresa'); }
    finally { setDeleting(false); }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
            <p className="text-sm text-gray-500 mt-0.5">{empresas.length} empresa{empresas.length !== 1 ? 's' : ''} registrada{empresas.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nueva empresa
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/70">
                {['Empresa', 'CUIT', 'Contacto', 'Usuarios', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-8 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : empresas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Building2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-400">No hay empresas registradas</p>
                  </td>
                </tr>
              ) : empresas.map((e) => {
                const count = usuarios.filter((u) => u.empresaId === e.id).length;
                return (
                  <tr key={e.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{e.nombre}</p>
                          <p className="text-xs text-gray-400">{e.direccion || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-600">{e.cuit || '—'}</td>
                    <td className="px-5 py-4">
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <p>{e.email || '—'}</p>
                        <p className="text-gray-400">{e.telefono || ''}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
                        {count} usuario{count !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {canEdit && (
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(e)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors">
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

      {/* Edit / Create */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar empresa' : 'Nueva empresa'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {FIELDS.map(({ key, label, type }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">{label}</Label>
                <Input type={type} value={form[key] ?? ''} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className="bg-gray-50 focus:bg-white" />
              </div>
            ))}
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
          <DialogHeader><DialogTitle>Eliminar empresa</DialogTitle></DialogHeader>
          <DialogBody>
            <p className="text-sm text-gray-600">
              ¿Estás seguro que querés eliminar <span className="font-semibold text-gray-900">{deleteTarget?.nombre}</span>?
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
