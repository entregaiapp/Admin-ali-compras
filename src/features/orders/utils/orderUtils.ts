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

const toNumber = (value: unknown) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const getOrderItemName = (item: any) => {
  const name =
    firstText(item?.nome_produto, item?.produto?.nome, item?.name) ||
    "Produto não informado";
  const variation = firstText(item?.nome_variacao);

  return variation ? `${name} - ${variation}` : name;
};

export const getOrderItemConfigurationLines = (item: any) => {
  const lines: string[] = [];
  const variation = firstText(item?.nome_variacao);
  if (variation) lines.push(`Tamanho: ${variation}`);

  const selections = Array.isArray(item?.selecoes) ? item.selecoes : [];
  selections.forEach((selection: any) => {
    const group = firstText(selection?.nome_grupo);
    const option = firstText(selection?.nome_opcao);
    if (!option) return;
    const quantity = toNumber(selection?.quantidade);
    const fraction = toNumber(selection?.fracao);
    const suffix = [
      quantity > 1 ? `x${quantity}` : "",
      fraction > 0 ? `${Math.round(fraction * 100)}%` : "",
    ].filter(Boolean).join(", ");
    lines.push(`${group ? `${group}: ` : ""}${option}${suffix ? ` (${suffix})` : ""}`);
  });

  return lines;
};

export const getOrderItemQuantity = (item: any) =>
  toNumber(item?.quantidade ?? item?.quantity ?? item?.qty);

export const getOrderItemUnitPrice = (item: any) =>
  toNumber(item?.preco_unitario ?? item?.price_unit ?? item?.price);

export const getOrderItemTotal = (item: any) => {
  const recordedTotal = item?.preco_total;
  if (recordedTotal !== null && recordedTotal !== undefined) {
    return toNumber(recordedTotal);
  }

  return getOrderItemUnitPrice(item) * getOrderItemQuantity(item);
};

export const getOrderItemChecklistId = (item: any, index: number) =>
  String(item?.id || item?.produto_id || `${getOrderItemName(item)}-${index}`);

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

export const isApprovedPayment = (payment: any) =>
  Boolean(payment?.pago_em || payment?.paidAt) ||
  cleanText(payment?.status).toLowerCase() === "aprovado";

const getPaymentOnDeliveryMethod = (payment: any) =>
  cleanText(
    payment?.pagamento_entrega_tipo ||
      payment?.paymentOnDeliveryMethod ||
      payment?.metadata?.pagamento_entrega_tipo,
  ).toLowerCase();

const isPaymentOnDelivery = (payment: any) => {
  const method = cleanText(payment?.forma_pagamento || payment?.method).toLowerCase();
  const metadataType = cleanText(payment?.metadata?.tipo).toLowerCase();
  const hasGateway = Boolean(payment?.gateway || payment?.gateway_pagamento_id || payment?.gatewayPaymentId);
  const cardWithoutGateway = ["cartao_credito", "cartao_debito"].includes(method) && !hasGateway;
  return (
    method === "dinheiro" ||
    metadataType === "pagamento_entrega" ||
    cardWithoutGateway ||
    ["dinheiro", "cartao"].includes(getPaymentOnDeliveryMethod(payment))
  );
};

export const isPendingCashPayment = (payment: any) =>
  isPaymentOnDelivery(payment) && cleanText(payment?.status).toLowerCase() === "pendente";

export const getPreferredOrderPayment = (order: any, payments: any[] = []) =>
  payments.find(isApprovedPayment) ||
  payments[0] ||
  order?.pagamento ||
  null;

export const isOrderPaid = (order: any, payments: any[] = []) =>
  payments.some(isApprovedPayment) ||
  isApprovedPayment(order?.pagamento) ||
  cleanText(order?.payment_status).toLowerCase() === "aprovado";

export const isOrderPendingCash = (order: any, payments: any[] = []) =>
  payments.some(isPendingCashPayment) || isPendingCashPayment(order?.pagamento) || isPendingCashPayment(order);

export const getOrderPaymentMethod = (order: any, payment?: any) => {
  const paymentOnDeliveryMethod = cleanText(
    getPaymentOnDeliveryMethod(payment) ||
      getPaymentOnDeliveryMethod(order?.pagamento) ||
      order?.pagamento?.paymentOnDeliveryMethod,
  ).toLowerCase();
  const method = firstText(
    payment?.forma_pagamento,
    payment?.metodo,
    payment?.method,
    order?.pagamento?.forma_pagamento,
    order?.pagamento?.metodo,
    order?.payment,
  );

  if (cleanText(method).toLowerCase() === "dinheiro" && paymentOnDeliveryMethod === "cartao") {
    return "Cartão";
  }

  return formatPaymentMethod(method);
};

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
    courier?.automovel ||
    courier?.veiculo ||
    courier?.vehicle ||
    courier?.tipo_veiculo ||
    courier?.tipoVeiculo ||
    courier?.vehicleType;

  if (!vehicle) return "Veículo não informado";

  if (typeof vehicle === "string") {
    return vehicle.replace(/_/g, " ");
  }

  return [vehicle.marca, vehicle.modelo, vehicle.placa].filter(Boolean).join(" · ") ||
    vehicle.nome || vehicle.name || vehicle.tipo || vehicle.type || "Veículo não informado";
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
  if (!message) return fallback;

  if (/no active delivery area found for order/i.test(message)) {
    const orderLabel = message.match(/order\s+(.+)$/i)?.[1];
    return `Nenhuma área de entrega ativa encontrada para o pedido${orderLabel ? ` ${orderLabel}` : ""}.`;
  }

  if (/the following orders are already part of an active route/i.test(message)) {
    return "Um ou mais pedidos selecionados já fazem parte de uma entrega ativa.";
  }

  if (/the following orders already have a delivery registered/i.test(message)) {
    return "Um ou mais pedidos selecionados já possuem entrega registrada.";
  }

  return message;
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
