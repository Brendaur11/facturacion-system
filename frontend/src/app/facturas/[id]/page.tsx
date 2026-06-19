'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Clock, CheckCircle2, XCircle, AlertCircle, Building2, User, ChevronDown, FileText, FileSpreadsheet, FileType, Sheet } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/app-layout';
import { buttonVariants } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { facturasService } from '@/services/facturas.service';
import { exportService } from '@/services/export.service';
import { Factura, EstadoFactura } from '@/types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

const ESTADOS: EstadoFactura[] = ['BORRADOR', 'EMITIDA', 'PAGADA', 'ANULADA'];

const exportFormats = [
  { fmt: 'pdf'  as const, label: 'PDF',   desc: 'Documento listo para imprimir', icon: FileText,        color: 'bg-red-50 text-red-500' },
  { fmt: 'xlsx' as const, label: 'Excel', desc: 'Planilla con datos y estilos',   icon: FileSpreadsheet, color: 'bg-green-50 text-green-600' },
  { fmt: 'docx' as const, label: 'Word',  desc: 'Documento editable',             icon: FileType,        color: 'bg-blue-50 text-blue-600' },
  { fmt: 'csv'  as const, label: 'CSV',   desc: 'Datos separados por comas',      icon: Sheet,           color: 'bg-amber-50 text-amber-600' },
];

const estadoStyle: Record<EstadoFactura, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  BORRADOR: { bg: 'bg-gray-100', text: 'text-gray-600',  border: 'border-gray-200', icon: <Clock className="h-4 w-4" /> },
  EMITIDA:  { bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-200', icon: <AlertCircle className="h-4 w-4" /> },
  PAGADA:   { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: <CheckCircle2 className="h-4 w-4" /> },
  ANULADA:  { bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-200',  icon: <XCircle className="h-4 w-4" /> },
};

export default function FacturaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [factura, setFactura] = useState<Factura | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    facturasService.getById(id).then(setFactura).catch(() => toast.error('Factura no encontrada')).finally(() => setLoading(false));
  }, [id]);

  async function handleExport(format: 'pdf' | 'xlsx' | 'docx' | 'csv') {
    try { await exportService.exportFacturas([id], format); toast.success(`Exportado como ${format.toUpperCase()}`); }
    catch { toast.error('Error al exportar'); }
  }

  async function handleCambioEstado(nuevoEstado: EstadoFactura) {
    if (!factura || nuevoEstado === factura.estado) return;
    try {
      const actualizada = await facturasService.updateEstado(id, nuevoEstado);
      setFactura(actualizada);
      toast.success(`Estado actualizado a ${nuevoEstado}`);
    } catch {
      toast.error('Error al actualizar el estado');
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4 max-w-4xl">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </AppLayout>
    );
  }
  if (!factura) return <AppLayout><p className="text-gray-500">Factura no encontrada</p></AppLayout>;

  const style = estadoStyle[factura.estado];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/facturas" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5 flex-shrink-0')}>
              <ArrowLeft className="h-4 w-4" /> Volver
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{factura.numero}</h1>
              <p className="text-sm text-gray-500 mt-0.5">Emitida el {formatDate(factura.fecha)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            {/* Estado — solo lectura si está ANULADA */}
            {factura.estado === 'ANULADA' ? (
              <span className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border',
                style.bg, style.text, style.border
              )}>
                {style.icon}
                {factura.estado}
              </span>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border cursor-pointer transition-colors hover:opacity-80',
                  style.bg, style.text, style.border
                )}>
                  {style.icon}
                  {factura.estado}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {ESTADOS.filter((e) => e !== factura.estado && e !== 'ANULADA' || e === 'ANULADA').filter(e => e !== factura.estado).map((e) => {
                    const s = estadoStyle[e];
                    return (
                      <DropdownMenuItem key={e} onClick={() => handleCambioEstado(e)} className="gap-2">
                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full', s.bg, s.text)}>
                          {s.icon}{e}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Exportar */}
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}>
                <Download className="h-4 w-4" /> Exportar
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{factura.numero}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {exportFormats.map(({ fmt, label, desc, icon: Icon, color }) => (
                  <DropdownMenuItem key={fmt} onClick={() => handleExport(fmt)}>
                    <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</span>
            </div>
            <p className="font-semibold text-gray-900">{factura.cliente?.nombre}</p>
            <p className="text-sm text-gray-500 mt-1">{factura.cliente?.email}</p>
            <p className="text-sm text-gray-500">{factura.cliente?.telefono}</p>
            <p className="text-sm text-gray-500">{factura.cliente?.direccion}</p>
            <p className="text-xs text-gray-400 mt-2 font-mono">CUIT/DNI: {factura.cliente?.cuitDni}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center">
                <Building2 className="h-3.5 w-3.5 text-purple-500" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Empresa emisora</span>
            </div>
            <p className="font-semibold text-gray-900">{factura.empresa?.nombre}</p>
            <p className="text-sm text-gray-500 mt-1 font-mono">CUIT: {factura.empresa?.cuit}</p>
            <p className="text-sm text-gray-500">{factura.empresa?.direccion}</p>
            <p className="text-sm text-gray-500">{factura.empresa?.email}</p>
            {factura.fechaVencimiento && (
              <p className="text-xs text-amber-600 font-medium mt-2">Vence: {formatDate(factura.fechaVencimiento)}</p>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50/70">
            <h2 className="text-sm font-semibold text-gray-700">Ítems de la factura</h2>
          </div>

          {/* Mobile: item cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {factura.items?.map((item) => (
              <div key={item.id} className="px-4 py-3 space-y-1">
                <p className="text-sm font-medium text-gray-900">{item.descripcion}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{item.cantidad} × {formatCurrency(Number(item.precioUnitario))}</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(Number(item.subtotal))}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <table className="hidden md:table w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Descripción</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cant.</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Precio unit.</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {factura.items?.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/40">
                  <td className="px-5 py-3.5 text-gray-700">{item.descripcion}</td>
                  <td className="px-5 py-3.5 text-right text-gray-600">{item.cantidad}</td>
                  <td className="px-5 py-3.5 text-right text-gray-600">{formatCurrency(Number(item.precioUnitario))}</td>
                  <td className="px-5 py-3.5 text-right font-medium text-gray-900">{formatCurrency(Number(item.subtotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t px-5 py-4 bg-gray-50/70">
            <div className="max-w-xs ml-auto space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>{formatCurrency(Number(factura.subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>IVA ({factura.impuesto}%)</span>
                <span>{formatCurrency(Number(factura.subtotal) * Number(factura.impuesto) / 100)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t">
                <span>Total</span>
                <span className="text-lg">{formatCurrency(Number(factura.total))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notas — ocultar "Pendiente de pago" cuando ya está pagada o anulada */}
        {factura.notas && !(
          ['PAGADA', 'ANULADA'].includes(factura.estado) &&
          factura.notas.toLowerCase().includes('pendiente')
        ) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Notas</p>
            <p className="text-sm text-amber-800">{factura.notas}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
