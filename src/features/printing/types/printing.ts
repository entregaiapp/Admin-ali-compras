export type PrintAgent = {
  id: string;
  loja_id: string;
  nome: string;
  device_id: string;
  platform?: string | null;
  app_version?: string | null;
  last_seen_at?: string | null;
  active?: boolean;
  paused_at?: string | null;
  revoked_at?: string | null;
  operational_status?: "online" | "offline" | "inactive" | "suspended_schedule" | "revoked" | string;
  next_open_at?: string | null;
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
  channels?: PrintSource[];
  is_default: boolean;
  active: boolean;
  last_seen_at?: string | null;
};

export type PrintSource = "delivery" | "retirada" | "salao" | "admin" | "mesa";

export type PrintAutomationSetting = {
  source: "delivery" | "retirada" | "admin";
  auto_print_paid: boolean;
  move_to_preparation: boolean;
};

export type UserPrinterPreference = {
  id?: string;
  loja_id?: string;
  usuario_id: string;
  printer_id: string | null;
  usuario_nome?: string;
  usuario_email?: string;
  usuario_perfil?: string;
  printer_name?: string;
  printer_device_name?: string;
};

export type UserPrinterReadiness = {
  assigned: boolean;
  available: boolean;
  requires_resume: boolean;
  operational_status: "unassigned" | "ready" | "inactive" | "suspended_schedule";
  reason: "inactive" | "suspended_schedule" | null;
  printer: {
    id: string;
    display_name: string;
    device_name: string;
  } | null;
  agent: {
    id: string;
    name: string | null;
  } | null;
};

export type PairingCode = {
  id: string;
  code: string;
  expires_at: string;
  ttl_minutes: number;
  environment: string;
};
