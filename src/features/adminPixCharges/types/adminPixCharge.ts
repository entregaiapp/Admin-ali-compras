export type AdminPixChargeState = "aguardando_dados" | "gerando" | "pendente" | "aprovado" | "expirado" | "cancelado" | "substituido" | "falha";

export type AdminPixCharge = {
  pedido_id: string;
  numero_pedido: string;
  estado: AdminPixChargeState;
  total: number;
  pedido_total?: number;
  tipo_cobranca?: "pedido_integral" | "saldo_reentrega";
  valor_cobranca?: number;
  token_expira_em: string;
  link: string;
  pagamento_atual?: {
    id: string;
    status: string;
    gateway: string;
    valor: number;
    qr_code?: string | null;
    qr_code_base64?: string | null;
    link_pagamento?: string | null;
    data_expiracao?: string | null;
  } | null;
  historico: Array<Record<string, any> & { estado: string }>;
};
