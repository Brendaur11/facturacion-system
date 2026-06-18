export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: 'SUPERADMIN' | 'ADMIN' | 'USER';
  empresaId?: string;
  avatarUrl?: string | null;
}

export interface Empresa {
  id: string;
  nombre: string;
  cuit: string;
  direccion: string;
  telefono: string;
  email: string;
  logo?: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  cuitDni: string;
  activo: boolean;
  createdAt: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  unidad: string;
  activo: boolean;
  createdAt: string;
}

export type EstadoFactura = 'BORRADOR' | 'EMITIDA' | 'PAGADA' | 'ANULADA';

export interface FacturaItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  productoId?: string;
}

export interface Factura {
  id: string;
  numero: string;
  cliente: Cliente;
  empresa: Empresa;
  fecha: string;
  fechaVencimiento?: string;
  estado: EstadoFactura;
  subtotal: number;
  impuesto: number;
  total: number;
  notas?: string;
  items: FacturaItem[];
  createdAt: string;
}

export interface DashboardResumen {
  emitidas: number;
  pagadas: number;
  borradores: number;
  anuladas: number;
  totalPagado: number;
  totalPendiente: number;
}

export interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminTopEmpresa {
  id: string;
  nombre: string;
  facturas: number;
  ingresos: number;
  clientes: number;
  productos: number;
}

export interface AdminDashboard {
  totales: {
    empresas: number;
    usuarios: number;
    facturas: number;
    ingresos: number;
  };
  distribucionEstados: {
    BORRADOR: number;
    EMITIDA: number;
    PAGADA: number;
    ANULADA: number;
  };
  topEmpresas: AdminTopEmpresa[];
  facturasPorMes: IngresoPorMes[];
}

export interface IngresoPorMes {
  mes: string;
  total: number;
  cantidad: number;
}

export interface ImportError {
  fila: number;
  mensaje: string;
}

export interface ImportResult {
  created: number;
  errors: ImportError[];
}
