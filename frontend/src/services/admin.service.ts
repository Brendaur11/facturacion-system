import api from '@/lib/api';
import { AdminDashboard, Empresa, User } from '@/types';

export interface CreateEmpresaPayload {
  nombre: string;
  cuit?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export interface CreateUserPayload {
  nombre: string;
  email: string;
  password: string;
  rol?: 'SUPERADMIN' | 'ADMIN' | 'USER';
  empresaId?: string;
}

export interface UpdateUserPayload {
  nombre?: string;
  email?: string;
  rol?: 'SUPERADMIN' | 'ADMIN' | 'USER';
  empresaId?: string;
}

export const adminService = {
  async getDashboard(): Promise<AdminDashboard> {
    const res = await api.get('/admin/dashboard');
    return res.data.data;
  },

  // Empresas
  async getEmpresas(): Promise<Empresa[]> {
    const res = await api.get('/admin/empresas');
    return res.data.data;
  },

  async createEmpresa(data: CreateEmpresaPayload): Promise<Empresa> {
    const res = await api.post('/admin/empresas', data);
    return res.data.data;
  },

  async updateEmpresa(id: string, data: Partial<CreateEmpresaPayload>): Promise<Empresa> {
    const res = await api.patch(`/admin/empresas/${id}`, data);
    return res.data.data;
  },

  async removeEmpresa(id: string): Promise<void> {
    await api.delete(`/admin/empresas/${id}`);
  },

  // Usuarios
  async getUsuarios(): Promise<Omit<User, 'password'>[]> {
    const res = await api.get('/admin/usuarios');
    return res.data.data;
  },

  async createUsuario(data: CreateUserPayload): Promise<Omit<User, 'password'>> {
    const res = await api.post('/admin/usuarios', data);
    return res.data.data;
  },

  async updateUsuario(id: string, data: UpdateUserPayload): Promise<Omit<User, 'password'>> {
    const res = await api.patch(`/admin/usuarios/${id}`, data);
    return res.data.data;
  },

  async removeUsuario(id: string): Promise<void> {
    await api.delete(`/admin/usuarios/${id}`);
  },
};
