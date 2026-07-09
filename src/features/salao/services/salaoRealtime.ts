import { createAdminRealtimeClient } from "@/shared/services/adminRealtime";

export const createSalaoAdminRealtime = (accessToken: string) => {
  return createAdminRealtimeClient(accessToken);
};

export const salaoTenantTopic = (lojaId: string) => `salao:loja:${lojaId}`;
