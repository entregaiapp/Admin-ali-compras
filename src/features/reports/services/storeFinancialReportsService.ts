import api from '@/shared/lib/api';

export type FinancialReference = 'payment' | 'order';
export type OrderSource = 'CUSTOMER_APP' | 'ADMIN' | 'SALON' | 'UNKNOWN';
export type CaptureChannel = 'ONLINE_GATEWAY' | 'EXTERNAL_OR_OFFLINE' | 'CREDIT_TAB';
export type PaymentMethod = 'PIX' | 'CARD' | 'CASH' | 'CREDIT_TAB';
export type FinancialStatus = 'RECEIVED' | 'PENDING' | 'REFUNDED' | 'CANCELED' | 'REJECTED' | 'EXPIRED' | 'UNDEFINED';

export type StoreFinancialFilters = {
  dataInicio: string;
  dataFim: string;
  dateType: FinancialReference;
  orderSource?: OrderSource | '';
  captureChannel?: CaptureChannel | '';
  paymentMethod?: PaymentMethod | '';
  financialStatus?: FinancialStatus | '';
};

export type MoneyBucket = {
  valor_registrado: number;
  valor_recebido: number;
  valor_pendente: number;
  valor_liquido_recebido: number;
  taxas_gateway: number;
  valor_estornado: number;
  valor_cancelado: number;
  valor_rejeitado: number;
  valor_expirado: number;
  valor_fiado: number;
};

export type LabeledMoneyBucket = MoneyBucket & {
  key: string;
  label: string;
};

export type ChannelMatrixRow = MoneyBucket & {
  order_source: OrderSource;
  payment_capture_channel: CaptureChannel;
  payment_method: PaymentMethod;
};

export type PlatformMoney = {
  base_elegivel: number;
  taxa_calculada: number;
  taxa_estornada: number;
  taxa_liquida: number;
  split_recebido: number;
  split_pendente: number;
  valor_a_cobrar: number;
  diferenca_conciliacao: number;
};

export type StoreFinancialDashboard = {
  periodo: {
    data_inicio: string | null;
    data_fim: string | null;
    referencia: FinancialReference;
    time_zone: string;
  };
  resumo: MoneyBucket & {
    fiado_recebido: number;
    total_efetivamente_recebido: number;
  };
  por_origem: LabeledMoneyBucket[];
  por_canal_captura: LabeledMoneyBucket[];
  por_situacao: LabeledMoneyBucket[];
  matriz_canais: ChannelMatrixRow[];
  evolucao_diaria: Array<{
    data: string;
    app: number;
    admin: number;
    salao: number;
    desconhecido: number;
    online: number;
    offline: number;
    fiado: number;
  }>;
  evolucao_percentual_pedidos: Array<{
    data: string;
    quantidade_app: number;
    quantidade_admin: number;
    total_pedidos: number;
    percentual_app: number;
    percentual_admin: number;
  }>;
  taxa_plataforma: {
    resumo: PlatformMoney;
    por_loja: Array<PlatformMoney & {
      loja_id: string;
      loja_nome: string;
      regra_split: null | {
        nome?: string | null;
        tipo_valor: 'percentual' | 'fixo';
        valor: number;
      };
    }>;
  };
  fiado: {
    valor_lancado: number;
    saldo_pendente: number;
    valor_recebido: number;
    valor_sem_origem: number;
    recebimentos_por_metodo: Array<{
      payment_method: PaymentMethod;
      valor_recebido: number;
    }>;
  };
  alertas: {
    origem_desconhecida: number;
    canal_indefinido: number;
    metodo_indefinido: number;
    fiado_sem_origem: number;
    diferenca_conciliacao: number;
  };
  gerado_em: string;
};

export const storeFinancialReportsService = {
  async get(filters: StoreFinancialFilters) {
    const response = await api.get<{ success: boolean; data: StoreFinancialDashboard }>('/financeiro/admin/relatorios', {
      params: {
        dataInicio: filters.dataInicio,
        dataFim: filters.dataFim,
        dateType: filters.dateType,
        order_source: filters.orderSource || undefined,
        payment_capture_channel: filters.captureChannel || undefined,
        payment_method: filters.paymentMethod || undefined,
        financial_status: filters.financialStatus || undefined,
      },
    });
    return response.data.data;
  },
};
