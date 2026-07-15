export const PRIMARY = "#122a4c";
export const CREATE_ORDER_SHORTCUT_PARAM = "criarPedido";

export const statusColor: Record<string, { bg: string; text: string }> = {
  Recebido: { bg: "#fffbeb", text: "#d97706" },
  pendente: { bg: "#fffbeb", text: "#d97706" },
  Confirmado: { bg: "#eff6ff", text: "#2563eb" },
  confirmado: { bg: "#eff6ff", text: "#2563eb" },
  "Em Separação": { bg: "#f5f3ff", text: "#7c3aed" },
  em_separacao: { bg: "#f5f3ff", text: "#7c3aed" },
  Pronto: { bg: "#ecfeff", text: "#0891b2" },
  pronto: { bg: "#ecfeff", text: "#0891b2" },
  "Saiu para Entrega": { bg: "#fff7ed", text: "#ea580c" },
  saiu_para_entrega: { bg: "#fff7ed", text: "#ea580c" },
  Entregue: { bg: "#f0fdf4", text: "#16a34a" },
  entregue: { bg: "#f0fdf4", text: "#16a34a" },
  "Não entregue": { bg: "#fef2f2", text: "#dc2626" },
  nao_entregue: { bg: "#fef2f2", text: "#dc2626" },
  Cancelado: { bg: "#fef2f2", text: "#dc2626" },
  cancelado: { bg: "#fef2f2", text: "#dc2626" },
};

export const statusLabels: Record<string, string> = {
  pendente: "Recebido",
  confirmado: "Confirmado",
  em_separacao: "Em Separação",
  pronto: "Pronto",
  saiu_para_entrega: "Saiu para Entrega",
  entregue: "Entregue",
  nao_entregue: "Não entregue",
  cancelado: "Cancelado",
};

export const bairroColors = [
  { bg: "#e0f2fe", border: "#7dd3fc", text: "#0c4a6e", dot: "#0284c7" },
  { bg: "#ecfdf5", border: "#86efac", text: "#166534", dot: "#16a34a" },
  { bg: "#ede9fe", border: "#c4b5fd", text: "#5b21b6", dot: "#7c3aed" },
  { bg: "#fff7ed", border: "#fdba74", text: "#9a3412", dot: "#f97316" },
  { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", dot: "#dc2626" },
  { bg: "#ecfeff", border: "#67e8f9", text: "#0f766e", dot: "#06b6d4" },
  { bg: "#fefce8", border: "#fde68a", text: "#713f12", dot: "#f59e0b" },
  { bg: "#f8fafc", border: "#cbd5e1", text: "#0f172a", dot: "#334155" },
];

export const allStatuses = [
  "Todos",
  "Recebido",
  "Confirmado",
  "Em Separação",
  "Pronto",
  "Saiu para Entrega",
  "Entregue",
  "Não entregue",
  "Cancelado",
];

export const statusFlow = [
  "Recebido",
  "Confirmado",
  "Em Separação",
  "Pronto",
  "Saiu para Entrega",
  "Entregue",
];

export const frontendToBackendStatus: Record<string, string | undefined> = {
  Todos: undefined,
  Recebido: "pendente",
  Confirmado: "confirmado",
  "Em Separação": "em_separacao",
  Pronto: "pronto",
  "Saiu para Entrega": "saiu_para_entrega",
  Entregue: "entregue",
  "Não entregue": "nao_entregue",
  Cancelado: "cancelado",
};
