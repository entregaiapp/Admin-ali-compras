import api from '@/shared/lib/api';

export type CashStatus = 'aberto' | 'fechado';
export type CashMovementType = 'sangria' | 'suprimento' | 'despesa_rapida';

export type CashSummary = {
  valor_inicial: number;
  vendas_dinheiro: number;
  vendas_pix: number;
  vendas_cartao_debito: number;
  vendas_cartao_credito: number;
  suprimentos_total: number;
  sangrias_total: number;
  despesas_total: number;
  total_esperado: number;
  saldo_dinheiro_esperado: number;
  pedidos_rastreados: number;
  pedidos_cancelados: number;
  pedidos_total_bruto: number;
};

export type CashRegister = {
  id: string;
  loja_id: string;
  operador_nome?: string | null;
  status: CashStatus;
  valor_inicial: number;
  observacao_abertura?: string | null;
  aberto_em: string;
  fechado_em?: string | null;
  fechado_por_nome?: string | null;
  total_esperado: number;
  saldo_dinheiro_esperado: number;
  total_informado?: number | null;
  diferenca_total: number;
  diferenca_dinheiro: number;
  diferenca_pix: number;
  diferenca_cartao_debito: number;
  diferenca_cartao_credito: number;
  divergencia_status: 'sem_divergencia' | 'pendente' | 'justificada';
  fechamento_observacao?: string | null;
  divergencia_justificativa?: string | null;
  resumo?: CashSummary;
};

export type CurrentCashResponse = {
  status: CashStatus;
  loja_id: string;
  filial_nome: string;
  pedidos_disponiveis?: number;
  caixa?: CashRegister;
};

export type AvailableCashOrder = {
  id: string;
  numero_pedido: string;
  cliente_nome: string;
  status: string;
  tipo_pedido: string;
  total: number;
  realizado_em: string;
  formas_pagamento?: string[];
};

export type CashMovement = {
  tipo_registro: 'pedido' | 'manual';
  id: string;
  pedido_id?: string | null;
  numero_pedido?: string | null;
  pedido_status?: string | null;
  cliente_nome?: string | null;
  criado_em: string;
  total_pedido?: number | null;
  valor: number;
  forma_pagamento: string;
  origem_inclusao: string;
  motivo?: string | null;
};

export type PaginatedCash<T> = {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

const unwrap = <T>(response: any): T => response.data.data;

export const cashService = {
  async current() {
    return unwrap<CurrentCashResponse>(await api.get('/caixa-operacional/atual'));
  },

  async availableOrders() {
    return unwrap<AvailableCashOrder[]>(await api.get('/caixa-operacional/pedidos-disponiveis'));
  },

  async open(payload: {
    valor_inicial: number;
    observacao?: string | null;
    pedido_ids?: string[];
    incluir_todos_disponiveis?: boolean;
  }) {
    return unwrap<CashRegister>(await api.post('/caixa-operacional/abrir', payload));
  },

  async movements(cashId: string) {
    return unwrap<CashMovement[]>(await api.get(`/caixa-operacional/${cashId}/movimentacoes`));
  },

  async createMovement(cashId: string, payload: {
    tipo: CashMovementType;
    valor: number;
    motivo: string;
    responsavel_nome?: string | null;
  }) {
    return unwrap<{ movimento: CashMovement; caixa: CashRegister }>(
      await api.post(`/caixa-operacional/${cashId}/movimentacoes`, payload)
    );
  },

  async close(cashId: string, payload: {
    dinheiro: number;
    pix: number;
    cartao_debito: number;
    cartao_credito: number;
    observacao?: string | null;
  }) {
    return unwrap<CashRegister>(await api.post(`/caixa-operacional/${cashId}/fechar`, payload));
  },

  async closures() {
    return unwrap<PaginatedCash<CashRegister>>(await api.get('/caixa-operacional/fechamentos'));
  },

  async divergences(status?: 'pendente' | 'justificada') {
    return unwrap<PaginatedCash<CashRegister>>(
      await api.get('/caixa-operacional/divergencias', { params: { status } })
    );
  },

  async justify(cashId: string, justificativa: string) {
    return unwrap<CashRegister>(await api.patch(`/caixa-operacional/${cashId}/divergencia`, { justificativa }));
  },
};
