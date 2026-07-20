import api from '@/shared/lib/api';

export interface DeliveryPaymentBillingReport {
  id: string;
  versao_calculo?: number;
  loja: {
    id: string;
    nome: string;
    cnpj?: string | null;
  };
  periodo: {
    data_inicio: string;
    data_fim: string;
    time_zone: string;
    referencia?: 'payment' | 'order';
  };
  filtros?: {
    dateType?: 'payment' | 'order';
    order_source?: string[] | null;
    payment_capture_channel?: string[] | null;
    payment_method?: string[] | null;
    financial_status?: string[] | null;
  };
  regra_split: null | {
    id: string;
    nome: string;
    gateway: string;
    tipo_valor: string;
    valor: number;
  };
  resumo: {
    quantidade_pedidos_clientes: number;
    quantidade_pedidos_manuais: number;
    quantidade_pedidos_fiados?: number;
    quantidade_pedidos_salao?: number;
    quantidade_pedidos_total: number;
    valor_bruto_clientes: number;
    valor_bruto_manuais: number;
    valor_bruto_total: number;
    valor_final_cobranca: number;
    financeiro?: Record<string, number>;
    taxa_plataforma?: {
      base_elegivel: number;
      taxa_calculada: number;
      taxa_estornada: number;
      taxa_liquida: number;
      split_recebido: number;
      split_pendente: number;
      valor_a_cobrar: number;
      diferenca_conciliacao: number;
    };
  };
  categorias?: Array<{
    categoria: string;
    label: string;
    quantidade_pedidos: number;
    quantidade_cobrada: number;
    valor_bruto: number;
    valor_cobranca: number;
  }>;
  dias: Array<{
    data: string;
    quantidade_pedidos_clientes: number;
    quantidade_pedidos_manuais: number;
    quantidade_pedidos_fiados?: number;
    quantidade_pedidos_salao?: number;
    quantidade_pedidos_total: number;
    valor_bruto_total: number;
    valor_a_receber: number;
    taxa_calculada?: number;
    taxa_estornada?: number;
    taxa_liquida?: number;
    split_recebido?: number;
    split_pendente?: number;
    diferenca_conciliacao?: number;
  }>;
  pedidos: Array<{
    id: string;
    numero_pedido: string;
    data: string;
    realizado_em: string;
    status: string;
    origem_relatorio: string;
    categoria_cobranca?: string;
    categoria_cobranca_label?: string;
    contabiliza_plataforma: boolean;
    forma_pagamento?: string | null;
    pagamento_entrega_tipo: string;
    pedido_fiado?: boolean;
    aplicado_taxa?: boolean;
    total: number;
    valor_cobranca: number;
    order_source?: string;
    fulfillment_type?: string;
    data_referencia?: string | null;
    payment_methods?: string[];
    payment_capture_channels?: string[];
    financial_statuses?: string[];
    valor_pagamentos_selecionados?: number;
    taxa_calculada?: number;
    taxa_estornada?: number;
    taxa_liquida?: number;
    split_recebido?: number;
    split_pendente?: number;
    valor_a_cobrar?: number;
    diferenca_conciliacao?: number;
  }>;
  gerado_por?: {
    id?: string | null;
    nome?: string | null;
  };
  gerado_em?: string;
}

const unwrap = (responseData: any) => responseData?.data ?? responseData;

export const deliveryPaymentReportsService = {
  async list() {
    const response = await api.get('/relatorios-pagamentos-entrega');
    return unwrap(response.data) as DeliveryPaymentBillingReport[];
  },

  async getById(id: string) {
    const response = await api.get(`/relatorios-pagamentos-entrega/${id}`);
    return unwrap(response.data) as DeliveryPaymentBillingReport;
  },
};
