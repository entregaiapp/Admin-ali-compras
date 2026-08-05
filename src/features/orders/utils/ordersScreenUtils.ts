import { formatBrasiliaDate } from "@/shared/lib/dateTime";
import { PRIMARY, statusColor } from "@/features/orders/constants";
import type {
  OperationalOrderTabKey,
  OperationalTabAvailability,
} from "@/features/orders/services/ordersReconciliation";
import {
  getBackendStatus,
  getCurrentPaymentMethodValue,
  getOrderPaymentMethod,
  getOrderPaymentStatus,
  getPreferredOrderPayment,
  isCurrentPaymentRecord,
  isDeliveryOrder,
  isFiadoOrder,
  isOrderPaid,
  isOrderPendingCash,
} from "@/features/orders/utils/orderUtils";

export const getWhatsappPhone = (phone: any) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
};

export const buildWhatsappUrl = (phone: any, message: string) => {
  const normalizedPhone = getWhatsappPhone(phone);
  if (!normalizedPhone) return null;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};

export const getListGroupAccentColor = (groupKey: string) => {
  const colors: Record<string, string> = {
    falta_imprimir: "#dc2626",
    andamento: "#2563eb",
    cancelamentos: "#dc2626",
    saiu_para_entrega: statusColor.saiu_para_entrega?.text || "#ea580c",
    entregues: statusColor.entregue?.text || "#16a34a",
    entregues_aguardando_pagamento: "#d97706",
    nao_entregues: statusColor.nao_entregue?.text || "#dc2626",
    cancelados: statusColor.cancelado?.text || "#dc2626",
  };

  return colors[groupKey] || PRIMARY;
};

export const getOrderCustomerPhone = (order: any) =>
  order?.cliente?.telefone ||
  order?.cliente?.celular ||
  order?.cliente?.phone ||
  order?.telefone_cliente ||
  order?.customer_phone ||
  order?.customerPhone ||
  order?.phone ||
  "";

export const getCancellationRequest = (order: any) =>
  order?.solicitacao_cancelamento || null;
export const hasPendingCancellationRequest = (order: any) =>
  getCancellationRequest(order)?.status === "pendente";
export const parseCurrencyInput = (value: string) => Number(value.replace(",", "."));
export const parseCurrencyNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const text = String(value ?? "").trim();
  if (!text) return 0;

  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
};
export const formatCurrency = (value: unknown) =>
  `R$ ${parseCurrencyNumber(value)
    .toFixed(2)
    .replace(".", ",")}`;
export const getPaymentSplitGroupId = (payment: any) =>
  payment?.metadata?.grupo_pagamento_admin || payment?.grupo_pagamento_admin || "";
export const RECEIPT_PAYMENT_METHODS = new Set(["pix", "cartao_credito", "cartao_debito", "dinheiro"]);
export const getReceiptInitialMethods = (payments: any[]) => [...new Set(
  payments
    .filter(isCurrentPaymentRecord)
    .flatMap((payment) => {
      const plannedMethods = payment?.metadata?.formas_pagamento_planejadas;
      return Array.isArray(plannedMethods) && plannedMethods.length
        ? plannedMethods
        : [getCurrentPaymentMethodValue(payment)];
    })
    .map((method) => String(method || "").toLowerCase())
    .filter((method) => RECEIPT_PAYMENT_METHODS.has(method))
)];
export const getOrderPaymentMethodsLabel = (order: any, payments: any[], preferredPayment: any) => {
  const splitGroupId = getPaymentSplitGroupId(preferredPayment);
  const splitPayments = splitGroupId
    ? payments.filter((payment) =>
        getPaymentSplitGroupId(payment) === splitGroupId && isCurrentPaymentRecord(payment)
      )
    : [];

  return splitPayments.length > 1
    ? splitPayments
        .map((payment) => getOrderPaymentMethod({ pagamento: payment }, payment))
        .join(" + ")
    : getOrderPaymentMethod(order, preferredPayment);
};
export const getDailyTicketNumber = (order: any) => {
  const formatted = String(order?.numero_comanda_codigo || "").trim();
  if (formatted) return formatted;

  const numeric = Number(order?.numero_comanda_diario);
  return Number.isFinite(numeric) && numeric > 0
    ? String(numeric).padStart(5, "0")
    : "";
};
export const toCurrencyCents = (value: unknown) =>
  Math.round(parseCurrencyNumber(value) * 100);
export const firstPresent = (...values: unknown[]) =>
  values.find((value) => value !== undefined && value !== null && value !== "");
export const normalizePaymentText = (value: any) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export const getPaymentOnDeliveryMethod = (payment: any) =>
  normalizePaymentText(
    firstPresent(
      payment?.pagamento_entrega_tipo,
      payment?.paymentOnDeliveryMethod,
      payment?.metadata?.pagamento_entrega_tipo,
    ),
  );
