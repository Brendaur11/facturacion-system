import api from '@/lib/api';
import { Empresa } from '@/types';

export const empresaService = {
  async get(): Promise<Empresa> {
    const res = await api.get('/empresa');
    return res.data.data;
  },

  async update(data: Partial<Empresa>): Promise<Empresa> {
    const res = await api.patch('/empresa', data);
    return res.data.data;
  },
};
