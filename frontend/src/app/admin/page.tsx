'use client';

import { useEffect, useState } from 'react';
import {
  Building2, Users, FileText, DollarSign,
  TrendingUp, Clock, CheckCircle2, AlertCircle, XCircle, BarChart3,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { adminService } from '@/services/admin.service';
import { AdminDashboard } from '@/types';
import { formatCurrency } from '@/lib/utils';

/* ── helpers ──────────────────────────────────────────────────────────── */
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function formatMonth(ym: string) {
  const [y, m] = ym.split('-');
  return `${MESES[parseInt(m, 10) - 1]} '${y.slice(2)}`;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />;
}

/* ── stat card ────────────────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, iconBg, iconColor, borderColor, loading }: {
  label: string; value: string | number; icon: React.ElementType;
  iconBg: string; iconColor: string; borderColor: string; loading: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderColor} p-5 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{loading ? '—' : value}</p>
        </div>
        <div className={`${iconBg} p-2.5 rounded-lg flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

/* ── donut ────────────────────────────────────────────────────────────── */
const ESTADO_COLORS = {
  EMITIDA:  { hex: '#3b82f6', label: 'Emitidas',  dot: 'bg-blue-500'  },
  PAGADA:   { hex: '#10b981', label: 'Pagadas',   dot: 'bg-emerald-500'},
  BORRADOR: { hex: '#9ca3af', label: 'Borradores',dot: 'bg-gray-400'  },
  ANULADA:  { hex: '#ef4444', label: 'Anuladas',  dot: 'bg-red-500'   },
} as const;

function DonutGlobal({ dist, total }: { dist: AdminDashboard['distribucionEstados']; total: number }) {
  const cx = 60, cy = 60, r = 46, sw = 18;
  const circ = 2 * Math.PI * r;
  const order = ['EMITIDA', 'PAGADA', 'BORRADOR', 'ANULADA'] as const;
  let acc = 0;
  const arcs = order.map((e) => {
    const count = dist[e];
    const dashLen = total > 0 ? (count / total) * circ : 0;
    const dashOffset = circ / 4 - acc;
    acc += dashLen;
    return { e, count, dashLen, dashOffset, ...ESTADO_COLORS[e] };
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 120 120" className="w-36 h-36">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
        ) : arcs.map(({ e, dashLen, dashOffset, hex }) => (
          <circle key={e} cx={cx} cy={cy} r={r} fill="none" stroke={hex}
            strokeWidth={sw}
            strokeDasharray={`${dashLen} ${circ - dashLen}`}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700"
          />
        ))}
        <text x={cx} y={cy - 7} textAnchor="middle" fontSize="22" fontWeight="700" fill="#111827">{total}</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="9" fill="#9ca3af">facturas</text>
      </svg>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full">
        {arcs.map(({ e, count, dot, label }) => (
          <div key={e} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
            <span className="text-xs text-gray-500 flex-1">{label}</span>
            <span className="text-xs font-semibold text-gray-700">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── bar chart ────────────────────────────────────────────────────────── */
function BarChartGlobal({ data }: { data: AdminDashboard['facturasPorMes'] }) {
  if (data.length === 0) return (
    <div className="flex flex-col items-center justify-center h-36 gap-2">
      <BarChart3 className="h-8 w-8 text-gray-200" />
      <p className="text-xs text-gray-400">Sin datos de ingresos cobrados</p>
    </div>
  );
  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex items-end gap-3 h-36 px-1">
      {data.map((d) => (
        <div key={d.mes} className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end group">
          <div className="relative w-full flex flex-col items-center justify-end h-full">
            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none z-10">
              {formatCurrency(d.total)}
              <div className="text-gray-400 text-center">{d.cantidad} fact.</div>
            </div>
            <div
              className="w-full bg-blue-500 rounded-t-sm transition-all duration-700 group-hover:bg-blue-400"
              style={{ height: `${Math.max((d.total / maxTotal) * 100, 2)}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 leading-none">{formatMonth(d.mes)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── page ─────────────────────────────────────────────────────────────── */
export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalFacturas = data
    ? data.distribucionEstados.BORRADOR + data.distribucionEstados.EMITIDA +
      data.distribucionEstados.PAGADA + data.distribucionEstados.ANULADA
    : 0;

  const stats = [
    { label: 'Empresas activas',   value: data?.totales.empresas ?? 0,          icon: Building2,    iconBg: 'bg-blue-100',    iconColor: 'text-blue-600',    borderColor: 'border-l-blue-500'    },
    { label: 'Usuarios',           value: data?.totales.usuarios ?? 0,          icon: Users,        iconBg: 'bg-purple-100',  iconColor: 'text-purple-600',  borderColor: 'border-l-purple-500'  },
    { label: 'Facturas totales',   value: data?.totales.facturas ?? 0,          icon: FileText,     iconBg: 'bg-amber-100',   iconColor: 'text-amber-600',   borderColor: 'border-l-amber-500'   },
    { label: 'Ingresos globales',  value: formatCurrency(data?.totales.ingresos ?? 0), icon: DollarSign, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', borderColor: 'border-l-emerald-500' },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard global</h1>
          <p className="text-sm text-gray-500 mt-1">Métricas consolidadas de todas las empresas</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((s) => <StatCard key={s.label} {...s} loading={loading} />)}
        </div>

        {/* Top empresas */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Top empresas por actividad</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/70 border-b">
                {['Empresa','Facturas','Ingresos cobrados','Clientes','Productos'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-5 py-4"><Skeleton className="h-6" /></td></tr>
                ))
              ) : !data || data.topEmpresas.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">Sin datos todavía</td></tr>
              ) : data.topEmpresas.map((e, i) => (
                <tr key={e.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <span className="font-medium text-gray-900">{e.nombre}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                      <FileText className="h-3 w-3" />{e.facturas}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-emerald-700">{formatCurrency(e.ingresos)}</td>
                  <td className="px-5 py-3.5 text-gray-600">{e.clientes}</td>
                  <td className="px-5 py-3.5 text-gray-600">{e.productos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Distribución de estados */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex gap-0.5">
                {[CheckCircle2, AlertCircle, Clock, XCircle].map((I, idx) => (
                  <I key={idx} className="h-4 w-4 text-gray-300" />
                ))}
              </div>
              <h2 className="text-sm font-semibold text-gray-700">Estados globales</h2>
            </div>
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-36 h-36 rounded-full border-[18px] border-gray-100 animate-pulse" />
                <div className="space-y-2 w-full">{[1,2,3,4].map(i => <Skeleton key={i} className="h-6" />)}</div>
              </div>
            ) : data ? (
              <DonutGlobal dist={data.distribucionEstados} total={totalFacturas} />
            ) : null}
          </div>

          {/* Ingresos globales por mes */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Ingresos cobrados globales · últimos 6 meses</h2>
            </div>
            {loading ? (
              <div className="flex items-end gap-3 h-36">
                {[55, 80, 40, 100, 65, 50].map((h, i) => (
                  <div key={i} className="flex-1 bg-gray-100 rounded-t animate-pulse" style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : data ? (
              <>
                <BarChartGlobal data={data.facturasPorMes} />
                {data.facturasPorMes.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      Total período:{' '}
                      <span className="font-semibold text-gray-700">
                        {formatCurrency(data.facturasPorMes.reduce((a, d) => a + d.total, 0))}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {data.facturasPorMes.reduce((a, d) => a + d.cantidad, 0)} facturas cobradas
                    </p>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