export const isCardOnDeliveryPayment = (payment: any) =>
  getPaymentOnDeliveryMethod(payment) === "cartao";
export const calculateMissingItemsRefundAfterDiscount = (
  order: any,
  grossRefundValue: number,
  itemsSubtotal: number,
) => {
  const grossRefundInCents = toCurrencyCents(grossRefundValue);
  const subtotalInCents = toCurrencyCents(order?.subtotal || itemsSubtotal);
  const discountInCents = Math.min(
    Math.max(0, toCurrencyCents(order?.desconto)),
    Math.max(0, subtotalInCents),
  );

  if (subtotalInCents <= 0 || discountInCents <= 0) {
    return grossRefundInCents / 100;
  }

  const allocatedDiscountInCents = Math.round(
    (grossRefundInCents * discountInCents) / subtotalInCents,
  );
  return Math.max(0, grossRefundInCents - allocatedDiscountInCents) / 100;
};
export const formatCashChangeInfo = (payment: any, order?: any) => {
  const method = normalizePaymentText(
    firstPresent(
      payment?.forma_pagamento,
      payment?.metodo,
      payment?.method,
      order?.pagamento?.forma_pagamento,
      order?.pagamento?.metodo,
      order?.pagamento?.method,
      order?.payment,
    ),
  );
  const paymentOnDeliveryMethod =
    getPaymentOnDeliveryMethod(payment) ||
    getPaymentOnDeliveryMethod(order?.pagamento);
  const isCashPayment =
    method === "dinheiro" || paymentOnDeliveryMethod === "dinheiro";

  if (!isCashPayment) {
    return "";
  }

  if (
    isCardOnDeliveryPayment(payment) ||
    isCardOnDeliveryPayment(order?.pagamento)
  ) {
    return "Cobrar com cartão na entrega";
  }

  if (payment?.sem_troco === true) return "Não precisa de troco";

  if (order?.pagamento?.sem_troco === true) return "Não precisa de troco";

  const changeFor = firstPresent(
    payment?.troco_para,
    order?.pagamento?.troco_para,
    order?.troco_para,
  );

  if (changeFor !== undefined) {
    const explicitChange = firstPresent(
      payment?.troco_valor,
      order?.pagamento?.troco_valor,
      order?.troco_valor,
    );
    const orderTotal = firstPresent(
      payment?.valor,
      order?.valor_total,
      order?.total,
    );
    const changeValue =
      explicitChange !== undefined
        ? parseCurrencyNumber(explicitChange)
        : parseCurrencyNumber(changeFor) - parseCurrencyNumber(orderTotal);
    const safeChangeValue = Number.isFinite(changeValue)
      ? Math.max(0, changeValue)
      : 0;

    return `Troco para ${formatCurrency(changeFor)} · devolver ${formatCurrency(safeChangeValue)}`;
  }

  return "";
};
export const getOrderEmbeddedPayments = (order: any) =>
  Array.isArray(order?.pagamentos) ? order.pagamentos : [];
export const getCashChangeStatusLabel = (payment: any, order?: any) => {
  if (!isDeliveryOrder(order || {})) return "";
  if (isCardOnDeliveryPayment(payment) || isCardOnDeliveryPayment(order?.pagamento)) {
    return "";
  }

  const method = normalizePaymentText(
    firstPresent(
      payment?.forma_pagamento,
      payment?.metodo,
      payment?.method,
      order?.pagamento?.forma_pagamento,
      order?.pagamento?.metodo,
      order?.pagamento?.method,
      order?.payment,
    ),
  );
  const paymentOnDeliveryMethod =
    getPaymentOnDeliveryMethod(payment) ||
    getPaymentOnDeliveryMethod(order?.pagamento);
  const isCashPayment =
    method === "dinheiro" || paymentOnDeliveryMethod === "dinheiro";

  if (!isCashPayment) return "";

  const explicitChangeValue = firstPresent(
    payment?.troco_valor,
    order?.pagamento?.troco_valor,
    order?.troco_valor,
  );
  const changeFor = firstPresent(
    payment?.troco_para,
    order?.pagamento?.troco_para,
    order?.troco_para,
  );
  const orderTotal = firstPresent(
    payment?.valor,
    order?.valor_total,
    order?.total,
  );
  const changeValue =
    explicitChangeValue !== undefined
      ? parseCurrencyNumber(explicitChangeValue)
      : parseCurrencyNumber(changeFor) - parseCurrencyNumber(orderTotal);
  if (changeValue <= 0) return "";

  return payment?.troco_pago_ao_entregador === true ||
    order?.pagamento?.troco_pago_ao_entregador === true
    ? "Troco repassado"
    : "Falta o troco";
};
export const isPendingCardPaymentForDelivery = (order: any, payments: any[] = []) => {
  const payment = getPreferredOrderPayment(order, payments);
  const status = normalizePaymentText(getOrderPaymentStatus(order, payment));
  const method = normalizePaymentText(getOrderPaymentMethod(order, payment));
  const blockedStatuses = new Set(["aprovado", "confirmado", "rejeitado", "cancelado", "estornado", "expirado"]);
  return (
    !isOrderPaid(order, payments) &&
    !blockedStatuses.has(status) &&
    (method.includes("cartao") ||
      isCardOnDeliveryPayment(payment) ||
      isCardOnDeliveryPayment(order?.pagamento))
  );
};
export const hasPendingPaymentForDisplay = (order: any, payments: any[] = []) => {
  if (isOrderPaid(order, payments)) return false;
  if (order?.has_admin_pix_charge === true) return true;

  const payment = getPreferredOrderPayment(order, payments);
  return (
    normalizePaymentText(getOrderPaymentStatus(order, payment)) === "pendente" ||
    isOrderPendingCash(order, payments) ||
    isPendingCardPaymentForDelivery(order, payments)
  );
};
export const canOrderProceedForFulfillment = (order: any, payments: any[] = []) =>
  isOrderPaid(order, payments) ||
  isFiadoOrder(order, payments) ||
  isOrderPendingCash(order, payments) ||
  isPendingCardPaymentForDelivery(order, payments);
