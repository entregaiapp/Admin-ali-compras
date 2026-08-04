import api from '@/shared/lib/api';
import type { MenuImport, MenuImportAvailability, MenuImportReview } from '../types/menuImport';

const unwrap = <T,>(response: any): T => response.data?.data ?? response.data;

export const menuImportsService = {
  async getAvailability(): Promise<MenuImportAvailability> {
    return unwrap(await api.get('/importacoes-cardapio/disponibilidade'));
  },

  async create(files: File[]): Promise<MenuImport> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const response = await api.post('/importacoes-cardapio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Idempotency-Key': crypto.randomUUID(),
      },
      timeout: 120000,
    });
    return unwrap(response);
  },

  async list(): Promise<MenuImport[]> {
    const payload: any = unwrap(await api.get('/importacoes-cardapio', { params: { page: 1, perPage: 50 } }));
    return Array.isArray(payload) ? payload : payload?.data || [];
  },

  async getById(id: string): Promise<MenuImport> {
    return unwrap(await api.get(`/importacoes-cardapio/${id}`));
  },

  async saveReview(id: string, review: MenuImportReview): Promise<MenuImport> {
    return unwrap(await api.patch(`/importacoes-cardapio/${id}/revisao`, review, { timeout: 60000 }));
  },

  async confirm(id: string) {
    return unwrap(await api.post(`/importacoes-cardapio/${id}/confirmar`, {}, { timeout: 120000 }));
  },

  async cancel(id: string): Promise<MenuImport> {
    return unwrap(await api.post(`/importacoes-cardapio/${id}/cancelar`));
  },
};
