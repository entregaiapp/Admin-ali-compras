import { createAdminRealtimeClient } from "@/shared/services/adminRealtime";

export const createOrdersAdminRealtime = (accessToken: string) => {
  return createAdminRealtimeClient(accessToken);
};

export const ordersTenantTopic = (lojaId: string) => `pedidos:loja:${lojaId}`;
