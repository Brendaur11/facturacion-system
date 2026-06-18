'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, ArrowUpRight, Clock, CheckCircle2, XCircle, AlertCircle, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { dashboardService } from '@/services/dashboard.service';
import { DashboardResumen, EstadoFactura, Factura, IngresoPorMes } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

const estadoConfig: Record<EstadoFactura, { label: string; color: string; bg: string; dot: string; hex: string; icon: React.ReactNode }> = {
  BORRADOR: { label: 'Borrador', color: 'text-gray-600', bg: 'bg-gray-100',  dot: 'bg-gray-400',  hex: '#9ca3af', icon: <Clock className="h-3.5 w-3.5" /> },
  EMITIDA:  { label: 'Emitida',  color: 'text-blue-700', bg: 'bg-blue-100',  dot: 'bg-blue-500',  hex: '#3b82f6', icon: <AlertCircle className="h-3.5 w-3.5" /> },
  PAGADA:   { label: 'Pagada',   color: 'text-green-700',bg: 'bg-green-100', dot: 'bg-green-500', hex: '#10b981', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  ANULADA:  { label: 'Anulada',  color: 'text-red-700',  bg: 'bg-red-100',   dot: 'bg-red-500',   hex: '#ef4444', icon: <XCircle className="h-3.5 w-3.5" /> },
};

const ESTADOS_ORDER: EstadoFactura[] = ['EMITIDA', 'PAGADA', 'BORRADOR', 'ANULADA'];

function StatCard({ label, value, sub, icon: Icon, iconBg, iconColor, borderColor, href, loading }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType;
  iconBg: string; iconColor: string; borderColor: string; href: string; loading: boolean;
}) {
  return (
    <Link href={href} className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderColor} p-5 shadow-sm hover:shadow-md transition-all group cursor-pointer`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2 truncate">{loading ? '—' : value}</p>
          {sub && !loading && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`${iconBg} p-2.5 rounded-lg flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3 text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
        <span>Ver detalle</span><ArrowUpRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

function Skeleton() {
  return <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />;
}

/* ── Donut chart (pure SVG) ── */
function DonutChart({ resumen, total }: { resumen: DashboardResumen; total: number }) {
  const cx = 60, cy = 60, r = 46, sw = 18;
  const circ = 2 * Math.PI * r;

  const segments = ESTADOS_ORDER.map((e) => {
    const counts: Record<EstadoFactura, number> = {
      EMITIDA: resumen.emitidas,
      PAGADA: resumen.pagadas,
      BORRADOR: resumen.borradores,
      ANULADA: resumen.anuladas,
    };
    return { estado: e, count: counts[e], cfg: estadoConfig[e] };
  });

  let accOffset = 0;
  const arcs = segments.map(({ estado, count, cfg }) => {
    const dashLen = total > 0 ? (count / total) * circ : 0;
    const dashOffset = circ / 4 - accOffset;
    accOffset += dashLen;
    return { estado, count, cfg, dashLen, dashOffset };
  });

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        <svg viewBox="0 0 120 120" className="w-36 h-36">
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
          ) : arcs.map(({ estado, dashLen, dashOffset, cfg }) => (
            <circle
              key={estado}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={cfg.hex}
              strokeWidth={sw}
              strokeDasharray={`${dashLen} ${circ - dashLen}`}
              strokeDashoffset={dashOffset}
              className="transition-all duration-700"
            />
          ))}
          <text x={cx} y={cy - 7} textAnchor="middle" fontSize="22" fontWeight="700" fill="#111827">{total}</text>
          <text x={cx} y={cy + 9} textAnchor="middle" fontSize="9" fill="#9ca3af">facturas</text>
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full">
        {segments.map(({ estado, count, cfg }) => (
          <div key={estado} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
            <span className="text-xs text-gray-500 flex-1 truncate">{cfg.label}</span>
            <span className="text-xs font-semibold text-gray-700">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Bar chart (ingresos por mes) ── */
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatMonth(ym: string): string {
  const [year, month] = ym.split('-');
  return `${MESES[parseInt(month, 10) - 1]} '${year.slice(2)}`;
}

function BarChart({ data }: { data: IngresoPorMes[] }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-36 gap-2">
        <BarChart3 className="h-8 w-8 text-gray-200" />
        <p className="text-xs text-gray-400">Sin ingresos cobrados en los últimos 6 meses</p>
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="flex items-end gap-3 h-36 px-1">
      {data.map((d) => {
        const heightPct = (d.total / maxTotal) * 100;
        return (
          <div key={d.mes} className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end group">
            <div className="relative w-full flex flex-col items-center justify-end" style={{ height: '100%' }}>
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none z-10">
                {formatCurrency(d.total)}
                <div className="text-gray-400 text-center">{d.cantidad} fact.</div>
              </div>
              <div
                className="w-full bg-emerald-500 rounded-t-sm transition-all duration-700 group-hover:bg-emerald-400"
                style={{ height: `${Math.max(heightPct, 2)}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 leading-none">{formatMonth(d.mes)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [ultimas, setUltimas] = useState<Factura[]>([]);
  const [porMes, setPorMes] = useState<IngresoPorMes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardService.getResumen(),
      dashboardService.getUltimas(),
      dashboardService.getPorMes(),
    ])
      .then(([r, u, m]) => { setResumen(r); setUltimas(u); setPorMes(m); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalFacturas = resumen
    ? resumen.emitidas + resumen.pagadas + resumen.borradores + resumen.anuladas
    : 0;

  const stats = [
    {
      label: 'Total facturas', value: totalFacturas,
      icon: FileText, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', borderColor: 'border-l-blue-500', href: '/facturas',
    },
    {
      label: 'Facturas emitidas', value: resumen?.emitidas ?? 0,
      sub: `Pendiente cobrar: ${formatCurrency(resumen?.totalPendiente ?? 0)}`,
      icon: AlertCircle, iconBg: 'bg-amber-100', iconColor: 'text-amber-600', borderColor: 'border-l-amber-500', href: '/facturas',
    },
    {
      label: 'Facturas pagadas', value: resumen?.pagadas ?? 0,
      sub: `Total cobrado: ${formatCurrency(resumen?.totalPagado ?? 0)}`,
      icon: CheckCircle2, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', borderColor: 'border-l-emerald-500', href: '/facturas',
    },
    {
      label: 'Ingresos cobrados', value: formatCurrency(resumen?.totalPagado ?? 0),
      icon: DollarSign, iconBg: 'bg-purple-100', iconColor: 'text-purple-600', borderColor: 'border-l-purple-500', href: '/facturas',
    },
  ];

  const estadosPorcentaje = resumen
    ? ESTADOS_ORDER.map((estado) => {
        const counts: Record<EstadoFactura, number> = {
          EMITIDA: resumen.emitidas, PAGADA: resumen.pagadas,
          BORRADOR: resumen.borradores, ANULADA: resumen.anuladas,
        };
        return { estado, count: counts[estado] };
      })
    : [];

  const totalEstados = estadosPorcentaje.reduce((a, b) => a + b.count, 0);

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Resumen general del sistema de facturación</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((s) => <StatCard key={s.label} {...s} loading={loading} />)}
        </div>

        {/* Row 2: progress bars + últimas facturas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Estado de facturas</h2>
            </div>
            {loading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} />)}</div>
            ) : totalEstados === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin datos todavía</p>
            ) : (
              <div className="space-y-4">
                {estadosPorcentaje.map(({ estado, count }) => {
                  const cfg = estadoConfig[estado];
                  const pct = totalEstados > 0 ? Math.round((count / totalEstados) * 100) : 0;
                  return (
                    <div key={estado}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
                          {cfg.icon}{cfg.label}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{pct}%</span>
                          <span className="text-xs font-semibold text-gray-700 w-4 text-right">{count}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${cfg.dot}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Últimas facturas</h2>
              <Link href="/facturas" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                Ver todas <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
            ) : ultimas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <FileText className="h-10 w-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">No hay facturas todavía</p>
                <Link href="/facturas/nueva" className="mt-3 text-xs text-blue-600 hover:underline">Crear primera factura</Link>
              </div>
            ) : (
              <div className="space-y-1">
                {ultimas.map((f) => {
                  const cfg = estadoConfig[f.estado];
                  return (
                    <Link key={f.id} href={`/facturas/${f.id}`} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800">{f.numero}</p>
                          <p className="text-xs text-gray-400 truncate">{f.cliente?.nombre ?? '—'} · {formatDate(f.fecha)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          {cfg.icon}{cfg.label}
                        </span>
                        <span className="text-sm font-semibold text-gray-800 tabular-nums">{formatCurrency(Number(f.total))}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: donut chart + bar chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Donut — distribución de estados */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-emerald-400 flex-shrink-0" />
              <h2 className="text-sm font-semibold text-gray-700">Composición del total</h2>
            </div>
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-36 h-36 rounded-full border-[18px] border-gray-100 animate-pulse" />
                <div className="space-y-2 w-full">
                  {[1,2,3,4].map(i => <Skeleton key={i} />)}
                </div>
              </div>
            ) : resumen ? (
              <DonutChart resumen={resumen} total={totalFacturas} />
            ) : null}
          </div>

          {/* Bar chart — ingresos mensuales */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Ingresos cobrados · últimos 6 meses</h2>
            </div>
            {loading ? (
              <div className="flex items-end gap-3 h-36">
                {[60, 85, 45, 100, 70, 55].map((h, i) => (
                  <div key={i} className="flex-1 bg-gray-100 rounded-t animate-pulse" style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : (
              <>
                <BarChart data={porMes} />
                {porMes.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      Total período:{' '}
                      <span className="font-semibold text-gray-700">
                        {formatCurrency(porMes.reduce((acc, d) => acc + d.total, 0))}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {porMes.reduce((acc, d) => acc + d.cantidad, 0)} facturas cobradas
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
