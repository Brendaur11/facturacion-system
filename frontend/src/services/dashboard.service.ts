import api from '@/lib/api';
import { DashboardResumen, Factura, IngresoPorMes } from '@/types';

export const dashboardService = {
  async getResumen(): Promise<DashboardResumen> {
    const res = await api.get('/dashboard/resumen');
    return res.data.data;
  },

  async getUltimas(): Promise<Factura[]> {
    const res = await api.get('/dashboard/ultimas');
    return res.data.data;
  },

  async getPorMes(): Promise<IngresoPorMes[]> {
    const res = await api.get('/dashboard/por-mes');
    return res.data.data;
  },
};
