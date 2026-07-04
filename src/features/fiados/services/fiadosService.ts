import api from "@/shared/lib/api";

const unwrap = (response: any) => response?.data?.data ?? response?.data;

export type FiadoFilters = {
  page?: number;
  per_page?: number;
  busca?: string;
  status?: string;
  pagou_no_periodo?: boolean;
  data_inicio?: string;
  data_fim?: string;
};

export type FiadoReceiptPayload = {
  valor: number;
  forma_pagamento: string;
  observacao?: string;
  pedido_ids?: string[];
};

export const fiadosService = {
  async dashboard(params: Pick<FiadoFilters, "data_inicio" | "data_fim"> = {}) {
    return unwrap(await api.get("/fiados/dashboard", { params }));
  },

  async list(params: FiadoFilters = {}) {
    return unwrap(await api.get("/fiados", { params: { per_page: 20, ...params } }));
  },

  async details(contatoId: string, params: Pick<FiadoFilters, "data_inicio" | "data_fim"> = {}) {
    return unwrap(await api.get(`/fiados/${contatoId}`, { params }));
  },

  async receive(contatoId: string, payload: FiadoReceiptPayload) {
    return unwrap(await api.post(`/fiados/${contatoId}/recebimentos`, payload));
  },
};
