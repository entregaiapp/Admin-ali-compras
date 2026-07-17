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

export type ConfigurableItemsPrintLayout = {
  uppercase_product: boolean;
  show_variation: boolean;
  variation_label: string;
  uppercase_variation: boolean;
  show_group_titles: boolean;
  uppercase_group_titles: boolean;
  uppercase_options: boolean;
  show_fractions: boolean;
  fraction_format: "symbol";
  show_option_quantities: boolean;
  show_configuration_divider: boolean;
  observation_style: "box" | "highlight" | "plain";
  observation_title: string;
  uppercase_observation: boolean;
  font_scale: "compact" | "normal" | "large";
};

export type PrinterLayoutSettings = {
  configurable_items?: Partial<ConfigurableItemsPrintLayout>;
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
  layout_settings?: PrinterLayoutSettings;
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

export type PairingCode = {
  id: string;
  code: string;
  expires_at: string;
  ttl_minutes: number;
  environment: string;
};
