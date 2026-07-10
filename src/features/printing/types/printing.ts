export type PrintAgent = {
  id: string;
  loja_id: string;
  nome: string;
  device_id: string;
  platform?: string | null;
  app_version?: string | null;
  last_seen_at?: string | null;
  revoked_at?: string | null;
  online?: boolean;
};

export type Printer = {
  id: string;
  loja_id: string;
  print_agent_id: string;
  device_name: string;
  display_name: string;
  description?: string | null;
  paper_width_mm: 58 | 80;
  sector: "COZINHA" | "BAR" | "CAIXA" | "EXPEDICAO" | "GERAL";
  is_default: boolean;
  active: boolean;
  last_seen_at?: string | null;
};

export type PairingCode = {
  id: string;
  code: string;
  expires_at: string;
  ttl_minutes: number;
  environment: string;
};
