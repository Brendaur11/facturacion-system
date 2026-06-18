import api from '@/lib/api';
import { EstadoFactura, Factura } from '@/types';

export interface CreateFacturaDto {
  clienteId: string;
  fecha: string;
  fechaVencimiento?: string;
  impuesto: number;
  notas?: string;
  items: {
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    productoId?: string;
  }[];
}

export const facturasService = {
  async getAll(params?: { estado?: EstadoFactura; clienteId?: string }): Promise<Factura[]> {
    const res = await api.get('/facturas', { params });
    return res.data.data;
  },

  async getById(id: string): Promise<Factura> {
    const res = await api.get(`/facturas/${id}`);
    return res.data.data;
  },

  async create(data: CreateFacturaDto): Promise<Factura> {
    const res = await api.post('/facturas', data);
    return res.data.data;
  },

  async updateEstado(id: string, estado: EstadoFactura): Promise<Factura> {
    const res = await api.patch(`/facturas/${id}/estado`, { estado });
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/facturas/${id}`);
  },

  async sendEmail(id: string): Promise<{ email: string }> {
    const res = await api.post(`/facturas/${id}/enviar`);
    return res.data.data;
  },
};
