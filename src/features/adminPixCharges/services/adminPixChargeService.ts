import api from "@/shared/lib/api";
import type { AdminPixCharge } from "../types/adminPixCharge";

const unwrap = (response: any) => response?.data?.data ?? response?.data;

export const adminPixChargeService = {
  get: async (pedidoId: string): Promise<AdminPixCharge> => unwrap(await api.get(`/admin-pix-charges/orders/${pedidoId}`)),
  refresh: async (pedidoId: string): Promise<AdminPixCharge> => unwrap(await api.post(`/admin-pix-charges/orders/${pedidoId}/refresh`)),
  regenerate: async (pedidoId: string): Promise<AdminPixCharge> => unwrap(await api.post(`/admin-pix-charges/orders/${pedidoId}/regenerate`)),
  cancel: async (pedidoId: string): Promise<AdminPixCharge> => unwrap(await api.post(`/admin-pix-charges/orders/${pedidoId}/cancel`)),
};
