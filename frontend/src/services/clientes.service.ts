import api from '@/lib/api';
import { Cliente, ImportResult } from '@/types';

export const clientesService = {
  async getAll(search?: string): Promise<Cliente[]> {
    const res = await api.get('/clientes', { params: search ? { search } : {} });
    return res.data.data;
  },

  async getById(id: string): Promise<Cliente> {
    const res = await api.get(`/clientes/${id}`);
    return res.data.data;
  },

  async create(data: Omit<Cliente, 'id' | 'activo' | 'createdAt'>): Promise<Cliente> {
    const res = await api.post('/clientes', data);
    return res.data.data;
  },

  async update(id: string, data: Partial<Cliente>): Promise<Cliente> {
    const res = await api.patch(`/clientes/${id}`, data);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/clientes/${id}`);
  },

  async importFile(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/clientes/import', formData);
    return res.data.data;
  },
};
