import api from '@/shared/lib/api';

export type CashStatus = 'aberto' | 'fechado';
export type CashMovementType = 'sangria' | 'suprimento' | 'despesa_rapida';
export type CashPaymentMethod = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito';

export type OperatingShift = {
  id: string;
  dia_semana: number;
  aberto: boolean;
  nome_turno: string;
  horario_abertura: string;
  horario_fechamento: string;
};

export type AvailableCashShifts = {
  loja_id: string;
  data_operacional: string;
  turnos: OperatingShift[];
  turno_sugerido_id: string | null;
  permite_caixa_avulso: boolean;
};

export type CashSummary = {
  valor_inicial: number;
  vendas_dinheiro: number;
  vendas_pix: number;
  vendas_cartao_debito: number;
  vendas_cartao_credito: number;
  suprimentos_total: number;
  sangrias_total: number;
  despesas_total: number;
  suprimentos_dinheiro: number;
  suprimentos_pix: number;
  suprimentos_cartao_debito: number;
  suprimentos_cartao_credito: number;
  sangrias_dinheiro: number;
  sangrias_pix: number;
  sangrias_cartao_debito: number;
  sangrias_cartao_credito: number;
  despesas_dinheiro: number;
  despesas_pix: number;
  despesas_cartao_debito: number;
  despesas_cartao_credito: number;
  total_esperado: number;
  saldo_dinheiro_esperado: number;
  saldo_pix_esperado: number;
  saldo_cartao_debito_esperado: number;
  saldo_cartao_credito_esperado: number;
  pedidos_rastreados: number;
  pedidos_cancelados: number;
  pedidos_total_bruto: number;
};

export type CashFinancialSummary = {
  resumo_vendas?: {
    fiado_criado?: number;
    fiado_recebido?: number;
  };
  cobranca_plataforma_relatorio?: {
    periodo: {
      inicio: string;
      fim: string;
      referencia: 'payment' | 'order';
    };
    configuracao: {
      dateType: 'payment' | 'order';
      order_source: string[];
      payment_capture_channel: string[];
      payment_method: string[];
      financial_status: string[];
    };
    quantidade_pedidos: number;
    valor_movimentado_selecionado: number;
    taxa_calculada: number;
    taxa_estornada: number;
    taxa_liquida: number;
    split_recebido: number;
    split_pendente: number;
    valor_a_pagar_plataforma: number;
    regra_split?: {
      id: string;
      nome?: string | null;
      tipo_valor?: string | null;
      valor?: number | null;
    } | null;
  };
};

export type CashRegister = {
  id: string;
  loja_id: string;
  operador_nome?: string | null;
  turno?: {
    id: string | null;
    nome: string;
    dia_semana: number | null;
    horario_abertura: string | null;
    horario_fechamento: string | null;
  } | null;
  status: CashStatus;
  valor_inicial: number;
  observacao_abertura?: string | null;
  aberto_em: string;
  fechado_em?: string | null;
  fechado_por_nome?: string | null;
  vendas_dinheiro: number;
  vendas_pix: number;
  vendas_cartao_debito: number;
  vendas_cartao_credito: number;
  suprimentos_total: number;
  sangrias_total: number;
  despesas_total: number;
  total_esperado: number;
  saldo_dinheiro_esperado: number;
  informado_dinheiro?: number | null;
  informado_pix?: number | null;
  informado_cartao_debito?: number | null;
  informado_cartao_credito?: number | null;
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
  financeiro?: CashFinancialSummary;
};

export type CurrentCashResponse = {
  status: CashStatus;
  loja_id: string;
  filial_nome: string;
  pedidos_disponiveis?: number;
  caixa?: CashRegister;
};

export type CashDetailsResponse = {
  status: CashStatus;
  loja_id: string;
  filial_nome: string;
  caixa: CashRegister;
  financeiro: CashFinancialSummary;
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
  tipo_registro: 'pedido' | 'manual' | 'fiado_recebimento';
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
  tipo_movimentacao?: 'venda' | CashMovementType;
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

  async availableShifts() {
    return unwrap<AvailableCashShifts>(await api.get('/caixa-operacional/turnos-disponiveis'));
  },

  async open(payload: {
    turno_id?: string | null;
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

  async details(cashId: string) {
    return unwrap<CashDetailsResponse>(await api.get(`/financeiro/admin/caixas/${cashId}`));
  },

  async createMovement(cashId: string, payload: {
    tipo: CashMovementType;
    forma_pagamento: CashPaymentMethod;
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
