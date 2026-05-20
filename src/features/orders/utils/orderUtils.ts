import { statusLabels } from '@/features/orders/constants';
export { getApiList } from '@/shared/utils/apiData';

const EMPTY_TEXT_VALUES = new Set(["null", "undefined", "nan"]);

export const cleanText = (value: unknown) => {
  if (value === null || value === undefined) return "";

  const text = String(value).trim();
  if (!text) return "";

  const normalized = text.toLowerCase();
  if (EMPTY_TEXT_VALUES.has(normalized)) return "";

  const meaningful = normalized
    .split(/[\s,.-]+/)
    .filter(Boolean)
    .some((part) => !EMPTY_TEXT_VALUES.has(part));

  return meaningful ? text : "";
};

export const firstText = (...values: unknown[]) => {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }

  return "";
};

export const extractBairro = (address: string) => {
  const text = cleanText(address);
  if (!text) return "Não informado";

  const parts = text.split(/[–-]/).map(cleanText).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : "Não informado";
};

export const getBackendStatus = (status: string) => {
  const mapped = Object.entries(statusLabels).find(
    ([, label]) => label === status,
  );
  if (mapped) return mapped[0];

  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_");
};

export const canChangeDeliveryCourier = (delivery: any) =>
  !delivery || ["aguardando", "atribuida"].includes(delivery.status);

export const isDeliveryOrder = (order: any) =>
  (order?.tipo_pedido || order?.type || "").toLowerCase() === "entrega";

export const getOrderNeighborhood = (order: any) =>
  firstText(
    order.endereco_cliente?.bairro,
    order.bairro,
    order.neighborhood,
    extractBairro(order.address || ""),
  ) || "Não informado";

export const getOrderAddress = (order: any) => {
  const address = order.endereco_cliente;
  if (address) {
    const street = firstText(address.logradouro, address.rua, address.street);
    const number = firstText(address.numero, address.number);
    const complement = firstText(address.complemento, address.complement);
    const city = firstText(address.cidade, address.city);
    const state = firstText(address.estado, address.state);
    const cityState = [city, state].filter(Boolean).join(" - ");
    const line = [
      [street, number].filter(Boolean).join(", "),
      complement,
      cityState,
    ]
      .filter(Boolean)
      .join(" - ");

    if (line) return line;
  }

  return firstText(order.address, order.endereco) || "Endereço não informado";
};

export const getOrderStreetAddress = (order: any) => {
  const address = order.endereco_cliente;
  if (address) {
    const street = firstText(address.logradouro, address.rua, address.street);
    const number = firstText(address.numero, address.number);
    const complement = firstText(address.complemento, address.complement);
    const line = [[street, number].filter(Boolean).join(", "), complement]
      .filter(Boolean)
      .join(" - ");

    if (line) return line;
  }

  const fallback = firstText(order.address, order.endereco);
  return fallback ? fallback.split(/[–-]/)[0].trim() : "Endereço não informado";
};

export const formatPaymentMethod = (value: unknown) => {
  const method = cleanText(value).toLowerCase();
  const labels: Record<string, string> = {
    pix: "PIX",
    cartao_credito: "Cartão de crédito",
    cartao_debito: "Cartão de débito",
    dinheiro: "Dinheiro",
  };

  if (!method) return "Não informado";
  return labels[method] || method.replace(/_/g, " ").replace(/^\w/, (char) => char.toUpperCase());
};

export const formatPaymentStatus = (value: unknown) => {
  const status = cleanText(value).toLowerCase();
  const labels: Record<string, string> = {
    pendente: "Pendente",
    em_processamento: "Em processamento",
    aprovado: "Aprovado",
    rejeitado: "Rejeitado",
    cancelado: "Cancelado",
    estornado: "Estornado",
    expirado: "Expirado",
    confirmado: "Confirmado",
  };

  if (!status) return "Não informado";
  return labels[status] || status.replace(/_/g, " ").replace(/^\w/, (char) => char.toUpperCase());
};

export const getOrderPaymentMethod = (order: any, payment?: any) =>
  formatPaymentMethod(
    firstText(
      payment?.forma_pagamento,
      payment?.metodo,
      payment?.method,
      order?.pagamento?.forma_pagamento,
      order?.pagamento?.metodo,
      order?.payment,
    ),
  );

export const getOrderPaymentStatus = (order: any, payment?: any) =>
  formatPaymentStatus(
    firstText(
      payment?.status,
      order?.pagamento?.status,
      order?.payment_status,
    ),
  );

export const getDeliveryLabel = (route: any) => {
  if (route.status === "completed") return "Concluída";
  if (route.status === "canceled") return "Cancelada";
  if (!route.optimized) return "Aguardando rota";
  if (route.status === "in_progress") return "Em andamento";
  return "Rota gerada";
};

export const getCourierVehicleLabel = (courier: any) => {
  const vehicle =
    courier?.veiculo ||
    courier?.vehicle ||
    courier?.tipo_veiculo ||
    courier?.tipoVeiculo ||
    courier?.vehicleType;

  if (!vehicle) return "Veículo não informado";

  if (typeof vehicle === "string") {
    return vehicle.replace(/_/g, " ");
  }

  return vehicle.nome || vehicle.name || vehicle.tipo || vehicle.type || "Veículo não informado";
};

export const getApiErrorMessage = (error: any, fallback: string) => {
  const payload = error?.response?.data;
  const candidates = [
    payload?.message,
    payload?.error?.message,
    payload?.error,
    error?.message,
  ];

  const message = candidates.find((value) => typeof value === "string" && value.trim());
  return message || fallback;
};

export const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return `rgba(18, 42, 76, ${alpha})`;

  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
