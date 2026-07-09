import api from "@/shared/lib/api";

function unwrap<T = any>(response: any): T {
  return response?.data?.data ?? response?.data ?? response;
}

export const salaoService = {
  listMesas: async (params?: Record<string, unknown>) =>
    unwrap(await api.get("/salao/mesas", { params })),

  createMesa: async (data: Record<string, unknown>) =>
    unwrap(await api.post("/salao/mesas", data)),

  deleteMesa: async (id: string) =>
    unwrap(await api.delete(`/salao/mesas/${id}`)),

  acknowledgeWaiterCallForMesa: async (id: string) =>
    unwrap(await api.post(`/salao/mesas/${id}/atender-garcom`)),

  acknowledgeNewCustomerOrdersForMesa: async (id: string) =>
    unwrap(await api.post(`/salao/mesas/${id}/atender-novos-pedidos`)),

  rotateMesaQr: async (id: string) =>
    unwrap(await api.post(`/salao/mesas/${id}/qrcode/rotate`)),

  getMesaQr: async (id: string) =>
    unwrap(await api.get(`/salao/mesas/${id}/qrcode`)),

  listOpeningRequests: async (params?: Record<string, unknown>) =>
    unwrap(await api.get("/salao/solicitacoes", { params })),

  approveOpeningRequest: async (id: string) =>
    unwrap(await api.post(`/salao/solicitacoes/${id}/aprovar`)),

  refuseOpeningRequest: async (id: string, data?: Record<string, unknown>) =>
    unwrap(await api.post(`/salao/solicitacoes/${id}/recusar`, data || {})),

  openComanda: async (data: Record<string, unknown>) =>
    unwrap(await api.post("/salao/comandas", data)),

  listComandas: async (params?: Record<string, unknown>) =>
    unwrap(await api.get("/salao/comandas", { params })),

  getComanda: async (id: string) =>
    unwrap(await api.get(`/salao/comandas/${id}`)),

  addItem: async (comandaId: string, data: Record<string, unknown>) =>
    unwrap(await api.post(`/salao/comandas/${comandaId}/itens`, data)),

  updateItem: async (comandaId: string, itemId: string, data: Record<string, unknown>) =>
    unwrap(await api.patch(`/salao/comandas/${comandaId}/itens/${itemId}`, data)),

  removeItem: async (comandaId: string, itemId: string) =>
    unwrap(await api.delete(`/salao/comandas/${comandaId}/itens/${itemId}`)),

  regeneratePin: async (comandaId: string) =>
    unwrap(await api.post(`/salao/comandas/${comandaId}/gerar-novo-pin`)),

  closeAccount: async (comandaId: string, data: Record<string, unknown>) =>
    unwrap(await api.post(`/salao/comandas/${comandaId}/fechar-conta`, data)),

  confirmPayment: async (comandaId: string, data?: Record<string, unknown>) =>
    unwrap(await api.post(`/salao/comandas/${comandaId}/confirmar-pagamento`, data || {})),

  unblockParticipant: async (participantId: string) =>
    unwrap(await api.post(`/salao/participantes/${participantId}/desbloquear-pin`)),

  transferTable: async (comandaId: string, data: Record<string, unknown>) =>
    unwrap(await api.post(`/salao/comandas/${comandaId}/transferir-mesa`, data)),

  joinTables: async (comandaId: string, data: Record<string, unknown>) =>
    unwrap(await api.post(`/salao/comandas/${comandaId}/juntar-mesas`, data)),

  listKds: async (params?: Record<string, unknown>) =>
    unwrap(await api.get("/salao/kds", { params })),

  updateItemStatus: async (itemId: string, status: string) =>
    unwrap(await api.patch(`/salao/kds/itens/${itemId}/status`, { status })),
};