export const DELIVERY_ASSIGNMENT_BLOCKED_STATUSES = new Set([
  "entregue",
  "nao_entregue",
  "cancelado",
]);
export const ACTIVE_WORK_STATUS_KEYS = [
  "pendente",
  "confirmado",
  "em_separacao",
  "pronto",
];
export const REFUND_ACTIVE_STATUSES = new Set(["pendente", "processando", "aprovado"]);
export const ORDER_TABS = [
  { value: "Entrega", label: "Delivery" },
  { value: "Retirada", label: "Retirada" },
  { value: "Salao", label: "Salão" },
] as const;
export type OrderTab = (typeof ORDER_TABS)[number]["value"];
export type OperationalTabCache = {
  orders: any[];
  nextCursor: string | null;
  hasMore: boolean;
  firstPageIds: string[];
};
export const OPERATIONAL_TAB_DEFINITIONS: Array<{
  key: OperationalOrderTabKey;
  title: string;
  description: string;
  defaultExpanded: boolean;
}> = [
  { key: "falta_imprimir", title: "Falta imprimir", description: "Pedidos do app aguardando impressão da comanda", defaultExpanded: true },
  { key: "andamento", title: "Em andamento", description: "Recebidos, confirmados, em separação e prontos", defaultExpanded: true },
  { key: "cancelamentos", title: "Cancelamentos para análise", description: "Pedidos bloqueados até a decisão da loja", defaultExpanded: true },
  { key: "saiu_para_entrega", title: "Saiu para entrega", description: "Pedidos em rota com entregador", defaultExpanded: false },
  { key: "entregues", title: "Entregues", description: "Finalizados prontos para arquivar", defaultExpanded: false },
  { key: "entregues_aguardando_pagamento", title: "Entregues aguardando pagamento", description: "Finalizados com pagamento pendente", defaultExpanded: false },
  { key: "nao_entregues", title: "Não entregues", description: "Pedidos com problema relatado pelo entregador", defaultExpanded: false },
  { key: "cancelados", title: "Cancelados", description: "Pedidos cancelados", defaultExpanded: false },
];
export const EMPTY_OPERATIONAL_AVAILABILITY = Object.fromEntries(
  OPERATIONAL_TAB_DEFINITIONS.map(({ key }) => [key, { disponivel: false, total: 0 }]),
) as OperationalTabAvailability;
export type ArchivedOrderTypeFilter = "Todos" | OrderTab;
export type ArchivedDailySummary = {
  date: string;
  count: number;
  total: number;
};
export const getPreferredArchivedDayKey = (
  summary: Array<{ date: string }>,
  currentKey = "",
) => {
  const todayKey = getDateKey(new Date());
  const currentKeyExists = summary.some((item) => item.date === currentKey);
  return (
    summary.find((item) => item.date === todayKey)?.date ||
    (currentKeyExists ? currentKey : "") ||
    summary[0]?.date ||
    currentKey
  );
};
export type OrderType = "entrega" | "retirada" | "salao";
export type OrderCounterKey = OrderType;
export type QuickOrderFilter = "delayed" | "pending" | null;
export const getOrderType = (order: any): OrderType => {
  const type = String(order?.tipo_pedido || order?.type || "").toLowerCase();
  return type === "salao" || type === "retirada" ? type : "entrega";
};
export const getOrderTypeLabel = (order: any) => ({
  entrega: "Entrega",
  retirada: "Retirada",
  salao: "Salão",
})[getOrderType(order)];

