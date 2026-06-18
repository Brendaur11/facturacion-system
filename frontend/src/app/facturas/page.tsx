'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Download, Clock, CheckCircle2, XCircle, AlertCircle, FileText, Sheet, FileType, FileSpreadsheet, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/app-layout';
import { buttonVariants } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
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

const estadoStyle: Record<EstadoFactura, { bg: string; text: string; icon: React.ReactNode }> = {
  BORRADOR: { bg: 'bg-gray-100',   text: 'text-gray-600',  icon: <Clock className="h-3 w-3" /> },
  EMITIDA:  { bg: 'bg-blue-50',    text: 'text-blue-700',  icon: <AlertCircle className="h-3 w-3" /> },
  PAGADA:   { bg: 'bg-green-50',   text: 'text-green-700', icon: <CheckCircle2 className="h-3 w-3" /> },
  ANULADA:  { bg: 'bg-red-50',     text: 'text-red-700',   icon: <XCircle className="h-3 w-3" /> },
};

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const params = filtroEstado !== 'TODOS' ? { estado: filtroEstado as EstadoFactura } : undefined;
      setFacturas(await facturasService.getAll(params));
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filtroEstado]);

  function toggleSelect(id: string) {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) { next.delete(id); } else { next.add(id); } return next; });
  }
  function toggleAll() {
    setSelected(selected.size === facturas.length ? new Set() : new Set(facturas.map((f) => f.id)));
  }

  async function handleExport(format: 'pdf' | 'xlsx' | 'docx' | 'csv') {
    const ids = selected.size > 0 ? Array.from(selected) : facturas.map((f) => f.id);
    if (!ids.length) { toast.error('No hay facturas para exportar'); return; }
    setExporting(true);
    try { await exportService.exportFacturas(ids, format); toast.success(`Exportado como ${format.toUpperCase()}`); }
    catch { toast.error('Error al exportar'); }
    finally { setExporting(false); }
  }

  async function handleSendEmail(id: string) {
    setSendingEmail((prev) => new Set(prev).add(id));
    try {
      const { email } = await facturasService.sendEmail(id);
      toast.success(`Factura enviada a ${email}`);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al enviar el email';
      toast.error(msg);
    } finally {
      setSendingEmail((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  }

  async function handleCambioEstado(id: string, estado: string | null) {
    if (!estado) return;
    try { await facturasService.updateEstado(id, estado as EstadoFactura); toast.success('Estado actualizado'); load(); }
    catch { toast.error('Error al actualizar el estado'); }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {facturas.length} facturas{selected.size > 0 && ` · ${selected.size} seleccionadas`}
            </p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')} disabled={exporting}>
                <Download className="h-4 w-4" />
                {exporting ? 'Exportando...' : selected.size > 0 ? `Exportar (${selected.size})` : 'Exportar'}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {selected.size > 0 ? `${selected.size} factura${selected.size > 1 ? 's' : ''} seleccionada${selected.size > 1 ? 's' : ''}` : 'Todas las facturas'}
                </DropdownMenuLabel>
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
            <Link href="/facturas/nueva" className={cn(buttonVariants(), 'gap-2')}>
              <Plus className="h-4 w-4" /> Nueva factura
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2">
          {['TODOS', ...ESTADOS].map((e) => (
            <button
              key={e}
              onClick={() => setFiltroEstado(e)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer',
                filtroEstado === e
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              )}
            >
              {e === 'TODOS' ? 'Todas' : e}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/70">
                <th className="px-5 py-3.5 w-10">
                  <input type="checkbox" checked={selected.size === facturas.length && facturas.length > 0} onChange={toggleAll} className="rounded accent-blue-600" />
                </th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Factura</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Cliente</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Fecha</th>
                <th className="text-right px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Total</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3.5 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-8 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : facturas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-400">No hay facturas</p>
                    <Link href="/facturas/nueva" className="mt-3 inline-block text-xs text-blue-600 hover:underline">Crear primera factura</Link>
                  </td>
                </tr>
              ) : facturas.map((f) => {
                const style = estadoStyle[f.estado];
                return (
                  <tr key={f.id} className={cn('hover:bg-gray-50/60 transition-colors', selected.has(f.id) && 'bg-blue-50/40')}>
                    <td className="px-5 py-4">
                      <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggleSelect(f.id)} className="rounded accent-blue-600" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-blue-500" />
                        </div>
                        <Link href={`/facturas/${f.id}`} className="font-semibold text-blue-700 hover:underline">{f.numero}</Link>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-700">{f.cliente?.nombre ?? '—'}</td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{formatDate(f.fecha)}</td>
                    <td className="px-5 py-4 text-right font-semibold text-gray-900">{formatCurrency(Number(f.total))}</td>
                    <td className="px-5 py-4">
                      {f.estado === 'ANULADA' ? (
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', style.bg, style.text)}>
                          {style.icon}{f.estado}
                        </span>
                      ) : (
                        <Select value={f.estado} onValueChange={(v) => handleCambioEstado(f.id, v)}>
                          <SelectTrigger className="w-auto border-0 shadow-none p-0 h-auto focus:ring-0">
                            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer', style.bg, style.text)}>
                              {style.icon}{f.estado}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleSendEmail(f.id)}
                          disabled={sendingEmail.has(f.id)}
                          title={f.cliente?.email ? `Enviar a ${f.cliente.email}` : 'El cliente no tiene email'}
                          className="text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {sendingEmail.has(f.id)
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Mail className="h-4 w-4" />}
                        </button>
                        <Link href={`/facturas/${f.id}`} className="text-xs text-gray-400 hover:text-blue-600 font-medium transition-colors">Ver →</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
