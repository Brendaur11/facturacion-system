'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Package, Tag, Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { productosService } from '@/services/productos.service';
import { ImportResult, Producto } from '@/types';
import { formatCurrency } from '@/lib/utils';

const emptyForm = { nombre: '', descripcion: '', precio: '', unidad: '' };

function downloadTemplate() {
  const csv = 'nombre,descripcion,precio,unidad\nServicio de consultoría,Desarrollo y asesoramiento,15000,hora\nHosting mensual,Servidor dedicado,8500,mes';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_productos.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load(q?: string) {
    setLoading(true);
    try { setProductos(await productosService.getAll(q)); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(search || undefined), 400);
    return () => clearTimeout(t);
  }, [search]);

  function openCreate() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(p: Producto) {
    setEditing(p);
    setForm({ nombre: p.nombre, descripcion: p.descripcion, precio: String(p.precio), unidad: p.unidad });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...form, precio: Number(form.precio) };
      if (editing) { await productosService.update(editing.id, payload); toast.success('Producto actualizado'); }
      else { await productosService.create(payload); toast.success('Producto creado'); }
      setDialogOpen(false);
      load(search || undefined);
    } catch { toast.error('Error al guardar el producto'); }
    finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await productosService.remove(deleteTarget.id);
      toast.success('Producto eliminado');
      load(search || undefined);
      setDeleteTarget(null);
    } catch { toast.error('Error al eliminar el producto'); }
    finally { setDeleting(false); }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    try {
      const result = await productosService.importFile(file);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
            <p className="text-sm text-gray-500 mt-0.5">{productos.length} productos registrados</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
              <Plus className="h-4 w-4" /> Nuevo producto
            </Button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar productos..." className="pl-9 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Mobile: cards */}
        <div className="md:hidden space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="h-5 bg-gray-100 rounded animate-pulse mb-3" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
              </div>
            ))
          ) : productos.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Package className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-400">No se encontraron productos</p>
              {search && <p className="text-xs text-gray-400 mt-1">Probá con otro término de búsqueda</p>}
            </div>
          ) : productos.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <Package className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-400 truncate">{p.descripcion}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteTarget({ id: p.id, nombre: p.nombre })} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="font-semibold text-gray-900">{formatCurrency(Number(p.precio))}</span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                    <Tag className="h-3 w-3" />{p.unidad}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${p.activo ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/70">
                <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Producto</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Precio</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Unidad</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-8 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : productos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Package className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-400">No se encontraron productos</p>
                    {search && <p className="text-xs text-gray-400 mt-1">Probá con otro término de búsqueda</p>}
                  </td>
                </tr>
              ) : productos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <Package className="h-4 w-4 text-purple-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{p.nombre}</p>
                        <p className="text-xs text-gray-400 max-w-xs truncate">{p.descripcion}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-gray-900">{formatCurrency(Number(p.precio))}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                      <Tag className="h-3 w-3" />{p.unidad}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${p.activo ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget({ id: p.id, nombre: p.nombre })} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors">
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
            <DialogTitle>{editing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {([
              { key: 'nombre', label: 'Nombre', type: 'text' },
              { key: 'descripcion', label: 'Descripción', type: 'text' },
              { key: 'precio', label: 'Precio', type: 'number' },
              { key: 'unidad', label: 'Unidad (ej: hora, mes, unidad)', type: 'text' },
            ] as const).map(({ key, label, type }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key} className="text-sm font-medium text-gray-700">{label}</Label>
                <Input id={key} type={type} value={form[key]} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} className="bg-gray-50 focus:bg-white" />
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
            <DialogTitle>Eliminar producto</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-gray-600">
              ¿Estás seguro que querés eliminar{' '}
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
                      ? '1 producto importado correctamente'
                      : `${importResult.created} productos importados correctamente`}
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
