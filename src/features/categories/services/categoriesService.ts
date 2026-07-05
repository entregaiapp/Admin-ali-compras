import api from "@/shared/lib/api";
import type { CategoryPayload } from "../types/category";

const toList = (payload: any) => {
  const data = payload?.data;
  return Array.isArray(data) ? data : data?.data || [];
};

export const categoriesService = {
  async getCategories() {
    const response = await api.get("/categorias", { params: { per_page: 100 } });
    return toList(response.data);
  },

  async createCategory(payload: CategoryPayload) {
    await api.post("/categorias", payload);
  },

  async updateCategory(id: string, payload: CategoryPayload) {
    await api.patch(`/categorias/${id}`, payload);
  },

  async toggleCategoryStatus(id: string, active: boolean) {
    await api.patch(`/categorias/${id}/ativa`, { ativa: active });
  },

  async deleteCategory(id: string) {
    await api.delete(`/categorias/${id}`);
  },
};