export const formatElapsedOrderTime = (elapsedMinutes: number) => {
  const safeMinutes = Math.max(0, Math.floor(elapsedMinutes));
  if (safeMinutes < 1) return "menos de 1 min";
  if (safeMinutes < 60) return `${safeMinutes} min`;

  if (safeMinutes >= 1_440) {
    const days = Math.floor(safeMinutes / 1_440);
    const remainingHours = Math.floor((safeMinutes % 1_440) / 60);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
};

export const interpolateColor = (start: [number, number, number], end: [number, number, number], amount: number) => {
  const ratio = Math.min(1, Math.max(0, amount));
  const channel = (index: number) => Math.round(start[index] + (end[index] - start[index]) * ratio);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
};

export const getWaitingTimeColor = (elapsedMinutes: number, averageDeliveryMinutes: number) => {
  const safeLimit = Math.max(1, averageDeliveryMinutes);
  const progress = Math.min(1, Math.max(0, elapsedMinutes / safeLimit));
  const blue: [number, number, number] = [37, 99, 235];
  const amber: [number, number, number] = [217, 119, 6];
  const red: [number, number, number] = [220, 38, 38];

  return progress < 0.7
    ? interpolateColor(blue, amber, progress / 0.7)
    : interpolateColor(amber, red, (progress - 0.7) / 0.3);
};

export const getTransparentRgb = (color: string, opacity: number) =>
  color.replace("rgb(", "rgba(").replace(")", `, ${opacity})`);

export const getSalaoComandaStatus = (order: any) =>
  String(order?.salao_comanda?.status || order?.comanda?.status || "").toLowerCase();
export const canTakeSalaoOrderToTable = (order: any) =>
  getOrderType(order) === "salao" &&
  getBackendStatus(order?.status || "") === "pronto" &&
  getSalaoComandaStatus(order) === "aberta";
export const canForceFinalizeOrder = (order: any) =>
  Boolean(order?.id) && getBackendStatus(order?.status || "") !== "entregue";
export const canQuickArchiveOrder = (order: any) =>
  Boolean(order?.id) &&
  !order?.arquivado &&
  getBackendStatus(order?.status || "") === "entregue";
export const EMPTY_ADMIN_ORDER_ADDRESS = {
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  ponto_referencia: "",
  area_entrega_id: "",
};
export const normalizeDeliveryArea = (area: any) => ({
  ...area,
  bairro: String(area?.bairro || area?.nome || "").trim(),
  cidade: String(area?.cidade || "").trim(),
  estado: String(area?.estado || "").trim().toUpperCase(),
  taxa_entrega: Math.max(0, Number(area?.taxa_entrega || 0)),
  ativa: area?.ativa !== false,
});
export const getDeliveryAreaLabel = (area: any) =>
  [
    area.bairro,
    area.cidade ? `${area.cidade}${area.estado ? ` - ${area.estado}` : ""}` : "",
  ].filter(Boolean).join(" · ");
export const formatOrderDateTime = (value: Date | string) =>
  formatBrasiliaDate(value, { dateStyle: "short", timeStyle: "short" });
export const getOrderCreatedTimestamp = (order: any) =>
  order?.criado_em ||
  order?.created_at ||
  order?.realizado_em ||
  new Date();
export const getArchivedOrderTimestamp = (order: any) =>
  order?.realizado_em || getOrderCreatedTimestamp(order);
export const getValidDate = (value: any) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};
export const padDatePart = (value: number) => String(value).padStart(2, "0");
export const getDateKey = (value: any) => {
  const date = getValidDate(value);
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
};
export const formatArchivedDayLabel = (value: any) => {
  const date = getValidDate(value);
  return `[${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)}]`;
};
export const formatArchivedDayDescription = (value: any) =>
  getValidDate(value).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
export const canSelectOrderForDeliveryAssignment = (
  order: any,
  assignedOrderIds: Set<any>,
) =>
  isDeliveryOrder(order) &&
  !assignedOrderIds.has(order?.id) &&
  !hasPendingCancellationRequest(order) &&
  !DELIVERY_ASSIGNMENT_BLOCKED_STATUSES.has(
    getBackendStatus(order?.status || ""),
  );

export const isAppOrderAwaitingPrint = (order: any) => {
  const type = getOrderType(order);
  const status = getBackendStatus(order?.status || "");
  return (
    (type === "entrega" || type === "retirada") &&
    !order?.arquivado &&
    String(order?.origem_checkout || "").toLowerCase() !== "admin_dashboard" &&
    !order?.comanda_impressa_em &&
    ACTIVE_WORK_STATUS_KEYS.includes(status) &&
    !hasPendingCancellationRequest(order)
  );
};

