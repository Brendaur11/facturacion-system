import api from '@/lib/api';
import { ImportResult, Producto } from '@/types';

export const productosService = {
  async getAll(search?: string): Promise<Producto[]> {
    const res = await api.get('/productos', { params: search ? { search } : {} });
    return res.data.data;
  },

  async getById(id: string): Promise<Producto> {
    const res = await api.get(`/productos/${id}`);
    return res.data.data;
  },

  async create(data: Omit<Producto, 'id' | 'activo' | 'createdAt'>): Promise<Producto> {
    const res = await api.post('/productos', data);
    return res.data.data;
  },

  async update(id: string, data: Partial<Producto>): Promise<Producto> {
    const res = await api.patch(`/productos/${id}`, data);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/productos/${id}`);
  },

  async importFile(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/productos/import', formData);
    return res.data.data;
  },
};
