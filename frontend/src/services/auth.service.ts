import api from '@/lib/api';
import { User } from '@/types';

export const authService = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, user } = res.data.data;
    return { token: access_token, user };
  },

  async getProfile(): Promise<User> {
    const res = await api.get('/auth/profile');
    return res.data.data;
  },

  async updateProfile(data: { nombre?: string; currentPassword?: string; newPassword?: string }): Promise<User> {
    const res = await api.patch('/auth/profile', data);
    return res.data.data;
  },

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.post('/auth/profile/avatar', formData);
    return res.data.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { token, newPassword });
  },

  logout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  },

  getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },

  saveUser(user: User): void {
    sessionStorage.setItem('user', JSON.stringify(user));
    window.dispatchEvent(new Event('sessionUpdated'));
  },

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!sessionStorage.getItem('token');
  },
};
