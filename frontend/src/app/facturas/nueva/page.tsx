'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowLeft, Calculator, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { clientesService } from '@/services/clientes.service';
import { productosService } from '@/services/productos.service';
import { facturasService } from '@/services/facturas.service';
import { empresaService } from '@/services/empresa.service';
import { Cliente, Empresa, Producto } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';

interface ItemRow { descripcion: string; cantidad: number; precioUnitario: number; productoId?: string; }

export default function NuevaFacturaPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [clienteId, setClienteId] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [impuesto, setImpuesto] = useState(21);
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ descripcion: '', cantidad: 1, precioUnitario: 0 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    clientesService.getAll().then(setClientes);
    productosService.getAll().then(setProductos);
    empresaService.get().then(setEmpresa).catch(() => {});
  }, []);

  function addItem() { setItems((p) => [...p, { descripcion: '', cantidad: 1, precioUnitario: 0 }]); }
  function removeItem(i: number) { setItems((p) => p.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof ItemRow, value: string | number) {
    setItems((p) => p.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }
  function selectProducto(i: number, productoId: string | null) {
    if (!productoId) return;
    const prod = productos.find((p) => p.id === productoId);
    if (!prod) return;
    setItems((p) => p.map((row, idx) => idx === i ? { ...row, productoId: prod.id, descripcion: prod.nombre, precioUnitario: Number(prod.precio) } : row));
  }

  const subtotal = items.reduce((acc, it) => acc + it.cantidad * it.precioUnitario, 0);
  const impuestoMonto = subtotal * impuesto / 100;
  const total = subtotal + impuestoMonto;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId) { toast.error('Seleccioná un cliente'); return; }
    if (items.some((it) => !it.descripcion || it.cantidad <= 0)) { toast.error('Completá todos los ítems'); return; }
    setSaving(true);
    try {
      await facturasService.create({ clienteId, fecha, fechaVencimiento: fechaVencimiento || undefined, impuesto, notas: notas || undefined, items: items.map((it) => ({ descripcion: it.descripcion, cantidad: it.cantidad, precioUnitario: it.precioUnitario, productoId: it.productoId })) });
      toast.success('Factura creada correctamente');
      router.push('/facturas');
    } catch { toast.error('Error al crear la factura'); }
    finally { setSaving(false); }
  }

  return (
    <AppLayout>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-4">
          <Link href="/facturas" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5')}>
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nueva factura</h1>
            <p className="text-sm text-gray-500 mt-0.5">Completá los datos para generar una nueva factura</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: form */}
          <div className="lg:col-span-2 space-y-5">
            {/* Datos generales */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Datos generales</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Cliente *</Label>
                  <Select value={clienteId} onValueChange={(v) => v && setClienteId(v)}>
                    <SelectTrigger className="bg-gray-50">
                      <span className={cn('flex-1 text-left truncate text-sm', !clienteId && 'text-gray-400')}>
                        {clienteId ? (clientes.find(c => c.id === clienteId)?.nombre ?? 'Seleccioná un cliente') : 'Seleccioná un cliente'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha *</Label>
                  <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="bg-gray-50" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha de vencimiento</Label>
                  <Input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} className="bg-gray-50" />
                </div>
                <div className="space-y-1.5">
                  <Label>IVA (%)</Label>
                  <Input type="number" value={impuesto} onChange={(e) => setImpuesto(Number(e.target.value))} min={0} max={100} className="bg-gray-50" />
                </div>
                <div className="space-y-1.5">
                  <Label>Notas</Label>
                  <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones..." className="bg-gray-50" />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b bg-gray-50/70 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Ítems</h2>
                <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Agregar ítem
                </button>
              </div>
              <div className="p-4 space-y-2">
                <div className="grid grid-cols-12 gap-2 px-1 mb-1">
                  <span className="col-span-3 text-xs font-medium text-gray-400">Producto</span>
                  <span className="col-span-4 text-xs font-medium text-gray-400">Descripción</span>
                  <span className="col-span-2 text-xs font-medium text-gray-400">Cantidad</span>
                  <span className="col-span-2 text-xs font-medium text-gray-400">Precio</span>
                  <span className="col-span-1" />
                </div>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center group">
                    <div className="col-span-3">
                      <Select value={item.productoId ?? ''} onValueChange={(v) => selectProducto(i, v)}>
                        <SelectTrigger className="h-9 bg-gray-50 text-sm">
                          <span className={cn('flex-1 text-left truncate', !item.productoId && 'text-gray-500')}>
                            {item.productoId ? (productos.find(p => p.id === item.productoId)?.nombre ?? 'Seleccionar') : 'Seleccionar'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {productos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input className="col-span-4 h-9 bg-gray-50 text-sm" value={item.descripcion} onChange={(e) => updateItem(i, 'descripcion', e.target.value)} placeholder="Descripción" />
                    <Input className="col-span-2 h-9 bg-gray-50 text-sm" type="number" value={item.cantidad} onChange={(e) => updateItem(i, 'cantidad', Number(e.target.value))} min={1} />
                    <Input className="col-span-2 h-9 bg-gray-50 text-sm" type="number" value={item.precioUnitario} onChange={(e) => updateItem(i, 'precioUnitario', Number(e.target.value))} min={0} />
                    <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1} className="col-span-1 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: summary */}
          <div className="space-y-4">
            {empresa && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">Factura emitida por</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{empresa.nombre}</p>
                {empresa.cuit && <p className="text-xs text-gray-500 mt-0.5">CUIT: {empresa.cuit}</p>}
                {empresa.email && <p className="text-xs text-gray-500 mt-0.5">{empresa.email}</p>}
              </div>
            )}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">Resumen</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-800">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>IVA ({impuesto}%)</span>
                  <span className="font-medium text-gray-800">{formatCurrency(impuestoMonto)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? 'Creando...' : 'Crear factura'}
                </Button>
                <Link href="/facturas" className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-center')}>
                  Cancelar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </AppLayout>
  );
}
