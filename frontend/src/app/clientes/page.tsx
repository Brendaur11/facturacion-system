'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Users, Mail, Phone, Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { clientesService } from '@/services/clientes.service';
import { Cliente, ImportResult } from '@/types';

const emptyForm = { nombre: '', email: '', telefono: '', direccion: '', cuitDni: '' };

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const initials = parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase flex-shrink-0">
      {initials}
    </div>
  );
}

function downloadTemplate() {
  const csv = 'nombre,email,telefono,direccion,cuitDni\nJuan Pérez,juan@ejemplo.com,11-1234-5678,Av. Corrientes 123,20-12345678-9\nEmpresa SA,contacto@empresa.com,0800-123-4567,Av. Libertador 500,30-98765432-1';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_clientes.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load(q?: string) {
    setLoading(true);
    try { setClientes(await clientesService.getAll(q)); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(search || undefined), 400);
    return () => clearTimeout(t);
  }, [search]);

  function openCreate() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(c: Cliente) {
    setEditing(c);
    setForm({ nombre: c.nombre, email: c.email, telefono: c.telefono, direccion: c.direccion, cuitDni: c.cuitDni });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) { await clientesService.update(editing.id, form); toast.success('Cliente actualizado'); }
      else { await clientesService.create(form); toast.success('Cliente creado'); }
      setDialogOpen(false);
      load(search || undefined);
    } catch { toast.error('Error al guardar el cliente'); }
    finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await clientesService.remove(deleteTarget.id);
      toast.success('Cliente eliminado');
      load(search || undefined);
      setDeleteTarget(null);
    } catch { toast.error('Error al eliminar el cliente'); }
    finally { setDeleting(false); }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    try {
      const result = await clientesService.importFile(file);
      setImportResult(result);
      if (result.created > 0) load(search || undefined);
    } catch {
      toast.error('Error al procesar el archivo. Verificá el formato.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-sm text-gray-500 mt-0.5">{clientes.length} clientes registrados</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload className="h-4 w-4" />
              {importing ? 'Importando...' : 'Importar'}
            </Button>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Nuevo cliente
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar clientes..." className="pl-9 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/70">
                <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Cliente</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Contacto</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wide">CUIT/DNI</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-8 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-400">No se encontraron clientes</p>
                    {search && <p className="text-xs text-gray-400 mt-1">Probá con otro término de búsqueda</p>}
                  </td>
                </tr>
              ) : clientes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Initials name={c.nombre} />
                      <div>
                        <p className="font-medium text-gray-900">{c.nombre}</p>
                        <p className="text-xs text-gray-400">{c.direccion}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600"><Mail className="h-3 w-3 text-gray-400" />{c.email}</div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600"><Phone className="h-3 w-3 text-gray-400" />{c.telefono}</div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600 font-mono">{c.cuitDni}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${c.activo ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 cursor-pointer hover:bg-blue-50 transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget({ id: c.id, nombre: c.nombre })} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 cursor-pointer hover:bg-red-50 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {([
              { key: 'nombre', label: 'Nombre completo' },
              { key: 'email', label: 'Email' },
              { key: 'telefono', label: 'Teléfono' },
              { key: 'direccion', label: 'Dirección' },
              { key: 'cuitDni', label: 'CUIT / DNI' },
            ] as const).map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key} className="text-sm font-medium text-gray-700">{label}</Label>
                <Input id={key} value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className="bg-gray-50 focus:bg-white" />
              </div>
            ))}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar cliente</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-gray-600">
              ¿Estás seguro que querés eliminar a{' '}
              <span className="font-semibold text-gray-900">{deleteTarget?.nombre}</span>?
              Esta acción no se puede deshacer.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import result dialog */}
      <Dialog open={!!importResult} onOpenChange={() => setImportResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resultado de la importación</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {importResult && (
              <>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-green-800">
                    {importResult.created === 1
                      ? '1 cliente importado correctamente'
                      : `${importResult.created} clientes importados correctamente`}
                  </p>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <p className="text-sm font-medium text-gray-700">{importResult.errors.length} fila{importResult.errors.length > 1 ? 's' : ''} con errores</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      {importResult.errors.map((e, i) => (
                        <div key={i} className="px-3 py-2 text-xs text-gray-600 flex gap-2">
                          <span className="font-medium text-gray-400 whitespace-nowrap">Fila {e.fila}</span>
                          <span>{e.mensaje}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-1">
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar plantilla CSV de ejemplo
                  </button>
                </div>
              </>
            )}
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setImportResult(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
