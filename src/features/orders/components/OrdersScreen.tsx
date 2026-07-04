import { useState, useEffect } from "react";
import type { MouseEvent } from "react";
import { useSearchParams } from "react-router";
import {
  Search,
  Eye,
  X,
  Phone,
  MapPin,
  Clock,
  CreditCard,
  User,
  Package,
  ArrowLeft,
  CircleX,
  CheckCircle2,
  MessageCircle,
  Printer,
  List,
  Archive,
  CalendarDays,
  Map as MapIcon,
  ChevronDown,
  ChevronRight,
  TruckIcon,
  Navigation,
  Loader2,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  Plus,
} from "lucide-react";
import api from "@/shared/lib/api";
import { formatBrasiliaDate } from "@/shared/lib/dateTime";
import {
  allStatuses,
  bairroColors,
  frontendToBackendStatus,
  PRIMARY,
  statusColor,
  statusFlow,
  statusLabels,
} from "@/features/orders/constants";
import { printBairroRoute, printComanda } from "@/features/orders/utils/print";
import {
  canChangeDeliveryCourier,
  getApiErrorMessage,
  getApiList,
  getBackendStatus,
  getOrderAddress,
  getOrderItemConfigurationLines,
  getOrderItemChecklistId,
  getOrderItemName,
  getOrderItemQuantity,
  getOrderItemTotal,
  getOrderNeighborhood,
  getOrderPaymentMethod,
  getOrderPaymentStatus,
  getOrderStreetAddress,
  getCurrentPaymentMethodValue,
  getPreferredOrderPayment,
  hexToRgba,
  isDeliveryOrder,
  isCurrentPaymentRecord,
  isFiadoOrder,
  isOrderPaid,
  isOrderPendingCash,
} from "@/features/orders/utils/orderUtils";
import { DeliveryAssignmentModal } from "@/features/orders/components/DeliveryAssignmentModal";
import { OrderItemsChecklistModal } from "@/features/orders/components/OrderItemsChecklistModal";
import { ManualDeliveryOrderModal } from "@/features/orders/components/ManualDeliveryOrderModal";
import { AddOrderItemsModal } from "@/features/orders/components/AddOrderItemsModal";
import { PendingPaymentMethodModal } from "@/features/orders/components/PendingPaymentMethodModal";
import { showSystemNotice } from "@/shared/components/SystemNoticeModal";
import {
  MfaApprovalModal,
  type MfaApproval,
} from "@/shared/components/MfaApprovalModal";
import { authService } from "@/features/auth/services/authService";

const getWhatsappPhone = (phone: any) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
};

const buildWhatsappUrl = (phone: any, message: string) => {
  const normalizedPhone = getWhatsappPhone(phone);
  if (!normalizedPhone) return null;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};

const getOrderCustomerPhone = (order: any) =>
  order?.cliente?.telefone ||
  order?.cliente?.celular ||
  order?.cliente?.phone ||
  order?.telefone_cliente ||
  order?.customer_phone ||
  order?.customerPhone ||
  order?.phone ||
  "";

const getCancellationRequest = (order: any) =>
  order?.solicitacao_cancelamento || null;
const hasPendingCancellationRequest = (order: any) =>
  getCancellationRequest(order)?.status === "pendente";
const parseCurrencyInput = (value: string) => Number(value.replace(",", "."));
const parseCurrencyNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const text = String(value ?? "").trim();
  if (!text) return 0;

  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
};
const formatCurrency = (value: unknown) =>
  `R$ ${parseCurrencyNumber(value)
    .toFixed(2)
    .replace(".", ",")}`;
const getDailyTicketNumber = (order: any) => {
  const formatted = String(order?.numero_comanda_codigo || "").trim();
  if (formatted) return formatted;

  const numeric = Number(order?.numero_comanda_diario);
  return Number.isFinite(numeric) && numeric > 0
    ? String(numeric).padStart(5, "0")
    : "";
};
const toCurrencyCents = (value: unknown) =>
  Math.round(parseCurrencyNumber(value) * 100);
const firstPresent = (...values: unknown[]) =>
  values.find((value) => value !== undefined && value !== null && value !== "");
const normalizePaymentText = (value: any) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const getPaymentOnDeliveryMethod = (payment: any) =>
  normalizePaymentText(
    firstPresent(
      payment?.pagamento_entrega_tipo,
      payment?.paymentOnDeliveryMethod,
      payment?.metadata?.pagamento_entrega_tipo,
    ),
  );
const isCardOnDeliveryPayment = (payment: any) =>
  getPaymentOnDeliveryMethod(payment) === "cartao";
const calculateMissingItemsRefundAfterDiscount = (
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
const formatCashChangeInfo = (payment: any, order?: any) => {
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
const getOrderEmbeddedPayments = (order: any) =>
  Array.isArray(order?.pagamentos) ? order.pagamentos : [];
const getCashChangeStatusLabel = (payment: any, order?: any) => {
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
const isPendingCardPaymentForDelivery = (order: any, payments: any[] = []) => {
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
const hasPendingPaymentForDisplay = (order: any, payments: any[] = []) => {
  if (isOrderPaid(order, payments)) return false;

  const payment = getPreferredOrderPayment(order, payments);
  return (
    normalizePaymentText(getOrderPaymentStatus(order, payment)) === "pendente" ||
    isOrderPendingCash(order, payments) ||
    isPendingCardPaymentForDelivery(order, payments)
  );
};
const canOrderProceedForFulfillment = (order: any, payments: any[] = []) =>
  isOrderPaid(order, payments) ||
  isFiadoOrder(order, payments) ||
  isOrderPendingCash(order, payments) ||
  isPendingCardPaymentForDelivery(order, payments);
const DELIVERY_ASSIGNMENT_BLOCKED_STATUSES = new Set([
  "entregue",
  "nao_entregue",
  "cancelado",
]);
const REFUND_ACTIVE_STATUSES = new Set(["pendente", "processando", "aprovado"]);
const ORDER_TABS = [
  { value: "Entrega", label: "Delivery" },
  { value: "Retirada", label: "Retirada" },
  { value: "Salao", label: "Salão" },
] as const;
type OrderTab = (typeof ORDER_TABS)[number]["value"];
type ArchivedOrderTypeFilter = "Todos" | OrderTab;
type ArchivedDailySummary = {
  date: string;
  count: number;
  total: number;
};
type OrderType = "entrega" | "retirada" | "salao";
type OrderCounterKey = OrderType;
const getOrderType = (order: any): OrderType => {
  const type = String(order?.tipo_pedido || order?.type || "").toLowerCase();
  return type === "salao" || type === "retirada" ? type : "entrega";
};
const getOrderTypeLabel = (order: any) => ({
  entrega: "Entrega",
  retirada: "Retirada",
  salao: "Salão",
})[getOrderType(order)];
const getSalaoComandaStatus = (order: any) =>
  String(order?.salao_comanda?.status || order?.comanda?.status || "").toLowerCase();
const canTakeSalaoOrderToTable = (order: any) =>
  getOrderType(order) === "salao" &&
  getBackendStatus(order?.status || "") === "pronto" &&
  getSalaoComandaStatus(order) === "aberta";
const canForceFinalizeOrder = (order: any) =>
  Boolean(order?.id) && getBackendStatus(order?.status || "") !== "entregue";
const canQuickArchiveOrder = (order: any) =>
  Boolean(order?.id) &&
  !order?.arquivado &&
  getBackendStatus(order?.status || "") === "entregue";
const formatOrderDateTime = (value: Date | string) =>
  formatBrasiliaDate(value, { dateStyle: "short", timeStyle: "short" });
const getOrderCreatedTimestamp = (order: any) =>
  order?.criado_em ||
  order?.created_at ||
  order?.realizado_em ||
  new Date();
const getArchivedOrderTimestamp = (order: any) =>
  order?.realizado_em || getOrderCreatedTimestamp(order);
const getValidDate = (value: any) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};
const padDatePart = (value: number) => String(value).padStart(2, "0");
const getDateKey = (value: any) => {
  const date = getValidDate(value);
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
};
const formatArchivedDayLabel = (value: any) => {
  const date = getValidDate(value);
  return `[${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)}]`;
};
const formatArchivedDayDescription = (value: any) =>
  getValidDate(value).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
const canSelectOrderForDeliveryAssignment = (
  order: any,
  assignedOrderIds: Set<any>,
) =>
  isDeliveryOrder(order) &&
  !assignedOrderIds.has(order?.id) &&
  !hasPendingCancellationRequest(order) &&
  !DELIVERY_ASSIGNMENT_BLOCKED_STATUSES.has(
    getBackendStatus(order?.status || ""),
  );

export function OrdersScreen() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [typeFilter, setTypeFilter] = useState<OrderTab>("Entrega");
  const [archivedTypeFilter, setArchivedTypeFilter] =
    useState<ArchivedOrderTypeFilter>("Todos");
  const [bairroFilter, setBairroFilter] = useState("Todos");
  const [selected, setSelected] = useState<any | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedItemsLoading, setSelectedItemsLoading] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<any[]>([]);
  const [selectedRefunds, setSelectedRefunds] = useState<any[]>([]);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundMode, setRefundMode] = useState<
    "produto_em_falta" | "outro_motivo"
  >("produto_em_falta");
  const [refundMissingQuantities, setRefundMissingQuantities] = useState<
    Record<string, string>
  >({});
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundApprovalOpen, setRefundApprovalOpen] = useState(false);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [checklistOrder, setChecklistOrder] = useState<any | null>(null);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistError, setChecklistError] = useState("");
  const [viewMode, setViewMode] = useState<"lista" | "bairros" | "arquivados">(
    "lista",
  );
  const [expandedBairros, setExpandedBairros] = useState<
    Record<string, boolean>
  >({});
  const [activeListGroupKey, setActiveListGroupKey] = useState("andamento");
  const [couriers, setCouriers] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [deliveryRecords, setDeliveryRecords] = useState<any[]>([]);
  const [currentDelivery, setCurrentDelivery] = useState<any | null>(null);
  const [assigningCourier, setAssigningCourier] = useState(false);
  const [unassigningDeliveryId, setUnassigningDeliveryId] = useState("");
  const [updatingStatusOrderId, setUpdatingStatusOrderId] = useState("");
  const [confirmingCashPaymentId, setConfirmingCashPaymentId] = useState("");
  const [updatingCashChangePaymentId, setUpdatingCashChangePaymentId] = useState("");
  const [forceFinalizingOrderId, setForceFinalizingOrderId] = useState("");
  const [forceFinalizeCandidate, setForceFinalizeCandidate] = useState<any | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState("");
  const [archivingOrderId, setArchivingOrderId] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [deliveryModalOrders, setDeliveryModalOrders] = useState<any[] | null>(
    null,
  );
  const [routeDriverId, setRouteDriverId] = useState("");
  const [openRoutes, setOpenRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [confirmingRoute, setConfirmingRoute] = useState(false);
  const [loadingOpenRoutes, setLoadingOpenRoutes] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(PRIMARY);
  const [storePrintData, setStorePrintData] = useState<any | null>(null);
  const [manualOrderOpen, setManualOrderOpen] = useState(false);
  const [adminAddItemsOrder, setAdminAddItemsOrder] = useState<any | null>(null);
  const [pendingPaymentMethodOrder, setPendingPaymentMethodOrder] = useState<any | null>(null);
  const [manualOrderCreationAllowed, setManualOrderCreationAllowed] = useState(false);
  const [salaoEnabled, setSalaoEnabled] = useState(false);
  const [fiadoEnabled, setFiadoEnabled] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState<Record<OrderCounterKey, number>>({
    entrega: 0,
    retirada: 0,
    salao: 0,
  });
  const [lastOrdersLoadedAt, setLastOrdersLoadedAt] = useState<Record<OrderCounterKey, string>>(() => {
    const initialCursor = new Date(0).toISOString();
    return { entrega: initialCursor, retirada: initialCursor, salao: initialCursor };
  });
  const [newOrderCursorsReady, setNewOrderCursorsReady] = useState(false);
  const [checkingNewOrders, setCheckingNewOrders] = useState(false);
  const [archivedStartDate, setArchivedStartDate] = useState("");
  const [archivedEndDate, setArchivedEndDate] = useState("");
  const [archivedDailySummary, setArchivedDailySummary] = useState<
    ArchivedDailySummary[]
  >([]);
  const [loadingArchivedDayKey, setLoadingArchivedDayKey] = useState("");
  const [cancelApprovalOrderId, setCancelApprovalOrderId] = useState("");
  const [cancellationReviewOrder, setCancellationReviewOrder] = useState<
    any | null
  >(null);
  const [cancellationRefundValue, setCancellationRefundValue] = useState("");
  const [cancellationReviewNote, setCancellationReviewNote] = useState("");
  const [cancellationReviewApprovalOpen, setCancellationReviewApprovalOpen] =
    useState(false);
  const [resolvingCancellationOrderId, setResolvingCancellationOrderId] =
    useState("");
  const PER_PAGE = 20;

  const user = (() => {
    try {
      const userJson = localStorage.getItem("user");
      return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
      return null;
    }
  })();

  useEffect(() => {
    setOrders([]);
    setPage(1);
    fetchOrders(1, true);
    fetchAuxiliaryData();
  }, [
    statusFilter,
    typeFilter,
    archivedTypeFilter,
    viewMode,
    archivedStartDate,
    archivedEndDate,
    fiadoEnabled,
  ]);

  useEffect(() => {
    if (!user?.loja_id) return;
    api.get(`/salao/lojas/${user.loja_id}/modulos`).then((modulesResult) => {
      const modules = modulesResult.data?.data ?? modulesResult.data ?? [];
      setSalaoEnabled(Array.isArray(modules) && modules.some((module: any) => module.slug === "salao" && module.enabled === true));
      setFiadoEnabled(Array.isArray(modules) && modules.some((module: any) => module.slug === "fiado" && module.enabled === true));
    }).catch(() => {
      setSalaoEnabled(false);
      setFiadoEnabled(false);
    });
  }, [user?.loja_id]);

  useEffect(() => {
    if (!user?.loja_id) return;

    const types: OrderCounterKey[] = [
      "entrega",
      "retirada",
      ...(salaoEnabled ? ["salao" as const] : []),
    ];
    Promise.all(
      types.map((type) => api.get("/pedidos/novos/contagem", {
        params: getNewOrdersQueryParams(type),
      })),
    ).then((responses) => {
      const initializedAt = new Date().toISOString();
      setLastOrdersLoadedAt((current) => {
        const next = { ...current };
        types.forEach((type, index) => {
          const checkedAt = responses[index].data?.data?.checked_at;
          next[type] = checkedAt || initializedAt;
        });
        return next;
      });
    }).catch((error) => {
      console.error("Error initializing new-order cursors:", error);
      const now = new Date().toISOString();
      setLastOrdersLoadedAt({ entrega: now, retirada: now, salao: now });
    }).finally(() => setNewOrderCursorsReady(true));
  }, [user?.loja_id, salaoEnabled]);

  useEffect(() => {
    if (!user?.loja_id) {
      setPrimaryColor(PRIMARY);
      setStorePrintData(null);
      setManualOrderCreationAllowed(false);
      setManualOrderOpen(false);
      return;
    }

    let active = true;
    Promise.allSettled([
      api.get(`/lojas/${user.loja_id}`),
      api.get(`/lojas/${user.loja_id}/configuracoes`),
    ]).then(([storeResult, configResult]) => {
      if (!active) return;

      const store =
        storeResult.status === "fulfilled"
          ? storeResult.value.data?.data || storeResult.value.data || {}
          : {};
      const config =
        configResult.status === "fulfilled"
          ? configResult.value.data?.data || configResult.value.data || {}
          : {};

      setPrimaryColor(config.cor_primaria || PRIMARY);
      setManualOrderCreationAllowed(config.permitir_criacao_pedidos_delivery_admin === true);
      if (config.permitir_criacao_pedidos_delivery_admin !== true) {
        setManualOrderOpen(false);
      }
      setStorePrintData({
        ...store,
        slogan: config.slogan,
        whatsapp_suporte: config.whatsapp_suporte,
      });
    });

    return () => {
      active = false;
    };
  }, [user?.loja_id]);

  useEffect(() => {
    if (viewMode === "bairros" && typeFilter !== "Entrega") {
      setTypeFilter("Entrega");
    }
  }, [viewMode, typeFilter]);

  useEffect(() => {
    setSelectedOrderIds([]);
  }, [search, statusFilter, typeFilter, archivedTypeFilter, bairroFilter, viewMode]);

  const fetchAuxiliaryData = async () => {
    try {
      const [entRes, areaRes, deliveryRes] = await Promise.all([
        api.get("/entregadores"),
        api.get("/areas_entrega"),
        api.get("/entregas"),
      ]);
      const eData = entRes.data.data;
      const allCouriers = Array.isArray(eData) ? eData : eData?.data || [];
      setCouriers(
        allCouriers.filter(
          (c: any) => c.status === "ativo" || c.status === "disponivel",
        ),
      );

      const aData = areaRes.data.data;
      setAreas(Array.isArray(aData) ? aData : aData?.data || []);

      setDeliveryRecords(getApiList(deliveryRes.data));
    } catch (error) {
      console.error("Error fetching auxiliary data:", error);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setOrders([]);
      setPage(1);
      fetchOrders(1, true);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const getOrderCounterKey = (): OrderCounterKey =>
    typeFilter.toLowerCase() as OrderType;

  const getActiveOrderTypeFilter = () =>
    viewMode === "arquivados" ? archivedTypeFilter : typeFilter;

  const getOrderQueryParams = (pageNum = 1) => ({
    page: pageNum,
    per_page: PER_PAGE,
    arquivado: viewMode === "arquivados" ? "true" : "false",
    status: frontendToBackendStatus[statusFilter],
    tipo_pedido:
      getActiveOrderTypeFilter() === "Todos"
        ? undefined
        : String(getActiveOrderTypeFilter()).toLowerCase(),
    busca: search || undefined,
    realizado_em_inicial:
      viewMode === "arquivados" ? archivedStartDate || undefined : undefined,
    realizado_em_final:
      viewMode === "arquivados" ? archivedEndDate || undefined : undefined,
  });

  const normalizeDailySummary = (summary: any[] = []): ArchivedDailySummary[] =>
    summary
      .map((item) => ({
        date: String(item?.date || item?.data || ""),
        count: Number(item?.count ?? item?.total_pedidos ?? 0),
        total: Number(item?.total ?? item?.valor_total ?? 0),
      }))
      .filter((item) => item.date && Number.isFinite(item.count))
      .sort((a, b) => b.date.localeCompare(a.date));

  const getArchivedDayQueryParams = (dayKey: string, pageNum = 1) => ({
    ...getOrderQueryParams(pageNum),
    page: pageNum,
    per_page: 100,
    realizado_em_inicial: dayKey,
    realizado_em_final: dayKey,
  });

  const getNewOrdersQueryParams = (type: OrderCounterKey) => ({
    tipo_pedido: type,
    arquivado: "false",
    criado_apos: lastOrdersLoadedAt[type],
  });

  const fetchOrders = async (
    pageNum = 1,
    reset = false,
    options: { silent?: boolean } = {},
  ) => {
    try {
      if (!options.silent) setLoading(true);
      const params: any = getOrderQueryParams(pageNum);

      const response = await api.get("/pedidos", { params });
      const rawData = response.data.data;
      const data = Array.isArray(rawData) ? rawData : rawData?.data || [];
      const nextDailySummary = Array.isArray(rawData?.daily_summary)
        ? normalizeDailySummary(rawData.daily_summary)
        : [];

      const more = Array.isArray(rawData)
        ? data.length > PER_PAGE
        : pageNum < Number(rawData?.total_pages || pageNum);
      const displayData =
        Array.isArray(rawData) && more ? data.slice(0, PER_PAGE) : data;

      setHasMore(more);
      if (reset && viewMode === "arquivados") {
        setArchivedDailySummary(nextDailySummary);
        setActiveListGroupKey((currentKey) =>
          nextDailySummary.some((item) => item.date === currentKey)
            ? currentKey
            : nextDailySummary[0]?.date || currentKey,
        );
      }
      setOrders((prev) =>
        reset
          ? displayData
          : [
              ...prev,
              ...displayData.filter(
                (order: any) =>
                  !prev.some((currentOrder) => currentOrder.id === order.id),
              ),
            ],
      );
      setPage(pageNum);
      if (reset && viewMode !== "arquivados") {
        const activeType = getOrderCounterKey();
        setLastOrdersLoadedAt((current) => ({
          ...current,
          [activeType]: rawData?.checked_at || new Date().toISOString(),
        }));
        setNewOrdersCount((current) => ({ ...current, [activeType]: 0 }));
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      if (!options.silent) setLoading(false);
    }
  };

  const checkNewOrders = async () => {
    try {
      setCheckingNewOrders(true);
      const types: OrderCounterKey[] = [
        "entrega",
        "retirada",
        ...(salaoEnabled ? ["salao" as const] : []),
      ];
      const responses = await Promise.all(
        types.map((type) => api.get("/pedidos/novos/contagem", {
          params: getNewOrdersQueryParams(type),
        })),
      );
      setNewOrdersCount((current) => {
        const next = { ...current };
        types.forEach((type, index) => {
          const count = Number(responses[index].data?.data?.count ?? responses[index].data?.count ?? 0);
          next[type] = Number.isFinite(count) ? count : 0;
        });
        return next;
      });
    } catch (error) {
      console.error("Error checking new orders:", error);
    } finally {
      setCheckingNewOrders(false);
    }
  };

  useEffect(() => {
    if (!newOrderCursorsReady) return;

    const intervalId = window.setInterval(() => {
      checkNewOrders();
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [
    statusFilter,
    typeFilter,
    bairroFilter,
    search,
    viewMode,
    lastOrdersLoadedAt,
    salaoEnabled,
    newOrderCursorsReady,
  ]);

  const refreshCurrentOrderTab = async () => {
    setOrders([]);
    setPage(1);
    await Promise.all([fetchOrders(1, true), fetchAuxiliaryData()]);
  };

  const fetchArchivedDayOrders = async (dayKey: string) => {
    if (!dayKey) return;

    try {
      setLoadingArchivedDayKey(dayKey);

      const firstResponse = await api.get("/pedidos", {
        params: getArchivedDayQueryParams(dayKey, 1),
      });
      const firstPayload = firstResponse.data.data;
      const firstData = Array.isArray(firstPayload)
        ? firstPayload
        : firstPayload?.data || [];
      const totalPages = Math.max(1, Number(firstPayload?.total_pages || 1));
      const allOrders = [...firstData];

      if (totalPages > 1) {
        const responses = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            api.get("/pedidos", {
              params: getArchivedDayQueryParams(dayKey, index + 2),
            }),
          ),
        );
        responses.forEach((response) => {
          const payload = response.data.data;
          allOrders.push(
            ...(Array.isArray(payload) ? payload : payload?.data || []),
          );
        });
      }

      setOrders(allOrders);
      setPage(1);
      setHasMore(false);
      setActiveListGroupKey(dayKey);
    } catch (error) {
      console.error("Error fetching archived day orders:", error);
      showSystemNotice(
        "NÃ£o foi possÃ­vel carregar todos os pedidos deste dia.",
      );
    } finally {
      setLoadingArchivedDayKey((currentKey) =>
        currentKey === dayKey ? "" : currentKey,
      );
    }
  };

  const changeViewMode = (nextMode: "lista" | "bairros" | "arquivados") => {
    if (nextMode === viewMode) return;
    setViewMode(nextMode);
  };

  const handleNewOrdersButton = () => {
    const activeType = getOrderCounterKey();
    if (newOrdersCount[activeType] > 0) {
      void refreshCurrentOrderTab();
      return;
    }

    const nextType = ([
      "entrega",
      "retirada",
      ...(salaoEnabled ? ["salao" as const] : []),
    ] as OrderCounterKey[])
      .find((type) => newOrdersCount[type] > 0);
    if (!nextType) return;
    setTypeFilter(({ entrega: "Entrega", retirada: "Retirada", salao: "Salao" } as const)[nextType]);
  };

  const handleLoadMore = () => {
    fetchOrders(page + 1);
  };

  const loadOrderItems = async (orderId: string) => {
    try {
      const response = await api.get(`/pedidos/${orderId}/itens`);
      return getApiList(response.data);
    } catch (error) {
      console.error("Error fetching order items by order endpoint:", error);
      try {
        const response = await api.get("/itens_pedido", {
          params: { pedido_id: orderId },
        });
        return getApiList(response.data);
      } catch (fallbackError) {
        console.error("Error fetching order items fallback:", fallbackError);
        throw fallbackError;
      }
    }
  };

  const fetchOrderItems = async (orderId: string) => {
    try {
      setSelectedItemsLoading(true);
      setSelectedItems(await loadOrderItems(orderId));
    } catch {
      setSelectedItems([]);
    } finally {
      setSelectedItemsLoading(false);
    }
  };

  const fetchOrderPayments = async (orderId: string) => {
    try {
      const response = await api.get(`/pedidos/${orderId}/pagamentos`);
      const payments = getApiList(response.data);
      setSelectedPayments(payments);
      const preferredPayment = getPreferredOrderPayment({ id: orderId }, payments);
      if (preferredPayment) {
        setOrders((previous) =>
          previous.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  pagamentos: payments,
                  pagamento: preferredPayment,
                  payment_status: preferredPayment.status || order.payment_status,
                }
              : order,
          ),
        );
      }
      return payments;
    } catch (error) {
      console.error("Error fetching order payments:", error);
      try {
        const response = await api.get("/pagamentos", {
          params: { pedido_id: orderId },
        });
        const payments = getApiList(response.data);
        setSelectedPayments(payments);
        const preferredPayment = getPreferredOrderPayment({ id: orderId }, payments);
        if (preferredPayment) {
          setOrders((previous) =>
            previous.map((order) =>
              order.id === orderId
                ? {
                    ...order,
                    pagamentos: payments,
                    pagamento: preferredPayment,
                    payment_status: preferredPayment.status || order.payment_status,
                  }
                : order,
            ),
          );
        }
        return payments;
      } catch (fallbackError) {
        console.error("Error fetching order payments fallback:", fallbackError);
        setSelectedPayments([]);
        return [];
      }
    }
  };

  const fetchOrderRefunds = async (payments: any[]) => {
    const paymentIds = payments.map((payment) => payment?.id).filter(Boolean);
    if (paymentIds.length === 0) {
      setSelectedRefunds([]);
      return [];
    }

    try {
      const responses = await Promise.all(
        paymentIds.map((paymentId) =>
          api.get(`/pagamentos/${paymentId}/estornos`),
        ),
      );
      const refunds = responses.flatMap((response) =>
        getApiList(response.data),
      );
      setSelectedRefunds(refunds);
      return refunds;
    } catch (error) {
      console.error("Error fetching order refunds:", error);
      setSelectedRefunds([]);
      return [];
    }
  };

  const refreshSelectedOrderAfterAdminAdjustment = async (result: any, message: string) => {
    const nextOrder = result?.pedido || result?.order || selected;
    if (nextOrder?.id) {
      setSelected((previous: any) => previous?.id === nextOrder.id ? { ...previous, ...nextOrder } : nextOrder);
      setOrders((previous) =>
        previous.map((order) => order.id === nextOrder.id ? { ...order, ...nextOrder } : order),
      );
      await fetchOrderItems(nextOrder.id);
      const payments = Array.isArray(result?.pagamentos)
        ? result.pagamentos
        : await fetchOrderPayments(nextOrder.id);
      if (Array.isArray(result?.pagamentos)) {
        setSelectedPayments(result.pagamentos);
      }
      await fetchOrderRefunds(payments);
    }
    await fetchOrders(1, true, { silent: true });
    setAdminAddItemsOrder(null);
    setPendingPaymentMethodOrder(null);
    showSystemNotice(message);
  };

  const fetchOrderDelivery = async (orderId: string) => {
    try {
      const response = await api.get("/entregas", {
        params: { pedido_id: orderId },
      });
      const data = getApiList(response.data);
      // Se houver entrega, pega a primeira (geralmente só tem uma)
      setCurrentDelivery(data.length > 0 ? data[0] : null);
    } catch (error) {
      console.error("Error fetching order delivery:", error);
      setCurrentDelivery(null);
    }
  };

  const getDeliveryForOrder = async (orderId: string) => {
    const response = await api.get("/entregas", {
      params: { pedido_id: orderId },
    });
    const data = getApiList(response.data);
    return data.length > 0 ? data[0] : null;
  };

  const handleSelectOrder = (order: any) => {
    const embeddedPayments = getOrderEmbeddedPayments(order);
    setSelected(order);
    setSelectedItems([]);
    setSelectedPayments(embeddedPayments);
    setSelectedRefunds([]);
    setCurrentDelivery(null);
    fetchOrderItems(order.id);
    if (embeddedPayments.length > 0) {
      fetchOrderRefunds(embeddedPayments);
    } else {
      fetchOrderPayments(order.id).then((payments) =>
        fetchOrderRefunds(payments),
      );
    }
    if ((order.tipo_pedido || order.type || "").toLowerCase() === "entrega") {
      fetchOrderDelivery(order.id);
    }
  };

  const moveOrderToSeparationForPrint = async (order: any) => {
    if (!order?.id || getOrderType(order) === "salao") return order;

    const currentStatus = getBackendStatus(order.status || "");
    if (currentStatus === "em_separacao") return order;
    if (!["pendente", "confirmado"].includes(currentStatus)) return order;

    const statusesToApply =
      currentStatus === "pendente"
        ? ["confirmado", "em_separacao"]
        : ["em_separacao"];
    let nextOrder = order;

    setUpdatingStatusOrderId(order.id);
    try {
      for (const status of statusesToApply) {
        const response = await api.patch(`/pedidos/${order.id}/status`, {
          status,
        });
        const updatedOrder = response.data?.data || response.data || {};
        nextOrder = {
          ...nextOrder,
          ...updatedOrder,
          status: updatedOrder.status || status,
        };

        setOrders((prev) =>
          prev.map((item) =>
            item.id === order.id ? { ...item, ...nextOrder } : item,
          ),
        );
        if (selected?.id === order.id) {
          setSelected((prev: any) =>
            prev ? { ...prev, ...nextOrder } : prev,
          );
        }
      }
    } finally {
      setUpdatingStatusOrderId((currentId) =>
        currentId === order.id ? "" : currentId,
      );
    }

    return nextOrder;
  };

  const handlePrintComanda = async (order: any) => {
    const printWindow = window.open("", "_blank", "width=420,height=650");
    if (!printWindow) {
      showSystemNotice(
        "O navegador bloqueou a janela de impressão. Permita pop-ups e tente novamente.",
      );
      return;
    }

    let printableOrder = order;
    try {
      printableOrder = await moveOrderToSeparationForPrint(order);
    } catch (error) {
      printWindow.close();
      showSystemNotice(
        getApiErrorMessage(
          error,
          "Não foi possível alterar o pedido para Em separação antes da impressão.",
        ),
      );
      return;
    }

    try {
      const items = await loadOrderItems(printableOrder.id);
      const orderPayment =
        selected?.id === printableOrder.id
          ? getPreferredOrderPayment(printableOrder, selectedPayments)
          : getPreferredOrderPayment(printableOrder);
      printComanda(
        { ...printableOrder, pagamento: orderPayment },
        items,
        storePrintData,
        printWindow,
      );
      void fetchOrders(1, true, { silent: true });
    } catch {
      printWindow.close();
      showSystemNotice(
        "Não foi possível carregar os produtos deste pedido para impressão.",
      );
    }
  };

  const openItemsChecklist = async (order: any) => {
    setChecklistOrder(order);
    setChecklistItems([]);
    setChecklistError("");
    setChecklistLoading(true);

    try {
      setChecklistItems(await loadOrderItems(order.id));
    } catch {
      setChecklistError("Não foi possível carregar os produtos deste pedido.");
    } finally {
      setChecklistLoading(false);
    }
  };

  useEffect(() => {
    const deepLinkedOrderId = searchParams.get("orderId");
    if (!deepLinkedOrderId || selected?.id === deepLinkedOrderId) return;

    const deepLinkedOrder = orders.find(
      (order) => order.id === deepLinkedOrderId,
    );
    if (deepLinkedOrder) {
      handleSelectOrder(deepLinkedOrder);
    }
  }, [orders, searchParams, selected?.id]);

  const updateDeliveryRecord = (delivery: any) => {
    if (!delivery?.id) return;

    setDeliveryRecords((prev) => {
      const exists = prev.some((item) => item.id === delivery.id);
      if (exists) {
        return prev.map((item) => (item.id === delivery.id ? delivery : item));
      }

      return [...prev, delivery];
    });
  };

  const handleAssignCourier = async (entregadorId: string) => {
    if (!selected) return;

    if (hasPendingCancellationRequest(selected)) {
      showSystemNotice(
        "Analise a solicitação de cancelamento antes de atribuir uma entrega.",
      );
      return;
    }

    if (
      !canOrderProceedForFulfillment(selected, selectedPayments)
    ) {
      showSystemNotice(
        "O pedido só pode avançar após a aprovação do pagamento.",
      );
      return;
    }

    try {
      setAssigningCourier(true);
      const latestDelivery = currentDelivery?.id
        ? await getDeliveryForOrder(selected.id)
        : currentDelivery;

      if (latestDelivery) {
        if (latestDelivery.entregador_id === entregadorId) {
          setCurrentDelivery(latestDelivery);
          return;
        }

        if (!canChangeDeliveryCourier(latestDelivery)) {
          setCurrentDelivery(latestDelivery);
          showSystemNotice(
            "Não é possível alterar o entregador depois que a entrega saiu para rota.",
          );
          return;
        }

        // Já existe uma entrega, vamos atribuir/mudar o entregador
        const response = await api.patch(
          `/entregas/${latestDelivery.id}/atribuir-entregador`,
          {
            entregador_id: entregadorId,
          },
        );
        const updatedDelivery = response.data.data || response.data;
        setCurrentDelivery(updatedDelivery);
        updateDeliveryRecord(updatedDelivery);
      } else {
        // Não existe entrega, vamos criar uma
        // Precisamos de uma área de entrega. Vamos tentar encontrar uma pelo bairro ou usar a primeira disponível.
        const bairro = getOrderNeighborhood(selected);
        let area = areas.find(
          (a) => a.nome.toLowerCase() === bairro.toLowerCase(),
        );

        if (!area && areas.length > 0) {
          area = areas[0]; // Fallback para a primeira área
        }

        if (!area) {
          showSystemNotice(
            "Nenhuma área de entrega configurada para esta loja. Crie uma área de entrega primeiro.",
          );
          return;
        }

        const response = await api.post("/entregas", {
          pedido_id: selected.id,
          entregador_id: entregadorId,
          area_entrega_id: area.id,
          status: "atribuida",
        });
        const createdDelivery = response.data.data || response.data;
        setCurrentDelivery(createdDelivery);
        updateDeliveryRecord(createdDelivery);
      }
    } catch (error) {
      console.error("Error assigning courier:", error);
      showSystemNotice(
        getApiErrorMessage(
          error,
          "Erro ao atribuir entregador. Verifique os dados e tente novamente.",
        ),
      );
    } finally {
      setAssigningCourier(false);
    }
  };

  const handleUnassignCourier = async (delivery: any, event?: MouseEvent) => {
    event?.stopPropagation();
    if (!delivery?.id) return;

    if (!canChangeDeliveryCourier(delivery)) {
      showSystemNotice(
        "Não é possível desvincular o entregador depois que a entrega saiu para rota.",
      );
      return;
    }

    try {
      const releasedOrderId = delivery.pedido_id;
      setUnassigningDeliveryId(delivery.id);
      const response = await api.patch(
        `/entregas/${delivery.id}/desvincular-entregador`,
      );
      const updatedDelivery = response.data.data || response.data;

      setDeliveryRecords((prev) =>
        prev.map((item) =>
          item.id === updatedDelivery.id ? updatedDelivery : item,
        ),
      );

      if (currentDelivery?.id === updatedDelivery.id) {
        setCurrentDelivery(updatedDelivery);
      }

      setSelectedOrderIds((prev) =>
        prev.filter((orderId) => orderId !== releasedOrderId),
      );
    } catch (error) {
      console.error("Error unassigning courier:", error);
      showSystemNotice(
        getApiErrorMessage(
          error,
          "Erro ao desvincular entregador. Verifique se a entrega ainda pode ser alterada.",
        ),
      );
    } finally {
      setUnassigningDeliveryId("");
    }
  };

  const handleRetryDelivery = async (order: any, event?: MouseEvent) => {
    event?.stopPropagation();
    if (!order?.id) return;

    try {
      setUpdatingStatusOrderId(order.id);
      const response = await api.patch(
        `/pedidos/${order.id}/tentar-entrega-novamente`,
      );
      const updatedOrder = response.data?.data || response.data || {};

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? { ...item, ...updatedOrder, status: "saiu_para_entrega" }
            : item,
        ),
      );
      if (selected?.id === order.id) {
        setSelected((prev: any) =>
          prev
            ? { ...prev, ...updatedOrder, status: "saiu_para_entrega" }
            : prev,
        );
      }
      await fetchOrders(1, true, { silent: true });
      showSystemNotice("Pedido enviado novamente para entrega.");
    } catch (error) {
      console.error("Error retrying delivery", error);
      showSystemNotice(
        getApiErrorMessage(
          error,
          "Não foi possível tentar a entrega novamente.",
        ),
      );
    } finally {
      setUpdatingStatusOrderId((currentId) =>
        currentId === order.id ? "" : currentId,
      );
    }
  };

  const advanceStatus = async (id: string, currentStatus: string) => {
    const order =
      selected?.id === id ? selected : orders.find((item) => item.id === id);
    const orderType = (order?.tipo_pedido || order?.type || "").toLowerCase();
    const isDeliveryOrder = orderType === "entrega";
    const backendStatusFlow = [
      "pendente",
      "confirmado",
      "em_separacao",
      "pronto",
      ...(orderType === "retirada" ? [] : ["saiu_para_entrega"]),
      "entregue",
    ];
    const rawStatus = getBackendStatus(currentStatus);
    const idx = backendStatusFlow.indexOf(rawStatus);

    if (hasPendingCancellationRequest(order)) {
      showSystemNotice(
        "Analise a solicitação de cancelamento antes de avançar o pedido.",
      );
      return;
    }

    if (idx >= 0 && idx < backendStatusFlow.length - 1) {
      const nextStatus = backendStatusFlow[idx + 1];

      const orderPayments = selected?.id === id ? selectedPayments : [];
      const orderIsPaid = isOrderPaid(order, orderPayments);
      const orderIsFiado = isFiadoOrder(order, orderPayments);
      const orderHasPendingCash = isOrderPendingCash(order, orderPayments);
      const orderPayment = getPreferredOrderPayment(order, orderPayments);
      const orderHasCardOnDelivery = isCardOnDeliveryPayment(orderPayment);

      if (!orderIsPaid && !orderIsFiado && !orderHasPendingCash) {
        showSystemNotice(
          "O pedido só pode avançar após a aprovação do pagamento.",
        );
        return;
      }

      if (
        orderType === "retirada" &&
        nextStatus === "entregue" &&
        orderHasPendingCash &&
        !orderHasCardOnDelivery
      ) {
        showSystemNotice(
          "Confirme o recebimento do dinheiro antes de concluir a retirada.",
        );
        return;
      }

      if (isDeliveryOrder && nextStatus === "entregue") {
        showSystemNotice(
          "A entrega deve ser confirmada pelo entregador com a chave do cliente.",
        );
        return;
      }

      try {
        setUpdatingStatusOrderId(id);
        const nextIsDeliveryStatus =
          nextStatus === "saiu_para_entrega" || nextStatus === "entregue";

        if (isDeliveryOrder && nextIsDeliveryStatus) {
          let delivery = await getDeliveryForOrder(id);

          if (!delivery?.entregador_id) {
            setCurrentDelivery(delivery);
            showSystemNotice(
              "Atribua um entregador antes de enviar este pedido para entrega.",
            );
            return;
          }

          if (delivery.status === "aguardando") {
            const response = await api.patch(
              `/entregas/${delivery.id}/atribuir-entregador`,
              {
                entregador_id: delivery.entregador_id,
              },
            );
            delivery = response.data.data || response.data;
          }

          if (
            nextStatus === "saiu_para_entrega" &&
            !["saiu_para_entrega", "entregue"].includes(delivery.status)
          ) {
            await api.patch(`/entregas/${delivery.id}/sair-para-entrega`);
          }

          const updatedDelivery = await getDeliveryForOrder(id);
          setCurrentDelivery(updatedDelivery);
        } else {
          await api.patch(`/pedidos/${id}/status`, { status: nextStatus });
        }

        // Update local state
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: nextStatus } : o)),
        );
        if (selected?.id === id) {
          setSelected((p: any) => (p ? { ...p, status: nextStatus } : null));
        }
        await fetchOrders(1, true, { silent: true });
      } catch (error) {
        console.error("Error updating status", error);
        showSystemNotice(
          getApiErrorMessage(
            error,
            "Erro ao atualizar status. Verifique se as condições para este status foram atendidas (ex: entregador atribuído).",
          ),
        );
      } finally {
        setUpdatingStatusOrderId((currentId) =>
          currentId === id ? "" : currentId,
        );
      }
    }
  };

  const takeSalaoOrderToTable = async (order: any, event?: MouseEvent) => {
    event?.stopPropagation();
    if (!order?.id) return;

    const currentPayments = selected?.id === order.id ? selectedPayments : [];

    if (!canTakeSalaoOrderToTable(order)) {
      showSystemNotice(
        "Este pedido só pode ser levado para a mesa quando estiver pronto e a comanda ainda estiver aberta.",
      );
      return;
    }

    if (!canOrderProceedForFulfillment(order, currentPayments)) {
      showSystemNotice(
        "O pedido só pode ser levado para a mesa após a aprovação do pagamento.",
      );
      return;
    }

    try {
      setUpdatingStatusOrderId(order.id);
      const response = await api.patch(`/pedidos/${order.id}/status`, {
        status: "entregue",
      });
      const updatedOrder = response.data?.data || response.data || {};

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id ? { ...item, ...updatedOrder } : item,
        ),
      );
      if (selected?.id === order.id) {
        setSelected((prev: any) =>
          prev ? { ...prev, ...updatedOrder } : prev,
        );
      }
      await fetchOrders(1, true, { silent: true });
    } catch (error) {
      console.error("Error taking salao order to table", error);
      showSystemNotice(
        getApiErrorMessage(
          error,
          "Não foi possível levar o pedido para a mesa.",
        ),
      );
    } finally {
      setUpdatingStatusOrderId((currentId) =>
        currentId === order.id ? "" : currentId,
      );
    }
  };

  const confirmCashPayment = async () => {
    if (!selected?.id || !selectedPayment?.id || !selectedIsPendingCash) return;

    try {
      setConfirmingCashPaymentId(selectedPayment.id);
      const response = await api.patch(`/pagamentos/${selectedPayment.id}/status`, {
        status: "aprovado",
        observacao: "Pagamento recebido pelo caixa",
      });
      const updatedPayment = response.data.data || response.data;

      setSelectedPayments((previous) =>
        previous.map((payment) =>
          payment.id === updatedPayment.id ? updatedPayment : payment,
        ),
      );
      setSelected((previous: any) =>
        previous ? { ...previous, pagamento: updatedPayment } : previous,
      );
      setOrders((previous) =>
        previous.map((order) =>
          order.id === selected.id
            ? { ...order, pagamento: updatedPayment }
            : order,
        ),
      );
      await fetchOrders(1, true, { silent: true });
      showSystemNotice("Pagamento confirmado como recebido.");
    } catch (error) {
      showSystemNotice(
        getApiErrorMessage(
          error,
          "Não foi possível confirmar o pagamento em dinheiro.",
        ),
      );
    } finally {
      setConfirmingCashPaymentId("");
    }
  };

  const updateCashChangePaidToCourier = async (checked: boolean) => {
    if (!selected?.id || !selectedPayment?.id) return;

    try {
      setUpdatingCashChangePaymentId(selectedPayment.id);
      const response = await api.patch(
        `/pagamentos/${selectedPayment.id}/troco-entregador`,
        { troco_pago_ao_entregador: checked },
      );
      const updatedPayment = response.data.data || response.data;

      setSelectedPayments((previous) =>
        previous.map((payment) =>
          payment.id === updatedPayment.id ? updatedPayment : payment,
        ),
      );
      setSelected((previous: any) =>
        previous ? { ...previous, pagamento: updatedPayment } : previous,
      );
      setOrders((previous) =>
        previous.map((order) =>
          order.id === selected.id
            ? { ...order, pagamento: updatedPayment }
            : order,
        ),
      );
      showSystemNotice(
        checked
          ? "Troco marcado como pago ao entregador."
          : "Troco marcado como não pago ao entregador.",
      );
    } catch (error) {
      showSystemNotice(
        getApiErrorMessage(
          error,
          "Não foi possível atualizar o troco pago ao entregador.",
        ),
      );
    } finally {
      setUpdatingCashChangePaymentId("");
    }
  };

  const openForceFinalizeConfirm = (order: any, event?: MouseEvent) => {
    event?.stopPropagation();
    if (!canForceFinalizeOrder(order)) return;
    setForceFinalizeCandidate(order);
  };

  const closeForceFinalizeConfirm = () => {
    if (forceFinalizingOrderId) return;
    setForceFinalizeCandidate(null);
  };

  const forceFinalizeOrder = async () => {
    const order = forceFinalizeCandidate;
    if (!order?.id) return;

    try {
      setForceFinalizingOrderId(order.id);
      const response = await api.patch(`/pedidos/${order.id}/finalizar-forcado`);
      const updatedOrder = response.data?.data || response.data || {};
      const paymentWasForced = response.data?.meta?.pagamento_marcado_como_pago === true;
      const accountWasForced = response.data?.meta?.conta_marcada_como_paga === true;

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id ? { ...item, ...updatedOrder, status: "entregue" } : item,
        ),
      );
      if (selected?.id === order.id) {
        setSelected((prev: any) =>
          prev ? { ...prev, ...updatedOrder, status: "entregue" } : prev,
        );
        const payments = await fetchOrderPayments(order.id);
        setSelectedPayments(payments);
      }
      await fetchOrders(1, true, { silent: true });
      setForceFinalizeCandidate(null);
      showSystemNotice(
        paymentWasForced || accountWasForced
          ? "Pedido finalizado. A conta também foi marcada como paga."
          : "Pedido finalizado.",
      );
    } catch (error) {
      showSystemNotice(
        getApiErrorMessage(error, "Não foi possível finalizar o pedido."),
      );
    } finally {
      setForceFinalizingOrderId("");
    }
  };

  const cancelOrder = async (id: string, approval?: MfaApproval) => {
    try {
      setCancellingOrderId(id);
      await api.patch(
        `/pedidos/${id}/cancelar`,
        approval ? { mfa_approval: approval } : {},
      );
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: "cancelado" } : o)),
      );
      if (selected?.id === id)
        setSelected((p: any) => (p ? { ...p, status: "cancelado" } : null));
      await fetchOrders(1, true, { silent: true });
    } catch (error) {
      console.error("Error canceling order", error);
      showSystemNotice(
        getApiErrorMessage(error, "Erro ao cancelar pedido. Tente novamente."),
      );
    } finally {
      setCancellingOrderId((currentId) => (currentId === id ? "" : currentId));
      setCancelApprovalOrderId("");
    }
  };

  const requestOrderCancellation = async (id: string) => {
    try {
      const mfa = await authService.getMfaStatus();
      if (mfa.refund_required) {
        setCancelApprovalOrderId(id);
        return;
      }

      if (!window.confirm("Tem certeza de que deseja cancelar este pedido?")) {
        return;
      }

      await cancelOrder(id);
    } catch (error) {
      showSystemNotice(
        getApiErrorMessage(
          error,
          "Não foi possível verificar a preferência de segurança.",
        ),
      );
    }
  };

  const openCancellationReview = (order: any) => {
    const request = getCancellationRequest(order);
    if (!request || request.status !== "pendente") return;

    setCancellationReviewOrder(order);
    setCancellationRefundValue(
      String(Number(request.valor_pago || order.total || 0).toFixed(2)).replace(
        ".",
        ",",
      ),
    );
    setCancellationReviewNote("");
    setCancellationReviewApprovalOpen(false);
  };

  const closeCancellationReview = () => {
    if (resolvingCancellationOrderId) return;
    setCancellationReviewOrder(null);
    setCancellationRefundValue("");
    setCancellationReviewNote("");
    setCancellationReviewApprovalOpen(false);
  };

  const applyCancellationResolution = (
    orderId: string,
    request: any,
    status?: string,
  ) => {
    const patch = {
      ...(status ? { status } : {}),
      solicitacao_cancelamento: request,
    };
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, ...patch } : order,
      ),
    );
    setSelected((prev: any) =>
      prev?.id === orderId ? { ...prev, ...patch } : prev,
    );
  };

  const rejectCancellationRequest = async () => {
    if (!cancellationReviewOrder || !cancellationReviewNote.trim()) {
      showSystemNotice("Informe a justificativa da recusa.");
      return;
    }

    try {
      setResolvingCancellationOrderId(cancellationReviewOrder.id);
      const response = await api.patch(
        `/pedidos/${cancellationReviewOrder.id}/solicitacao-cancelamento/recusar`,
        { observacao: cancellationReviewNote.trim() },
      );
      applyCancellationResolution(
        cancellationReviewOrder.id,
        response.data.data || response.data,
      );
      closeCancellationReview();
      await fetchOrders(1, true, { silent: true });
    } catch (error) {
      showSystemNotice(
        getApiErrorMessage(error, "Não foi possível recusar a solicitação."),
      );
    } finally {
      setResolvingCancellationOrderId("");
      setCancellationReviewOrder(null);
    }
  };

  const requestCancellationApproval = async () => {
    const totalPaid = Number(
      getCancellationRequest(cancellationReviewOrder)?.valor_pago || 0,
    );
    const refundValue = parseCurrencyInput(cancellationRefundValue);

    if (
      !Number.isFinite(refundValue) ||
      refundValue < 0 ||
      refundValue > totalPaid
    ) {
      showSystemNotice("Informe um reembolso entre R$ 0,00 e o total pago.");
      return;
    }
    if (refundValue < totalPaid && !cancellationReviewNote.trim()) {
      showSystemNotice("Informe a justificativa para a retenção de valores.");
      return;
    }

    try {
      const mfa = await authService.getMfaStatus();
      if (mfa.refund_required) {
        setCancellationReviewApprovalOpen(true);
        return;
      }
      await approveCancellationRequest();
    } catch (error) {
      showSystemNotice("Não foi possível verificar a preferência de segurança.");
    }
  };

  const approveCancellationRequest = async (approval?: MfaApproval) => {
    if (!cancellationReviewOrder) return;

    try {
      setResolvingCancellationOrderId(cancellationReviewOrder.id);
      const response = await api.patch(
        `/pedidos/${cancellationReviewOrder.id}/solicitacao-cancelamento/aprovar`,
        {
          valor_reembolso: parseCurrencyInput(cancellationRefundValue),
          observacao: cancellationReviewNote.trim() || null,
          ...(approval ? { mfa_approval: approval } : {}),
        },
      );
      applyCancellationResolution(
        cancellationReviewOrder.id,
        response.data.data || response.data,
        "cancelado",
      );
      setCancellationReviewApprovalOpen(false);
      setCancellationReviewOrder(null);
      await fetchOrders(1, true, { silent: true });
    } catch (error) {
      showSystemNotice(
        getApiErrorMessage(error, "Não foi possível aprovar a solicitação."),
      );
    } finally {
      setResolvingCancellationOrderId("");
    }
  };

  const openRefundModal = () => {
    if (!selectedCanRefund) {
      showSystemNotice(
        "Este pedido não possui saldo disponível para reembolso.",
      );
      return;
    }

    setRefundMode("produto_em_falta");
    setRefundMissingQuantities({});
    setRefundReason("");
    setRefundAmount(selectedRefundableAmount.toFixed(2).replace(".", ","));
    setRefundApprovalOpen(false);
    setRefundModalOpen(true);
  };

  const closeRefundModal = () => {
    if (refundSubmitting) return;
    setRefundModalOpen(false);
    setRefundApprovalOpen(false);
  };

  const requestRefundApproval = async () => {
    if (!selectedCanRefund) {
      showSystemNotice(
        "Este pedido não possui saldo disponível para reembolso.",
      );
      return;
    }

    if (!Number.isFinite(refundPreviewAmount) || refundPreviewAmount <= 0) {
      showSystemNotice("Informe um valor de reembolso maior que zero.");
      return;
    }

    if (refundPreviewAmount > selectedRefundableAmount) {
      showSystemNotice("O reembolso excede o saldo disponível do pagamento.");
      return;
    }

    if (refundMode === "produto_em_falta") {
      const hasMissingItem = Object.values(refundMissingQuantities).some(
        (value) => Number(value) > 0,
      );
      if (!hasMissingItem) {
        showSystemNotice("Selecione ao menos um produto em falta.");
        return;
      }
    }

    if (refundMode === "outro_motivo" && !refundReason.trim()) {
      showSystemNotice("Informe o motivo do reembolso.");
      return;
    }

    try {
      const mfa = await authService.getMfaStatus();
      if (mfa.refund_required) {
        setRefundApprovalOpen(true);
        return;
      }
      await submitRefund();
    } catch (error) {
      showSystemNotice("Não foi possível verificar a preferência de segurança.");
    }
  };

  const submitRefund = async (approval?: MfaApproval) => {
    if (!selected) return;

    const payload =
      refundMode === "produto_em_falta"
        ? {
            tipo: refundMode,
            motivo: refundReason.trim() || undefined,
            itens: selectedItems
              .map((item, index) => ({
                item_pedido_id: item.id,
                quantidade_faltante: Number(
                  refundMissingQuantities[
                    getOrderItemChecklistId(item, index)
                  ] || 0,
                ),
              }))
              .filter(
                (item) => item.item_pedido_id && item.quantidade_faltante > 0,
              ),
            ...(approval ? { mfa_approval: approval } : {}),
          }
        : {
            tipo: refundMode,
            valor: parseCurrencyInput(refundAmount),
            motivo: refundReason.trim(),
            ...(approval ? { mfa_approval: approval } : {}),
          };

    try {
      setRefundSubmitting(true);
      await api.post(`/pedidos/${selected.id}/reembolso`, payload);
      const payments = await fetchOrderPayments(selected.id);
      await fetchOrderRefunds(payments);
      await fetchOrders(1, true, { silent: true });
      setRefundApprovalOpen(false);
      setRefundModalOpen(false);
      showSystemNotice("Reembolso solicitado com sucesso.");
    } catch (error) {
      showSystemNotice(
        getApiErrorMessage(error, "Não foi possível solicitar o reembolso."),
      );
    } finally {
      setRefundSubmitting(false);
    }
  };

  const toggleArchivedOrder = async (order: any) => {
    const shouldRestore = Boolean(order.arquivado);

    try {
      setArchivingOrderId(order.id);
      await api.patch(
        `/pedidos/${order.id}/${shouldRestore ? "restaurar" : "arquivar"}`,
      );
      setOrders((prev) => prev.filter((item) => item.id !== order.id));
      if (viewMode === "arquivados" && shouldRestore) {
        const restoredDayKey = getDateKey(getArchivedOrderTimestamp(order));
        const restoredTotal = Number(order.valor_total || order.total || 0);
        setArchivedDailySummary((current) =>
          current
            .map((item) =>
              item.date === restoredDayKey
                ? {
                    ...item,
                    count: Math.max(0, item.count - 1),
                    total: Math.max(0, item.total - restoredTotal),
                  }
                : item,
            )
            .filter((item) => item.count > 0),
        );
      }
      if (selected?.id === order.id) {
        setSelected(null);
      }

      if (hasMore) {
        await fetchOrders(page, false, { silent: true });
      }
    } catch (error) {
      console.error("Error updating order archive status", error);
      showSystemNotice(
        getApiErrorMessage(
          error,
          shouldRestore
            ? "Erro ao restaurar pedido. Tente novamente."
            : "Erro ao arquivar pedido. Tente novamente.",
        ),
      );
    } finally {
      setArchivingOrderId((currentId) =>
        currentId === order.id ? "" : currentId,
      );
    }
  };

  const getStatusLabel = (status: string) => statusLabels[status] || status;
  const getDeliveryFailureReason = (order: any) =>
    (currentDelivery?.pedido_id === order?.id
      ? currentDelivery?.observacoes
      : "") ||
    deliveryByOrderId.get(order?.id)?.observacoes ||
    order?.entrega?.observacoes ||
    order?.delivery_failure_reason ||
    "";

  const filtered = orders.filter((o) => {
    const customerName = (o.cliente?.nome || o.customer || "").toLowerCase();
    const orderId = (o.numero_pedido || o.id || "").toLowerCase();
    const dailyTicket = getDailyTicketNumber(o).toLowerCase();
    const matchSearch =
      customerName.includes(search.toLowerCase()) ||
      dailyTicket.includes(search.toLowerCase()) ||
      orderId.includes(search.toLowerCase());

    // No longer filtering by status/type in memory as we do it in API
    return matchSearch;
  });

  const deliveryByOrderId = new Map(
    deliveryRecords.map((delivery) => [delivery.pedido_id, delivery]),
  );
  const assignedOrderIds = new Set(
    deliveryRecords
      .filter((delivery) => Boolean(delivery.entregador_id))
      .map((delivery) => delivery.pedido_id),
  );
  const allDeliveryOrders = filtered.filter(isDeliveryOrder);
  const bairroOptions = Array.from(
    new Set(allDeliveryOrders.map(getOrderNeighborhood)),
  ).sort((a, b) => a.localeCompare(b));
  const bairroFilteredDeliveryOrders =
    bairroFilter === "Todos"
      ? allDeliveryOrders
      : allDeliveryOrders.filter(
          (order) => getOrderNeighborhood(order) === bairroFilter,
        );
  const listDeliveryOrders = allDeliveryOrders.filter(
    (order) => canSelectOrderForDeliveryAssignment(order, assignedOrderIds),
  );
  const deliveryOrders = bairroFilteredDeliveryOrders.filter(
    (order) => canSelectOrderForDeliveryAssignment(order, assignedOrderIds),
  );
  const selectableDeliveryOrders =
    viewMode === "bairros"
      ? deliveryOrders
      : viewMode === "lista"
        ? listDeliveryOrders
        : [];
  const selectedDeliveryOrders = selectableDeliveryOrders.filter((order) =>
    selectedOrderIds.includes(order.id),
  );
  const selectedDeliveryCount = selectedDeliveryOrders.length;
  const activeFiltersCount =
    viewMode === "arquivados"
      ? [
          search,
          statusFilter !== "Todos",
          archivedTypeFilter !== "Todos",
          archivedStartDate,
          archivedEndDate,
        ].filter(Boolean).length
      : [
          search,
          statusFilter !== "Todos",
          bairroFilter !== "Todos",
        ].filter(Boolean).length;
  const availableOrderTabs = ORDER_TABS.filter(
    (tab) =>
      tab.value !== "Salao" || salaoEnabled,
  );
  const archivedTypeOptions: Array<{
    value: ArchivedOrderTypeFilter;
    label: string;
  }> = [
    { value: "Todos", label: "Todos" },
    ...availableOrderTabs.map((tab) => ({
      value: tab.value as ArchivedOrderTypeFilter,
      label: tab.label,
    })),
  ];
  const canCreateManualOrder =
    viewMode !== "arquivados" &&
    typeFilter !== "Salao" &&
    manualOrderCreationAllowed;
  const totalNewOrdersCount = availableOrderTabs.reduce(
    (total, tab) => total + newOrdersCount[tab.value.toLowerCase() as OrderCounterKey],
    0,
  );
  const selectedPayment = getPreferredOrderPayment(selected, selectedPayments);
  const selectedIsPaid = isOrderPaid(selected, selectedPayments);
  const selectedIsFiado = isFiadoOrder(selected, selectedPayments);
  const selectedIsPendingCash =
    !selectedIsPaid && isOrderPendingCash(selected, selectedPayments);
  const selectedRefundedAmount = selectedRefunds
    .filter((refund) =>
      REFUND_ACTIVE_STATUSES.has(String(refund.status || "").toLowerCase()),
    )
    .reduce((sum, refund) => sum + Number(refund.valor || 0), 0);
  const selectedHasActiveRefund = selectedRefunds.some((refund) =>
    REFUND_ACTIVE_STATUSES.has(String(refund.status || "").toLowerCase()),
  );
  const selectedHasReversedPayment = selectedPayments.some((payment) =>
    String(payment.status || "").toLowerCase() === "estornado",
  );
  const selectedBlocksAdminAdjustment =
    !selected ||
    getBackendStatus(selected.status || "") === "cancelado" ||
    selectedHasActiveRefund ||
    selectedHasReversedPayment;
  const selectedRefundableAmount = Math.max(
    0,
    Number(
      selectedPayment?.valor || selected?.valor_total || selected?.total || 0,
    ) - selectedRefundedAmount,
  );
  const missingItemsRefundAmount = selectedItems.reduce((sum, item, index) => {
    const key = getOrderItemChecklistId(item, index);
    const quantity = Number(refundMissingQuantities[key] || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) return sum;
    const itemQuantity = getOrderItemQuantity(item);
    const unitPrice =
      itemQuantity > 0 ? getOrderItemTotal(item) / itemQuantity : 0;
    return sum + unitPrice * Math.min(quantity, itemQuantity);
  }, 0);
  const selectedItemsSubtotal = selectedItems.reduce(
    (sum, item) => sum + getOrderItemTotal(item),
    0,
  );
  const refundPreviewAmount =
    refundMode === "produto_em_falta"
      ? calculateMissingItemsRefundAfterDiscount(
          selected,
          missingItemsRefundAmount,
          selectedItemsSubtotal,
        )
      : parseCurrencyInput(refundAmount || "0");
  const selectedForPrint = selected
    ? { ...selected, pagamento: selectedPayment }
    : selected;
  const selectedPaymentMethod = getOrderPaymentMethod(
    selected,
    selectedPayment,
  );
  const selectedPaymentStatus = getOrderPaymentStatus(
    selected,
    selectedPayment,
  );
  const selectedPaymentStatusLabel =
    selectedIsFiado && selectedIsPaid && selectedPaymentStatus === "Aprovado"
      ? "Pagamento efetivado"
      : selectedPaymentStatus;
  const selectedCashChangeInfo = formatCashChangeInfo(selectedPayment, selected);
  const selectedCashChangeStatusLabel = getCashChangeStatusLabel(
    selectedPayment,
    selected,
  );
  const selectedIsCardOnDelivery = isCardOnDeliveryPayment(selectedPayment);
  const selectedCashChangeValue = parseCurrencyNumber(
    firstPresent(
      selectedPayment?.troco_valor,
      selected?.pagamento?.troco_valor,
      selected?.troco_valor,
    ),
  );
  const selectedNeedsCashChange =
    !selectedIsCardOnDelivery && selectedCashChangeValue > 0;
  const selectedCashChangePaidToCourier =
    selectedPayment?.troco_pago_ao_entregador === true ||
    selected?.pagamento?.troco_pago_ao_entregador === true;
  const selectedStatusUpdating = updatingStatusOrderId === selected?.id;
  const selectedForceFinalizing = forceFinalizingOrderId === selected?.id;
  const selectedCancelling = cancellingOrderId === selected?.id;
  const selectedArchiving = archivingOrderId === selected?.id;
  const selectedCancellationPending = hasPendingCancellationRequest(selected);
  const selectedCanRefund =
    Boolean(selected?.id) &&
    selectedIsPaid &&
    !selectedIsFiado &&
    !selectedCancellationPending &&
    selectedRefundableAmount > 0;
  const selectedCancellationResolving =
    resolvingCancellationOrderId === selected?.id;
  const selectedOrderUpdating =
    selectedStatusUpdating ||
    selectedForceFinalizing ||
    selectedCancelling ||
    selectedArchiving ||
    selectedCancellationResolving;
  const selectedPaymentStatusClass = ["Aprovado", "Confirmado"].includes(
    selectedPaymentStatus,
  ) || selectedPaymentStatusLabel === "Pagamento efetivado"
    ? "text-green-600"
    : ["Rejeitado", "Cancelado", "Estornado", "Expirado"].includes(
          selectedPaymentStatus,
        )
      ? "text-red-600"
      : "text-amber-600";
  const selectedIsDelivery =
    String(selected?.tipo_pedido || selected?.type || "").toLowerCase() ===
    "entrega";
  const selectedIsPickup = Boolean(selected) && getOrderType(selected) === "retirada";
  const selectedIsSalao = Boolean(selected) && getOrderType(selected) === "salao";
  const selectedStatusLabel = selected ? getStatusLabel(selected.status) : "";
  const adminCannotDispatchDelivery =
    selectedIsDelivery && selectedStatusLabel === "Pronto";
  const adminCannotConfirmDelivery =
    selectedIsDelivery && selectedStatusLabel === "Saiu para Entrega";
  const selectedIsAdminDashboardOrder =
    normalizePaymentText(
      selected?.origem_checkout ||
        selected?.origemCheckout ||
        selected?.checkout_origin ||
        selected?.checkoutOrigin,
    ) === "admin_dashboard";
  const selectedCanProceed =
    selectedIsPaid ||
    selectedIsFiado ||
    selectedIsAdminDashboardOrder ||
    (selectedIsPendingCash && !selectedIsFiado);
  const selectedPaymentKeepsConfirmationPending =
    !selectedIsPaid && !selectedIsFiado && (selectedIsPendingCash || selectedIsAdminDashboardOrder);
  const selectedCanAdminAddItems = Boolean(selected?.id) && !selectedBlocksAdminAdjustment;
  const selectedCanChangePendingPayment =
    Boolean(selected?.id) &&
    !selectedBlocksAdminAdjustment &&
    !selectedIsPaid &&
    !selectedIsFiado;
  const selectedPickupNeedsCashConfirmation = false;
  const selectedCanTakeSalaoToTable =
    Boolean(selected) &&
    canTakeSalaoOrderToTable(selected) &&
    selectedCanProceed &&
    !selectedCancellationPending;
  const selectedCanForceFinalize = canForceFinalizeOrder(selected);
  const forceFinalizeCandidatePayments =
    forceFinalizeCandidate?.id === selected?.id ? selectedPayments : [];
  const forceFinalizeWillSettlePayment =
    Boolean(forceFinalizeCandidate) &&
    !isFiadoOrder(forceFinalizeCandidate, forceFinalizeCandidatePayments) &&
    !isOrderPaid(forceFinalizeCandidate, forceFinalizeCandidatePayments);
  const selectedCustomerName =
    selected?.cliente?.nome || selected?.customer || "";
  const selectedOrderNumber =
    selected?.numero_pedido || String(selected?.id || "").slice(0, 8);
  const selectedCustomerWhatsappMessage = selectedCustomerName
    ? `Olá, ${selectedCustomerName}! Sobre o pedido #${selectedOrderNumber}, vimos que ele consta como não entregue. Podemos combinar os próximos passos?`
    : `Olá! Sobre o pedido #${selectedOrderNumber}, vimos que ele consta como não entregue. Podemos combinar os próximos passos?`;
  const selectedCustomerWhatsappUrl = selected
    ? buildWhatsappUrl(
        getOrderCustomerPhone(selected),
        selectedCustomerWhatsappMessage,
      )
    : null;
  const getOrderStatusKey = (order: any) => getBackendStatus(order?.status || "");
  const activeWorkStatuses = new Set([
    "pendente",
    "confirmado",
    "em_separacao",
    "pronto",
  ]);
  const orderStatusIs = (order: any, status: string) =>
    getOrderStatusKey(order) === status;
  const archivedOrdersByDay = filtered.reduce<
    Record<
      string,
      {
        orders: any[];
        total: number;
        timestamp: number;
      }
    >
  >((groups, order) => {
    const createdTimestamp = getArchivedOrderTimestamp(order);
    const key = getDateKey(createdTimestamp);
    const date = getValidDate(createdTimestamp);

    if (!groups[key]) {
      groups[key] = {
        orders: [],
        total: 0,
        timestamp: date.getTime(),
      };
    }

    groups[key].orders.push(order);
    groups[key].total += Number(order.valor_total || order.total || 0);
    return groups;
  }, {});

  const fallbackArchivedSummary = Object.entries(archivedOrdersByDay)
    .map(([date, group]) => ({
      date,
      count: group.orders.length,
      total: group.total,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const archivedSummary =
    archivedDailySummary.length > 0
      ? archivedDailySummary
      : fallbackArchivedSummary;
  const archivedGroups = archivedSummary
    .map((summary) => {
      const orders = archivedOrdersByDay[summary.date]?.orders || [];
      const date = getValidDate(`${summary.date}T12:00:00`);

      return {
        key: summary.date,
        title: formatArchivedDayLabel(date),
        description: formatArchivedDayDescription(date),
        orders: orders.sort(
          (a, b) =>
            getValidDate(getArchivedOrderTimestamp(b)).getTime() -
            getValidDate(getArchivedOrderTimestamp(a)).getTime(),
        ),
        count: summary.count,
        total: summary.total,
        timestamp: date.getTime(),
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp);
  const archivedTotalOrders = archivedSummary.reduce(
    (total, group) => total + group.count,
    0,
  );
  const listGroups =
    viewMode === "arquivados"
      ? archivedGroups
      : [
          {
            key: "cancelamentos",
            title: "Cancelamentos para análise",
            description: "Pedidos bloqueados até a decisão da loja",
            orders: filtered.filter(hasPendingCancellationRequest),
            defaultExpanded: true,
          },
          {
            key: "andamento",
            title: "Em andamento",
            description: "Recebidos, confirmados, em separação e prontos",
            orders: filtered.filter(
              (order) =>
                !hasPendingCancellationRequest(order) &&
                activeWorkStatuses.has(getOrderStatusKey(order)),
            ),
            defaultExpanded: true,
          },
          {
            key: "saiu_para_entrega",
            title: "Saiu para entrega",
            description: "Pedidos em rota com entregador",
            orders: filtered.filter(
              (order) =>
                !hasPendingCancellationRequest(order) &&
                orderStatusIs(order, "saiu_para_entrega"),
            ),
            defaultExpanded: false,
          },
          {
            key: "entregues",
            title: "Entregues",
            description: "Finalizados prontos para arquivar",
            orders: filtered.filter(
              (order) => orderStatusIs(order, "entregue") && isOrderPaid(order),
            ),
            defaultExpanded: false,
          },
          {
            key: "entregues_aguardando_pagamento",
            title: "Entregues aguardando pagamento",
            description: "Finalizados com pagamento pendente",
            orders: filtered.filter(
              (order) => orderStatusIs(order, "entregue") && !isOrderPaid(order),
            ),
            defaultExpanded: false,
          },
          {
            key: "nao_entregues",
            title: "Não entregues",
            description: "Pedidos com problema relatado pelo entregador",
            orders: filtered.filter((order) =>
              orderStatusIs(order, "nao_entregue"),
            ),
            defaultExpanded: false,
          },
          {
            key: "cancelados",
            title: "Cancelados",
            description: "Pedidos cancelados",
            orders: filtered.filter((order) =>
              orderStatusIs(order, "cancelado"),
            ),
            defaultExpanded: false,
          },
        ].filter((group) => group.orders.length > 0);
  const activeListGroup =
    listGroups.find((group) => group.key === activeListGroupKey) ||
    listGroups[0] ||
    null;
  const bairroGroups: Record<
    string,
    { orders: any[]; total: number; colorIdx: number }
  > = {};
  const bairroColorMap: Record<string, number> = {};

  deliveryOrders.forEach((o) => {
    const bairro = getOrderNeighborhood(o);
    if (!bairroGroups[bairro]) {
      bairroColorMap[bairro] =
        Object.keys(bairroColorMap).length % bairroColors.length;
      bairroGroups[bairro] = {
        orders: [],
        total: 0,
        colorIdx: bairroColorMap[bairro],
      };
    }
    bairroGroups[bairro].orders.push(o);
    bairroGroups[bairro].total += parseFloat(o.valor_total || o.total || 0);
  });

  const sortedBairros = Object.entries(bairroGroups).sort(
    (a, b) => b[1].orders.length - a[1].orders.length,
  );

  const toggleBairro = (bairro: string) => {
    setExpandedBairros((p) => ({ ...p, [bairro]: !p[bairro] }));
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  };

  const toggleSelectableOrder = (order: any, canSelect: boolean) => {
    if (!canSelect) return;
    toggleOrderSelection(order.id);
  };

  const resetDeliveryModal = () => {
    setDeliveryModalOrders(null);
    setRouteDriverId("");
    setOpenRoutes([]);
    setSelectedRouteId("");
    setConfirmStep(false);
  };

  const openDeliveryModal = (ordersToAssign: any[]) => {
    const uniqueOrders = Array.from(
      new Map(ordersToAssign.map((order) => [order.id, order])).values(),
    );
    const activeOrders = uniqueOrders.filter(
      (order) => canSelectOrderForDeliveryAssignment(order, assignedOrderIds),
    );
    if (activeOrders.length === 0) {
      showSystemNotice(
        "Nenhum pedido disponível para adicionar à entrega.",
      );
      return;
    }

    const firstCourier = couriers[0]?.id || "";
    setDeliveryModalOrders(activeOrders);
    setRouteDriverId(firstCourier);
    setSelectedRouteId("__new__");
    setConfirmStep(false);
    if (firstCourier) fetchOpenRoutes(firstCourier);
  };

  const openSelectedOrdersModal = () => {
    openDeliveryModal(selectedDeliveryOrders);
  };

  const fetchOpenRoutes = async (driverId: string) => {
    if (!driverId) {
      setOpenRoutes([]);
      return;
    }

    try {
      setLoadingOpenRoutes(true);
      const response = await api.get("/delivery-routes/open", {
        params: { driverId },
      });
      const routes = getApiList(response.data);
      setOpenRoutes(routes);
      setSelectedRouteId(routes[0]?.id || "__new__");
    } catch (error) {
      console.error("Erro ao carregar entregas abertas:", error);
      setOpenRoutes([]);
      setSelectedRouteId("__new__");
    } finally {
      setLoadingOpenRoutes(false);
    }
  };

  const handleDriverChange = (driverId: string) => {
    setRouteDriverId(driverId);
    setConfirmStep(false);
    fetchOpenRoutes(driverId);
  };

  const handleConfirmDeliveryAssignment = async () => {
    if (!deliveryModalOrders || !routeDriverId || !selectedRouteId) return;

    try {
      setConfirmingRoute(true);
      const orderIds = deliveryModalOrders.map((order) => order.id);
      if (selectedRouteId === "__new__") {
        const bairros = Array.from(
          new Set(deliveryModalOrders.map(getOrderNeighborhood)),
        ).join(", ");
        await api.post("/delivery-routes/draft", {
          driverId: routeDriverId,
          orderIds,
          routeName: `Entrega - ${bairros}`,
        });
      } else {
        await api.patch("/delivery-routes/assign-orders", {
          routeId: selectedRouteId,
          driverId: routeDriverId,
          orderIds,
        });
      }

      setSelectedOrderIds((current) =>
        current.filter((id) => !orderIds.includes(id)),
      );
      await fetchAuxiliaryData();
      resetDeliveryModal();
    } catch (err: any) {
      showSystemNotice(
        getApiErrorMessage(
          err,
          "Erro ao atualizar a entrega. Verifique os dados e tente novamente.",
        ),
      );
    } finally {
      setConfirmingRoute(false);
    }
  };

  return (
    <div className="flex h-full">
      {manualOrderOpen && canCreateManualOrder && user?.loja_id && (
        <ManualDeliveryOrderModal lojaId={user.loja_id} primaryColor={primaryColor} fiadoEnabled={fiadoEnabled} onClose={() => setManualOrderOpen(false)} onCreated={() => fetchOrders(1, true)} />
      )}
      {adminAddItemsOrder && (
        <AddOrderItemsModal
          order={adminAddItemsOrder}
          isPaid={isOrderPaid(adminAddItemsOrder, adminAddItemsOrder.id === selected?.id ? selectedPayments : [])}
          primaryColor={primaryColor}
          onClose={() => setAdminAddItemsOrder(null)}
          onAdjusted={(result) => void refreshSelectedOrderAfterAdminAdjustment(result, "Produtos adicionados ao pedido.")}
        />
      )}
      {pendingPaymentMethodOrder && (
        <PendingPaymentMethodModal
          order={pendingPaymentMethodOrder}
          currentMethod={getCurrentPaymentMethodValue(selectedPayment)}
          primaryColor={primaryColor}
          onClose={() => setPendingPaymentMethodOrder(null)}
          onUpdated={(result) => void refreshSelectedOrderAfterAdminAdjustment(result, "Forma de pagamento pendente atualizada.")}
        />
      )}
      {/* Left panel: list or bairros */}
      <div
        className={`flex flex-col ${selected ? "hidden lg:flex lg:w-1/2 xl:w-3/5" : "flex-1"}`}
      >
        <div className="border-b border-gray-200 bg-white px-4 pt-2">
          {viewMode === "arquivados" ? (
            <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Archive className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    Arquivados
                  </h1>
                  <p className="text-xs text-gray-500">
                    Pedidos agrupados pelo dia em que foram realizados
                  </p>
                </div>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                <CalendarDays className="h-4 w-4" />
                {archivedGroups.length} dia{archivedGroups.length !== 1 ? "s" : ""} · {archivedTotalOrders} pedido{archivedTotalOrders !== 1 ? "s" : ""}
              </span>
            </div>
          ) : (
            <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Tipos de pedido">
              {availableOrderTabs.map((tab) => {
                const active = typeFilter === tab.value;
                const type = tab.value.toLowerCase() as OrderCounterKey;
                const count = newOrdersCount[type];
                return (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      if (tab.value !== "Entrega") {
                        setBairroFilter("Todos");
                        if (viewMode === "bairros") changeViewMode("lista");
                      }
                      if (active && count > 0) {
                        void refreshCurrentOrderTab();
                      } else {
                        setTypeFilter(tab.value);
                      }
                    }}
                    className={`relative inline-flex min-w-24 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${active ? "text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"}`}
                    style={active ? { borderBottomColor: primaryColor, color: primaryColor } : undefined}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span
                        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                        style={{ backgroundColor: primaryColor }}
                        title={`${count} pedido${count === 1 ? " novo" : "s novos"}`}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                    {active && checkingNewOrders && (
                      <span className="absolute right-1 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-gray-300" />
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={totalNewOrdersCount === 0}
                onClick={handleNewOrdersButton}
                className="relative ml-auto my-1.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-default disabled:opacity-45"
                style={{ backgroundColor: primaryColor }}
                title={totalNewOrdersCount > 0 ? `${totalNewOrdersCount} pedido${totalNewOrdersCount === 1 ? " novo" : "s novos"}` : "Nenhum pedido novo"}
                aria-label={totalNewOrdersCount > 0 ? `Atualizar ${totalNewOrdersCount} pedidos novos` : "Nenhum pedido novo"}
              >
                <RefreshCw className={`h-4 w-4 ${checkingNewOrders ? "animate-spin" : ""}`} />
                {totalNewOrdersCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white">
                    {totalNewOrdersCount > 99 ? "99+" : totalNewOrdersCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
        {/* Filters bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-end">
              {canCreateManualOrder && (
                <button
                  type="button"
                  onClick={() => setManualOrderOpen(true)}
                  className="h-10 shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  + Criar pedido
                </button>
              )}

              <div
                className={`grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 ${viewMode === "arquivados" ? "xl:grid-cols-3 2xl:grid-cols-5" : viewMode === "bairros" ? "xl:grid-cols-3" : ""}`}
              >
                <div className="relative">
                  <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                    Busca
                  </label>
                  <Search className="absolute left-3 bottom-2.5 w-4 h-4 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Comanda, pedido ou cliente"
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1"
                  >
                    {allStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {viewMode === "arquivados" && (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                      Tipo
                    </label>
                    <select
                      value={archivedTypeFilter}
                      onChange={(e) =>
                        setArchivedTypeFilter(e.target.value as ArchivedOrderTypeFilter)
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1"
                    >
                      {archivedTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {viewMode === "arquivados" && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                        Data inicial
                      </label>
                      <input
                        type="date"
                        value={archivedStartDate}
                        max={archivedEndDate || undefined}
                        onChange={(e) => setArchivedStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                        Data final
                      </label>
                      <input
                        type="date"
                        value={archivedEndDate}
                        min={archivedStartDate || undefined}
                        onChange={(e) => setArchivedEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1"
                      />
                    </div>
                  </>
                )}

                {viewMode === "bairros" && (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                      Bairro
                    </label>
                    <select
                      value={bairroFilter}
                      onChange={(e) => setBairroFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1"
                    >
                      <option value="Todos">Todos os bairros</option>
                      {bairroOptions.map((bairro) => (
                        <option key={bairro} value={bairro}>
                          {bairro}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("Todos");
                    if (viewMode === "arquivados") {
                      setArchivedTypeFilter("Todos");
                      setArchivedStartDate("");
                      setArchivedEndDate("");
                    } else {
                      setBairroFilter("Todos");
                    }
                  }}
                  className="h-10 shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="flex shrink-0 self-start rounded-lg bg-gray-100 p-0.5 gap-0.5 xl:self-end">
              <button
                onClick={() => changeViewMode("lista")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={
                  viewMode === "lista"
                    ? { backgroundColor: PRIMARY, color: "white" }
                    : { color: "#6b7280" }
                }
              >
                <List className="w-3.5 h-3.5" /> Lista
              </button>
              {typeFilter === "Entrega" && (
                <button
                  onClick={() => changeViewMode("bairros")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={
                    viewMode === "bairros"
                      ? { backgroundColor: PRIMARY, color: "white" }
                      : { color: "#6b7280" }
                  }
                >
                  <MapIcon className="w-3.5 h-3.5" /> Por bairro
                </button>
              )}
              <button
                onClick={() => changeViewMode("arquivados")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={
                  viewMode === "arquivados"
                    ? { backgroundColor: PRIMARY, color: "white" }
                    : { color: "#6b7280" }
                }
              >
                <Archive className="w-3.5 h-3.5" /> Arquivados
              </button>
            </div>
          </div>

          {viewMode === "bairros" && (
            <div className="mt-3 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              A visualização por bairro mostra pedidos de entrega e também
              respeita busca, status e bairro selecionado.
            </div>
          )}
        </div>

        {/* Count bar */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
          {viewMode === "lista" ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500">
                {filtered.length} pedido{filtered.length !== 1 ? "s" : ""}{" "}
                encontrado{filtered.length !== 1 ? "s" : ""}
              </span>
              {selectedDeliveryCount > 0 && (
                <button
                  onClick={openSelectedOrdersModal}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                  style={{ backgroundColor: PRIMARY }}
                >
                  Adicionar {selectedDeliveryCount} à entrega
                </button>
              )}
            </div>
          ) : viewMode === "arquivados" ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-gray-500">
                {archivedTotalOrders} pedido{archivedTotalOrders !== 1 ? "s" : ""}{" "}
                arquivado{archivedTotalOrders !== 1 ? "s" : ""} em{" "}
                {archivedGroups.length} dia{archivedGroups.length !== 1 ? "s" : ""}
              </span>
              {activeListGroup && (
                <span className="text-xs font-semibold text-gray-700">
                  Dia selecionado: {activeListGroup.title}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500">
                Pedidos não atribuídos: {deliveryOrders.length} · Já atribuídos:{" "}
                {allDeliveryOrders.length - deliveryOrders.length}
              </span>
              {selectedDeliveryCount > 0 && (
                <button
                  onClick={openSelectedOrdersModal}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                  style={{ backgroundColor: PRIMARY }}
                >
                  Adicionar {selectedDeliveryCount} à entrega
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── LISTA VIEW ─────────────────────────────── */}
        {(viewMode === "lista" || viewMode === "arquivados") && (
          <>
            {listGroups.length > 0 && viewMode === "arquivados" && (
              <div className="border-b border-gray-200 bg-white px-4 py-3">
                <div
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6"
                  role="tablist"
                  aria-label="Dias arquivados"
                >
                  {listGroups.map((group) => {
                    const active = activeListGroup?.key === group.key;
                    const loadingDay = loadingArchivedDayKey === group.key;
                    return (
                      <button
                        key={group.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        title={group.description}
                        onClick={() => void fetchArchivedDayOrders(group.key)}
                        disabled={loadingDay}
                        className={`min-h-24 rounded-lg border p-3 text-left transition-all ${
                          active
                            ? "bg-white shadow-sm"
                            : "bg-gray-50 hover:bg-white hover:shadow-sm"
                        }`}
                        style={
                          active
                            ? {
                                borderColor: primaryColor,
                                boxShadow: `0 0 0 1px ${hexToRgba(primaryColor, 0.22)}`,
                              }
                            : { borderColor: "#e5e7eb" }
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="text-base font-black"
                            style={{ color: active ? primaryColor : "#111827" }}
                          >
                            {group.title}
                          </span>
                          <CalendarDays
                            className="h-4 w-4"
                            style={{ color: active ? primaryColor : "#94a3b8" }}
                          />
                          {loadingDay && (
                            <Loader2
                              className="h-4 w-4 animate-spin"
                              style={{ color: primaryColor }}
                            />
                          )}
                        </div>
                        <div className="mt-1 text-xs capitalize text-gray-500">
                          {group.description}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">
                            {group.count} pedido{group.count !== 1 ? "s" : ""}
                          </span>
                          <span className="text-xs font-bold text-gray-800">
                            R$ {group.total.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {listGroups.length > 0 && viewMode !== "arquivados" && (
              <div className="border-b border-gray-200 bg-white px-4">
                <div
                  className="flex gap-1 overflow-x-auto"
                  role="tablist"
                  aria-label="Status dos pedidos"
                >
                  {listGroups.map((group) => {
                    const active = activeListGroup?.key === group.key;
                    return (
                      <button
                        key={group.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        title={group.description}
                        onClick={() => setActiveListGroupKey(group.key)}
                        className={`relative inline-flex min-w-max items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                          active
                            ? "text-gray-900"
                            : "border-transparent text-gray-500 hover:text-gray-800"
                        }`}
                        style={
                          active
                            ? {
                                borderBottomColor: primaryColor,
                                color: primaryColor,
                              }
                            : undefined
                        }
                      >
                        {group.title}
                        <span
                          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                            active
                              ? "text-white"
                              : "bg-gray-100 text-gray-500"
                          }`}
                          style={
                            active
                              ? { backgroundColor: primaryColor }
                              : undefined
                          }
                        >
                          {group.orders.length > 99 ? "99+" : group.orders.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 space-y-4">
              {loading && orders.length === 0 && (
                <div className="flex min-h-[320px] flex-col items-center justify-center text-gray-400">
                  <div
                    className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200"
                    style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }}
                  />
                  <p className="text-sm">Carregando pedidos...</p>
                </div>
              )}
              {activeListGroup && (
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <div className="divide-y divide-gray-100">
                    {activeListGroup.orders.map((order, orderIndex) => {
                    const statusDisplay = getStatusLabel(order.status);
                    const sc = statusColor[order.status] ||
                      statusColor["Recebido"] || {
                        bg: "#fffbeb",
                        text: "#d97706",
                      };
                    const isEntrega = isDeliveryOrder(order);
                    const orderPayments =
                      selected?.id === order.id
                        ? selectedPayments
                        : getOrderEmbeddedPayments(order);
                    const orderPayment = getPreferredOrderPayment(
                      order,
                      orderPayments,
                    );
                    const orderPaymentIsPending =
                      hasPendingPaymentForDisplay(order, orderPayments);
                    const cashChangeStatusLabel = getCashChangeStatusLabel(
                      orderPayment,
                      order,
                    );
                    const canSelectForDelivery =
                      viewMode !== "arquivados" &&
                      canSelectOrderForDeliveryAssignment(
                        order,
                        assignedOrderIds,
                      );
                    const isSelectedForDelivery = selectedOrderIds.includes(
                      order.id,
                    );
                    const assignedDelivery = deliveryByOrderId.get(order.id);
                    const failureReason = getDeliveryFailureReason(order);
                    const canTakeToTable = canTakeSalaoOrderToTable(order);
                    const takingToTable = updatingStatusOrderId === order.id;
                    const dailyTicketNumber = getDailyTicketNumber(order);
                    const rowBgClass = isSelectedForDelivery
                      ? ""
                      : orderIndex % 2 === 0
                        ? "bg-white"
                        : "bg-slate-50";

                    return (
                      <div
                        key={order.id}
                        onClick={() =>
                          toggleSelectableOrder(order, canSelectForDelivery)
                        }
                        onKeyDown={(event) => {
                          if (!canSelectForDelivery) return;
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleOrderSelection(order.id);
                          }
                        }}
                        role={canSelectForDelivery ? "checkbox" : undefined}
                        aria-checked={
                          canSelectForDelivery
                            ? isSelectedForDelivery
                            : undefined
                        }
                        tabIndex={canSelectForDelivery ? 0 : undefined}
                        className={`px-4 py-3.5 transition-colors border-l-2 ${rowBgClass} ${canSelectForDelivery ? "cursor-pointer hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset" : "cursor-default"} ${isSelectedForDelivery ? "" : "border-transparent"}`}
                        style={
                          isSelectedForDelivery
                            ? {
                                backgroundColor: hexToRgba(primaryColor, 0.12),
                                borderLeftColor: primaryColor,
                                boxShadow: `inset 0 0 0 1px ${hexToRgba(primaryColor, 0.22)}`,
                              }
                            : ({
                                borderLeftColor: "transparent",
                                "--tw-ring-color": hexToRgba(
                                  primaryColor,
                                  0.35,
                                ),
                              } as any)
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {canSelectForDelivery && (
                              <span
                                aria-hidden="true"
                                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
                                style={{
                                  borderColor: isSelectedForDelivery
                                    ? primaryColor
                                    : "#cbd5e1",
                                  backgroundColor: isSelectedForDelivery
                                    ? primaryColor
                                    : "#fff",
                                }}
                              >
                                {isSelectedForDelivery && (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                )}
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {dailyTicketNumber && (
                                  <span className="rounded-md border border-slate-300 bg-white px-2 py-0.5 font-mono text-sm font-black text-slate-900">
                                    Comanda {dailyTicketNumber}
                                  </span>
                                )}
                                <span className="text-sm font-semibold text-gray-800">
                                  {order.numero_pedido || order.id}
                                </span>
                                <span
                                  className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                                  style={{
                                    backgroundColor: sc.bg,
                                    color: sc.text,
                                  }}
                                >
                                  {statusDisplay}
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                  {getOrderTypeLabel(order)}
                                </span>
                                {viewMode === "arquivados" && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                    Arquivado
                                  </span>
                                )}
                                {orderPaymentIsPending && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                    Pagamento pendente
                                  </span>
                                )}
                                {hasPendingCancellationRequest(order) && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                                    Cancelamento para análise
                                  </span>
                                )}
                                {isEntrega &&
                                  assignedDelivery?.entregador_id && (
                                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                                      <span>Atribuído</span>
                                      <button
                                        type="button"
                                        title="Desvincular entregador"
                                        aria-label="Desvincular entregador"
                                        disabled={
                                          unassigningDeliveryId ===
                                          assignedDelivery.id
                                        }
                                        onClick={(event) =>
                                          handleUnassignCourier(
                                            assignedDelivery,
                                            event,
                                          )
                                        }
                                        className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                                      >
                                        {unassigningDeliveryId ===
                                        assignedDelivery.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <ArrowLeft className="h-3 w-3" />
                                        )}
                                      </button>
                                    </span>
                                  )}
                              </div>
                              <div className="text-sm text-gray-600 mt-0.5">
                                {order.cliente?.nome ||
                                  order.customer ||
                                  "Desconhecido"}
                              </div>
                              {order.status === "nao_entregue" && (
                                <div className="mt-1 rounded-md border border-red-100 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                                  Problema na entrega
                                  {failureReason ? `: ${failureReason}` : ""}
                                </div>
                              )}
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {viewMode === "arquivados"
                                    ? `Criado em ${formatOrderDateTime(getOrderCreatedTimestamp(order))}`
                                    : formatOrderDateTime(
                                        order.realizado_em ||
                                          order.criado_em ||
                                          order.created_at ||
                                          new Date(),
                                      )}
                                </span>
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <CreditCard className="w-3 h-3" />
                                  {getOrderPaymentMethod(order, orderPayment)}
                                </span>
                                {cashChangeStatusLabel && (
                                  <span
                                    className={`text-xs font-semibold flex items-center gap-1 ${
                                      cashChangeStatusLabel === "Troco repassado"
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {cashChangeStatusLabel}
                                  </span>
                                )}
                                {isEntrega && (
                                  <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {getOrderNeighborhood(order)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-semibold text-gray-800">
                              R${" "}
                              {parseFloat(order.valor_total || order.total || 0)
                                .toFixed(2)
                                .replace(".", ",")}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectOrder(order);
                              }}
                              className="mt-1 text-xs flex items-center gap-1 ml-auto hover:underline"
                              style={{ color: PRIMARY }}
                            >
                              <Eye className="w-3 h-3" /> Detalhes
                            </button>
                            {viewMode !== "arquivados" &&
                              canQuickArchiveOrder(order) && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void toggleArchivedOrder(order);
                                  }}
                                  disabled={archivingOrderId === order.id}
                                  className="mt-1 text-xs flex items-center gap-1 ml-auto font-semibold text-gray-600 hover:text-gray-900 hover:underline disabled:cursor-wait disabled:opacity-70"
                                >
                                  {archivingOrderId === order.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Archive className="h-3 w-3" />
                                  )}
                                  Arquivar
                                </button>
                              )}
                            {canForceFinalizeOrder(order) && (
                              <button
                                type="button"
                                onClick={(event) =>
                                  openForceFinalizeConfirm(order, event)
                                }
                                disabled={forceFinalizingOrderId === order.id}
                                className="mt-1 text-xs flex items-center gap-1 ml-auto font-semibold text-red-600 hover:underline disabled:cursor-wait disabled:opacity-70"
                              >
                                {forceFinalizingOrderId === order.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3" />
                                )}
                                Pular etapas
                              </button>
                            )}
                            {canTakeToTable && (
                              <button
                                type="button"
                                onClick={(event) =>
                                  void takeSalaoOrderToTable(order, event)
                                }
                                disabled={takingToTable}
                                className="mt-2 ml-auto inline-flex items-center justify-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-wait disabled:opacity-70"
                              >
                                {takingToTable ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                                Levar pra mesa
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </section>
              )}

            {hasMore && viewMode !== "arquivados" && (
              <div className="p-4 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-2 rounded-full border text-sm font-medium transition-colors hover:bg-gray-50 flex items-center gap-2"
                  style={{ borderColor: PRIMARY, color: PRIMARY }}
                >
                  {loading ? (
                    <div
                      className="w-4 h-4 border-2 border-gray-200 border-t-primary rounded-full animate-spin"
                      style={{ borderTopColor: PRIMARY }}
                    ></div>
                  ) : (
                    "Carregar mais pedidos"
                  )}
                </button>
              </div>
            )}

            {(filtered.length === 0 || listGroups.length === 0) && !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Package className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">
                  {viewMode === "arquivados"
                    ? "Nenhum pedido arquivado encontrado"
                    : "Nenhum pedido encontrado"}
                </p>
              </div>
            )}
            </div>
          </>
        )}

        {/* ── POR BAIRRO VIEW ────────────────────────── */}
        {viewMode === "bairros" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && orders.length === 0 && (
              <div className="flex min-h-[320px] flex-col items-center justify-center text-gray-400">
                <div
                  className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200"
                  style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }}
                />
                <p className="text-sm">Carregando pedidos...</p>
              </div>
            )}
            {sortedBairros.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <TruckIcon className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">Nenhum pedido de entrega encontrado</p>
              </div>
            )}
            {sortedBairros.map(([bairro, group], idx) => {
              const col = bairroColors[group.colorIdx];
              const isExpanded = expandedBairros[bairro] !== false; // expanded by default
              const activeOrders = group.orders.filter(
                (o) => canSelectOrderForDeliveryAssignment(o, assignedOrderIds),
              );
              const deliveredCount = group.orders.filter((o) =>
                ["entregue", "Entregue"].includes(o.status),
              ).length;
              return (
                <div
                  key={bairro}
                  className="rounded-xl border overflow-hidden"
                  style={{ borderColor: col.border, backgroundColor: col.bg }}
                >
                  {/* Bairro header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                    onClick={() => toggleBairro(bairro)}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                      style={{ backgroundColor: col.dot }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-semibold text-sm"
                          style={{ color: col.text }}
                        >
                          {bairro}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                          style={{ backgroundColor: col.dot }}
                        >
                          {group.orders.length} pedido
                          {group.orders.length !== 1 ? "s" : ""}
                        </span>
                        {activeOrders.length > 0 && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white border"
                            style={{ color: col.text, borderColor: col.border }}
                          >
                            {activeOrders.length} ativo
                            {activeOrders.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {deliveredCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                            {deliveredCount} entregue
                            {deliveredCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div
                        className="text-xs mt-0.5"
                        style={{ color: col.text, opacity: 0.75 }}
                      >
                        Total: R$ {group.total.toFixed(2).replace(".", ",")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeliveryModal(activeOrders);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors hover:opacity-80"
                        style={{
                          borderColor: col.border,
                          backgroundColor: PRIMARY,
                          color: "white",
                        }}
                        title="Adicionar pedidos deste bairro a uma entrega"
                      >
                        <Navigation className="w-3 h-3" />
                        <span className="hidden sm:inline">Adicionar</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          printBairroRoute(
                            bairro,
                            group.orders,
                            storePrintData,
                          );
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors hover:opacity-80"
                        style={{
                          borderColor: col.border,
                          backgroundColor: "white",
                          color: col.text,
                        }}
                        title="Imprimir folha de rota"
                      >
                        <Printer className="w-3 h-3" />
                        <span className="hidden sm:inline">Imprimir</span>
                      </button>
                      {isExpanded ? (
                        <ChevronDown
                          className="w-4 h-4 flex-shrink-0"
                          style={{ color: col.text }}
                        />
                      ) : (
                        <ChevronRight
                          className="w-4 h-4 flex-shrink-0"
                          style={{ color: col.text }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Orders in this bairro */}
                  {isExpanded && (
                    <div
                      className="bg-white border-t divide-y"
                      style={{ borderColor: col.border }}
                    >
                      {group.orders.map((order, oIdx) => {
                        const statusDisplay = getStatusLabel(order.status);
                        const sc = statusColor[order.status] ||
                          statusColor["Recebido"] || {
                            bg: "#eee",
                            text: "#666",
                          };
                        const orderPayments =
                          selected?.id === order.id
                            ? selectedPayments
                            : getOrderEmbeddedPayments(order);
                        const orderPayment = getPreferredOrderPayment(
                          order,
                          orderPayments,
                        );
                        const orderPaymentIsPending =
                          hasPendingPaymentForDisplay(order, orderPayments);
                        const cashChangeStatusLabel = getCashChangeStatusLabel(
                          orderPayment,
                          order,
                        );
                        const canSelectForDelivery =
                          canSelectOrderForDeliveryAssignment(
                            order,
                            assignedOrderIds,
                          );
                        const isSelectedForDelivery = selectedOrderIds.includes(
                          order.id,
                        );
                        const failureReason = getDeliveryFailureReason(order);
                        const dailyTicketNumber = getDailyTicketNumber(order);
                        return (
                          <div
                            key={order.id}
                            className={`flex items-center gap-3 px-4 py-3 transition-colors border-l-2 ${canSelectForDelivery ? "hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset" : "cursor-default"} ${isSelectedForDelivery ? "" : "border-transparent"}`}
                            onClick={() =>
                              toggleSelectableOrder(order, canSelectForDelivery)
                            }
                            onKeyDown={(event) => {
                              if (!canSelectForDelivery) return;
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                toggleOrderSelection(order.id);
                              }
                            }}
                            role={canSelectForDelivery ? "checkbox" : undefined}
                            aria-checked={
                              canSelectForDelivery
                                ? isSelectedForDelivery
                                : undefined
                            }
                            tabIndex={canSelectForDelivery ? 0 : undefined}
                            style={
                              isSelectedForDelivery
                                ? {
                                    backgroundColor: hexToRgba(
                                      primaryColor,
                                      0.12,
                                    ),
                                    borderLeftColor: primaryColor,
                                    boxShadow: `inset 0 0 0 1px ${hexToRgba(primaryColor, 0.22)}`,
                                  }
                                : ({
                                    borderLeftColor: "transparent",
                                    "--tw-ring-color": hexToRgba(
                                      primaryColor,
                                      0.35,
                                    ),
                                  } as any)
                            }
                          >
                            {canSelectForDelivery && (
                              <span
                                aria-hidden="true"
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
                                style={{
                                  borderColor: isSelectedForDelivery
                                    ? primaryColor
                                    : "#cbd5e1",
                                  backgroundColor: isSelectedForDelivery
                                    ? primaryColor
                                    : "#fff",
                                }}
                              >
                                {isSelectedForDelivery && (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                )}
                              </span>
                            )}
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
                              style={{
                                backgroundColor: col.dot,
                                fontSize: "10px",
                                fontWeight: 700,
                              }}
                            >
                              {oIdx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {dailyTicketNumber && (
                                  <span className="rounded-md border border-slate-300 bg-white px-2 py-0.5 font-mono text-sm font-black text-slate-900">
                                    Comanda {dailyTicketNumber}
                                  </span>
                                )}
                                <span className="text-sm font-semibold text-gray-800">
                                  {order.numero_pedido || order.id}
                                </span>
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                                  style={{
                                    backgroundColor: sc.bg,
                                    color: sc.text,
                                  }}
                                >
                                  {statusDisplay}
                                </span>
                                {orderPaymentIsPending && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                    Pagamento pendente
                                  </span>
                                )}
                                {hasPendingCancellationRequest(order) && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                                    Cancelamento para análise
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5 truncate">
                                {order.cliente?.nome || order.customer}
                              </div>
                              {order.status === "nao_entregue" && (
                                <div className="mt-1 rounded-md border border-red-100 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                                  Problema na entrega
                                  {failureReason ? `: ${failureReason}` : ""}
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-0.5 truncate">
                                {getOrderStreetAddress(order)}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-gray-400">
                                  {order.cliente?.telefone || order.phone}
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  · {getOrderPaymentMethod(order, orderPayment)}
                                </span>
                                {cashChangeStatusLabel && (
                                  <span
                                    className={`text-[11px] font-semibold ${
                                      cashChangeStatusLabel === "Troco repassado"
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    · {cashChangeStatusLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-semibold text-gray-700">
                                R${" "}
                                {parseFloat(
                                  order.valor_total || order.total || 0,
                                )
                                  .toFixed(2)
                                  .replace(".", ",")}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrintComanda(order);
                                  }}
                                  className="text-[11px] flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors"
                                  title="Imprimir comanda"
                                >
                                  <Printer className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openItemsChecklist(order);
                                  }}
                                  className="text-[11px] flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors"
                                  title="Ver produtos"
                                >
                                  <Package className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOrder(order);
                                  }}
                                  className="text-[11px] flex items-center gap-1 hover:underline"
                                  style={{ color: PRIMARY }}
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                              </div>
                              {canQuickArchiveOrder(order) && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void toggleArchivedOrder(order);
                                  }}
                                  disabled={archivingOrderId === order.id}
                                  className="mt-1 ml-auto flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-gray-900 hover:underline disabled:cursor-wait disabled:opacity-70"
                                >
                                  {archivingOrderId === order.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Archive className="h-3 w-3" />
                                  )}
                                  Arquivar
                                </button>
                              )}
                              {canForceFinalizeOrder(order) && (
                                <button
                                  type="button"
                                  onClick={(event) =>
                                    openForceFinalizeConfirm(order, event)
                                  }
                                  disabled={forceFinalizingOrderId === order.id}
                                  className="mt-1 ml-auto flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:underline disabled:cursor-wait disabled:opacity-70"
                                >
                                  {forceFinalizingOrderId === order.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <AlertTriangle className="h-3 w-3" />
                                  )}
                                  Pular etapas
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deliveryModalOrders && (
        <DeliveryAssignmentModal
          orders={deliveryModalOrders}
          confirmStep={confirmStep}
          couriers={couriers}
          routeDriverId={routeDriverId}
          openRoutes={openRoutes}
          selectedRouteId={selectedRouteId}
          loadingOpenRoutes={loadingOpenRoutes}
          confirmingRoute={confirmingRoute}
          onClose={resetDeliveryModal}
          onDriverChange={handleDriverChange}
          onSelectRoute={setSelectedRouteId}
          onConfirmStepChange={setConfirmStep}
          onConfirm={handleConfirmDeliveryAssignment}
        />
      )}

      {forceFinalizeCandidate && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Finalizar pedido agora?
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Esta ação pula todas as etapas operacionais e marca o pedido
                  como entregue.
                </p>
              </div>
            </div>

            {forceFinalizeWillSettlePayment && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                O pagamento ainda não consta como pago. Ao confirmar, a conta
                também será finalizada como paga.
              </div>
            )}

            {isFiadoOrder(forceFinalizeCandidate) && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                Este pedido e fiado. A finalizacao encerra apenas o fluxo
                operacional; a conta continua aberta no modulo Fiados.
              </div>
            )}

            <div className="mt-5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
              Use apenas quando precisar encerrar o pedido manualmente,
              ignorando entregador, pagamento pendente, agendamento e etapas
              intermediárias.
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForceFinalizeConfirm}
                disabled={Boolean(forceFinalizingOrderId)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-70"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => void forceFinalizeOrder()}
                disabled={Boolean(forceFinalizingOrderId)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-70"
              >
                {forceFinalizingOrderId ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmar finalização
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {checklistOrder && (
        <OrderItemsChecklistModal
          order={checklistOrder}
          items={checklistItems}
          loading={checklistLoading}
          error={checklistError}
          onClose={() => setChecklistOrder(null)}
        />
      )}

      {refundModalOpen && selected && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Reembolsar pedido
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Pedido {selected.numero_pedido || selected.id} · saldo{" "}
                  {formatCurrency(selectedRefundableAmount)}
                </p>
              </div>
              <button type="button" onClick={closeRefundModal}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
                {[
                  { value: "produto_em_falta", label: "Produto em falta" },
                  { value: "outro_motivo", label: "Outro motivo" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setRefundMode(option.value as typeof refundMode)
                    }
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      refundMode === option.value
                        ? "bg-white text-blue-950 shadow-sm"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {refundMode === "produto_em_falta" ? (
                <div className="mt-5 space-y-3">
                  {selectedItemsLoading && (
                    <p className="text-sm text-gray-500">
                      Carregando produtos...
                    </p>
                  )}
                  {!selectedItemsLoading && selectedItems.length === 0 && (
                    <p className="rounded-lg bg-gray-50 px-3 py-3 text-sm text-gray-500">
                      Nenhum produto encontrado para este pedido.
                    </p>
                  )}
                  {!selectedItemsLoading &&
                    selectedItems.map((item, index) => {
                      const key = getOrderItemChecklistId(item, index);
                      const quantity = getOrderItemQuantity(item);
                      const unitPrice =
                        quantity > 0 ? getOrderItemTotal(item) / quantity : 0;

                      return (
                        <div
                          key={key}
                          className="rounded-xl border border-gray-200 p-3"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800">
                                {quantity}x {getOrderItemName(item)}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                Unitário {formatCurrency(unitPrice)} · total{" "}
                                {formatCurrency(getOrderItemTotal(item))}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <label
                                className="text-xs font-medium text-gray-500"
                                htmlFor={`refund-item-${key}`}
                              >
                                Faltou
                              </label>
                              <input
                                id={`refund-item-${key}`}
                                type="number"
                                min="0"
                                max={quantity}
                                step="1"
                                value={refundMissingQuantities[key] || ""}
                                onChange={(event) =>
                                  setRefundMissingQuantities((prev) => ({
                                    ...prev,
                                    [key]: event.target.value,
                                  }))
                                }
                                className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  <label className="block text-sm font-medium text-gray-700">
                    Observação opcional
                    <textarea
                      value={refundReason}
                      onChange={(event) => setRefundReason(event.target.value)}
                      className="mt-1 min-h-20 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Ex.: cliente aceitou seguir com o restante do pedido"
                    />
                  </label>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Valor do reembolso
                    <input
                      value={refundAmount}
                      onChange={(event) => setRefundAmount(event.target.value)}
                      inputMode="decimal"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="0,00"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Motivo
                    <textarea
                      value={refundReason}
                      onChange={(event) => setRefundReason(event.target.value)}
                      className="mt-1 min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Descreva o motivo para o cliente"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-600">
                  Total do reembolso
                </span>
                <span className="text-lg font-bold text-blue-950">
                  {formatCurrency(refundPreviewAmount)}
                </span>
              </div>
              {refundMode === "produto_em_falta" &&
                missingItemsRefundAmount > refundPreviewAmount && (
                  <p className="mb-3 text-xs text-gray-500">
                    Desconto do pedido rateado nos itens em falta: -{formatCurrency(
                      missingItemsRefundAmount - refundPreviewAmount,
                    )}
                  </p>
                )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeRefundModal}
                  disabled={refundSubmitting}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void requestRefundApproval()}
                  disabled={refundSubmitting}
                  className="rounded-lg bg-blue-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Confirmar reembolso
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL PANEL ───────────────────────────────── */}
      {selected && (
        <div className="flex-1 lg:border-l border-gray-200 overflow-y-auto bg-white">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3.5 flex items-center gap-3 z-10">
            <button
              onClick={() => setSelected(null)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-gray-900 font-semibold">
                  Pedido {selected.numero_pedido || selected.id}
                </h2>
                {getDailyTicketNumber(selected) && (
                  <span className="rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 font-mono text-sm font-black text-slate-900">
                    Comanda {getDailyTicketNumber(selected)}
                  </span>
                )}
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: (
                      statusColor[selected.status] ||
                      statusColor["Recebido"] || { bg: "#eee", text: "#666" }
                    ).bg,
                    color: (
                      statusColor[selected.status] ||
                      statusColor["Recebido"] || { bg: "#eee", text: "#666" }
                    ).text,
                  }}
                >
                  {getStatusLabel(selected.status)}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {formatOrderDateTime(
                  selected.realizado_em ||
                    selected.criado_em ||
                    selected.created_at ||
                    new Date(),
                )}{" "}
                ·{" "}
                {getOrderTypeLabel(selected)}
              </div>
              {selected.agendado_para && (
                <div className="text-xs text-amber-700 mt-1">
                  Entrega agendada para{" "}
                  {formatOrderDateTime(selected.agendado_para)}
                </div>
              )}
            </div>
            {!selectedIsSalao && <button
              onClick={() => handlePrintComanda(selectedForPrint)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              title="Imprimir comanda"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Imprimir</span>
            </button>}
            {!selectedIsSalao && <button
              onClick={() => openItemsChecklist(selected)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              title="Ver produtos"
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Ver produtos</span>
            </button>}
            <button
              onClick={() => setSelected(null)}
              className="hidden lg:block text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Timeline */}
            {!selectedIsSalao && <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start gap-1 overflow-x-auto pb-1">
                {(() => {
                  const baseFlow =
                    String(
                      selected.tipo_pedido || selected.type || "",
                    ).toLowerCase() === "retirada"
                      ? statusFlow.filter(
                          (status) => status !== "Saiu para Entrega",
                        )
                      : statusFlow;

                  return selected.status === "nao_entregue"
                    ? baseFlow.map((status) =>
                        status === "Entregue" ? "Não entregue" : status,
                      )
                    : baseFlow;
                })().map((s, i, visibleStatusFlow) => {
                  const isFailedStep =
                    selected.status === "nao_entregue" && s === "Não entregue";
                  const currentDisplay = isFailedStep
                    ? "Não entregue"
                    : getStatusLabel(selected.status);
                  const currentFlowIndex =
                    visibleStatusFlow.indexOf(currentDisplay);
                  const curIdx = currentFlowIndex >= 0 ? currentFlowIndex : 0;
                  const isPaymentPendingConfirmationStep =
                    s === "Confirmado" && selectedPaymentKeepsConfirmationPending;
                  const done =
                    isFailedStep || isPaymentPendingConfirmationStep ? false : i <= curIdx;
                  const connectorDone =
                    i < curIdx && !isPaymentPendingConfirmationStep;
                  const connectorFailed =
                    selected.status === "nao_entregue" &&
                    visibleStatusFlow[i + 1] === "Não entregue";
                  return (
                    <div
                      key={s}
                      className="flex items-start gap-1 flex-shrink-0"
                    >
                      <div className="flex w-14 flex-col items-center">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: isFailedStep
                              ? "#dc2626"
                              : isPaymentPendingConfirmationStep
                                ? "#f59e0b"
                              : done
                                ? PRIMARY
                                : "#e5e7eb",
                          }}
                        >
                          {isFailedStep ? (
                            <CircleX className="w-3.5 h-3.5 text-white" />
                          ) : done ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          ) : isPaymentPendingConfirmationStep ? (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                          )}
                        </div>
                        <span
                          className={`mt-1 min-h-[22px] max-w-14 text-center text-[9px] leading-tight ${isFailedStep ? "font-semibold text-red-700" : "text-gray-500"}`}
                        >
                          {s}
                        </span>
                      </div>
                      {i < visibleStatusFlow.length - 1 && (
                        <div
                          className="mt-3 h-0.5 w-6 flex-shrink-0"
                          style={{
                            backgroundColor: connectorDone
                              ? connectorFailed
                                ? "#dc2626"
                                : PRIMARY
                              : "#e5e7eb",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>}

            {!selectedIsSalao && selected.status === "nao_entregue" && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <h4 className="mb-1 text-sm font-semibold text-red-800">
                  Pedido não entregue
                </h4>
                <p className="text-sm text-red-700">
                  Problema relatado pelo entregador
                  {getDeliveryFailureReason(selected)
                    ? `: ${getDeliveryFailureReason(selected)}`
                    : "."}
                </p>
                <p className="mt-2 text-sm font-medium text-red-800">
                  Entre em contato com o cliente pelo WhatsApp para combinar os
                  próximos passos.
                </p>
                {selectedCustomerWhatsappUrl ? (
                  <a
                    href={selectedCustomerWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Abrir WhatsApp do cliente
                  </a>
                ) : (
                  <div className="mt-3 rounded-lg border border-red-200 bg-white/70 px-3 py-2 text-sm font-medium text-red-800">
                    Cliente sem telefone cadastrado.
                  </div>
                )}
                <button
                  onClick={(event) => void handleRetryDelivery(selected, event)}
                  disabled={selectedOrderUpdating}
                  aria-busy={selectedStatusUpdating}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
                >
                  {selectedStatusUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      Tentar entrega novamente
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Customer info */}
            {!selectedIsSalao && <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h4 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
                <User className="w-4 h-4" style={{ color: PRIMARY }} /> Dados do
                Cliente
              </h4>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-800">
                  {selected.cliente?.nome || selected.customer || "Sem nome"}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="w-3.5 h-3.5" />
                  {getOrderCustomerPhone(selected) || "Sem telefone"}
                </div>
                {selected.cpf_na_nota && (
                  <div className="text-sm text-gray-500">
                    <span className="font-medium text-gray-700">
                      CPF na nota:
                    </span>{" "}
                    {selected.cpf_na_nota_cpf || "Informado"}
                  </div>
                )}
                {(selected.tipo_pedido || selected.type || "").toLowerCase() ===
                  "entrega" && (
                  <>
                    <div className="flex items-start gap-2 text-sm text-gray-500">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>{getOrderAddress(selected)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: "#e0e7ff", color: "#3730a3" }}
                      >
                        Bairro: {getOrderNeighborhood(selected)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>}

            {/* Items */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h4 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" style={{ color: PRIMARY }} /> Itens
                do Pedido
              </h4>
              <div className="space-y-2.5">
                {selectedItemsLoading && (
                  <p className="text-sm text-gray-500">
                    Carregando produtos...
                  </p>
                )}
                {!selectedItemsLoading && selectedItems.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Nenhum produto encontrado para este pedido.
                  </p>
                )}
                {!selectedItemsLoading &&
                  selectedItems.map((item: any, idx: number) => {
                    const configurationLines = getOrderItemConfigurationLines(item);

                    return (
                      <div
                        key={item.id || idx}
                        className="flex items-start justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-gray-700">
                            {getOrderItemQuantity(item)}x {getOrderItemName(item)}
                          </div>
                          {configurationLines.length > 0 && (
                            <div className="mt-1 space-y-0.5 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                              {configurationLines.map((line, lineIndex) => (
                                <div key={`${item.id || idx}-configuration-${lineIndex}`} className="break-words text-xs text-slate-600">
                                  {line}
                                </div>
                              ))}
                            </div>
                          )}
                          {(item.observacoes || item.obs) && (
                            <div className="text-xs text-gray-400 italic mt-0.5">
                              {item.observacoes || item.obs}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-sm font-medium text-gray-700">
                          R${" "}
                          {getOrderItemTotal(item).toFixed(2).replace(".", ",")}
                        </div>
                      </div>
                    );
                  })}
              </div>
              {!selectedIsSalao && <div className="border-t border-gray-100 mt-3 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>
                    R${" "}
                    {parseFloat(selected.subtotal || selected.total || 0)
                      .toFixed(2)
                      .replace(".", ",")}
                  </span>
                </div>
                {(selected.tipo_pedido || selected.type || "").toLowerCase() ===
                "entrega" ? (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Taxa de entrega</span>
                    <span>
                      R${" "}
                      {parseFloat(
                        selected.taxa_entrega ??
                          storePrintData?.taxa_entrega_padrao ??
                          0,
                      )
                        .toFixed(2)
                        .replace(".", ",")}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{selectedIsSalao ? "Consumo no salão" : "Retirada na loja"}</span>
                    <span className="text-green-600">Grátis</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Desconto</span>
                  <span className="text-green-600">
                    -R${" "}
                    {parseFloat(selected.desconto || 0)
                      .toFixed(2)
                      .replace(".", ",")}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-gray-800">
                  <span>Total</span>
                  <span>
                    R${" "}
                    {parseFloat(selected.valor_total || selected.total || 0)
                      .toFixed(2)
                      .replace(".", ",")}
                  </span>
                </div>
              </div>}
            </div>

            {/* Payment */}
            {selectedIsFiado && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h4 className="text-sm font-semibold text-amber-900">
                  Pedido fiado
                </h4>
                <p className="mt-1 text-sm text-amber-800">
                  A conta e os recebimentos deste pedido sao gerenciados no
                  modulo Fiados.
                </p>
                {selectedPaymentStatus !== "NÃ£o informado" && (
                  <div className={`mt-2 text-xs font-semibold ${selectedPaymentStatusClass}`}>
                    {selectedPaymentStatusLabel}
                  </div>
                )}
              </div>
            )}
            {!selectedIsFiado && <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h4 className="text-gray-700 font-semibold mb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4" style={{ color: PRIMARY }} />{" "}
                Pagamento
              </h4>
              <div className="text-sm text-gray-600">
                {selectedPaymentMethod}
              </div>
              {selectedPaymentStatus !== "Não informado" && (
                <div
                  className={`mt-1 text-xs font-medium ${selectedPaymentStatusClass}`}
                >
                  {selectedIsPaid ? "✓ " : ""}
                  {selectedPaymentStatusLabel}
                </div>
              )}
              {selectedPayments.length > 1 && (
                <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Pagamentos registrados
                  </div>
                  {selectedPayments.map((payment) => {
                    const isComplement = payment?.metadata?.tipo === "pagamento_complementar";
                    const isSelectedCurrent = payment?.id === selectedPayment?.id;
                    const isCurrent = isSelectedCurrent || isCurrentPaymentRecord(payment);
                    return (
                      <div
                        key={payment.id}
                        className={`rounded-lg border px-3 py-2 text-xs transition-opacity ${
                          isCurrent
                            ? "border-blue-100 bg-blue-50 opacity-100"
                            : "border-gray-100 bg-gray-50 opacity-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-semibold text-gray-700">
                              {isComplement ? "Complemento" : "Original"} - {getOrderPaymentMethod({ pagamento: payment }, payment)}
                            </span>
                            {isSelectedCurrent && (
                              <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                Atual
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-gray-800">{formatCurrency(payment.valor)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-gray-500">
                          <span className="capitalize">{String(payment.status || "").replace(/_/g, " ")}</span>
                          {payment.pago_em && <span>{formatBrasiliaDate(payment.pago_em)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {!selectedIsPaid && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {selectedIsPendingCash
                    ? selectedIsCardOnDelivery
                      ? "Pagamento em cartão pendente de recebimento."
                      : "Pagamento pendente de recebimento pelo caixa."
                    : "Pagamento pendente"}
                </div>
              )}
              {selectedIsPendingCash && (
                <button
                  type="button"
                  onClick={confirmCashPayment}
                  disabled={!selectedPayment?.id || confirmingCashPaymentId === selectedPayment.id}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:cursor-wait disabled:opacity-70"
                >
                  {confirmingCashPaymentId === selectedPayment?.id && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Marcar pagamento como recebido
                </button>
              )}
              {selectedCanChangePendingPayment && (
                <button
                  type="button"
                  onClick={() => setPendingPaymentMethodOrder(selected)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Alterar forma de pagamento
                </button>
              )}
              {selectedCashChangeInfo && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {selectedIsCardOnDelivery ? "Cobrança" : "Troco"}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-gray-700">
                    {selectedCashChangeInfo}
                  </div>
                  {selectedCashChangeStatusLabel && (
                    <div
                      className={`mt-1 text-xs font-semibold ${
                        selectedCashChangeStatusLabel === "Troco repassado"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {selectedCashChangeStatusLabel}
                    </div>
                  )}
                </div>
              )}
              {selectedNeedsCashChange && (
                <label className="mt-3 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">
                  <input
                    type="checkbox"
                    checked={selectedCashChangePaidToCourier}
                    disabled={
                      !selectedPayment?.id ||
                      updatingCashChangePaymentId === selectedPayment.id
                    }
                    onChange={(event) =>
                      void updateCashChangePaidToCourier(event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 rounded border-green-300"
                  />
                  <span>
                    Troco pago ao entregador
                    {updatingCashChangePaymentId === selectedPayment?.id && (
                      <span className="ml-2 font-medium text-green-700">
                        Atualizando...
                      </span>
                    )}
                  </span>
                </label>
              )}
              {selectedRefunds.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-500">
                    <span>Reembolsos</span>
                    <span>{formatCurrency(selectedRefundedAmount)}</span>
                  </div>
                  <div className="space-y-2">
                    {selectedRefunds.map((refund) => {
                      const metadata = refund.metadata || {};
                      const missingItems = Array.isArray(
                        metadata.itens_faltantes,
                      )
                        ? metadata.itens_faltantes
                        : [];
                      return (
                        <div
                          key={refund.id}
                          className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-blue-900">
                              {formatCurrency(refund.valor)}
                            </span>
                            <span className="capitalize text-blue-700">
                              {String(refund.status || "").replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-blue-800">
                            {refund.motivo ||
                              (metadata.tipo === "produto_em_falta"
                                ? "Produto em falta"
                                : "Reembolso")}
                          </p>
                          {missingItems.length > 0 && (
                            <p className="mt-1 text-[11px] text-blue-700">
                              {missingItems
                                .map(
                                  (item: any) =>
                                    `${item.quantidade_faltante}x ${item.nome_produto}`,
                                )
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500">
                    Saldo disponível: {formatCurrency(selectedRefundableAmount)}
                  </div>
                </div>
              )}
            </div>}

            {/* Delivery Person Assignment */}
            {!selectedIsSalao && selectedCancellationPending && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  Cancelamento aguardando análise
                </h4>
                <p className="mt-1 text-sm text-red-700">
                  O pedido está bloqueado para avanço e atribuição de entrega
                  até a decisão da loja.
                </p>
                {getCancellationRequest(selected)?.erro_estorno && (
                  <p className="mt-2 text-xs text-red-700">
                    Falha no estorno automático:{" "}
                    {getCancellationRequest(selected).erro_estorno}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => openCancellationReview(selected)}
                  className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                >
                  Analisar cancelamento
                </button>
              </div>
            )}

            {/* Delivery Person Assignment */}
            {(selected.tipo_pedido || selected.type || "").toLowerCase() ===
              "entrega" && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h4 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
                  <TruckIcon className="w-4 h-4" style={{ color: PRIMARY }} />{" "}
                  Entregador
                </h4>

                <div className="space-y-3">
                  {currentDelivery?.entregador_id ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-800">
                            {couriers.find(
                              (c) => c.id === currentDelivery.entregador_id,
                            )?.nome || "Entregador atribuído"}
                          </div>
                          <div className="text-[10px] text-gray-400 capitalize">
                            Status: {currentDelivery.status.replace("_", " ")}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        title="Desvincular entregador"
                        aria-label="Desvincular entregador"
                        disabled={unassigningDeliveryId === currentDelivery.id}
                        onClick={(event) =>
                          handleUnassignCourier(currentDelivery, event)
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        {unassigningDeliveryId === currentDelivery.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowLeft className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Nenhum entregador atribuído.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              {!selectedIsSalao && <>
              {getStatusLabel(selected.status) !== "Entregue" &&
                getStatusLabel(selected.status) !== "Cancelado" &&
                getStatusLabel(selected.status) !== "Não entregue" &&
                selectedCanProceed &&
                !selectedPickupNeedsCashConfirmation &&
                !selectedCancellationPending &&
                !adminCannotDispatchDelivery &&
                !adminCannotConfirmDelivery && (
                  <button
                    onClick={() =>
                      advanceStatus(
                        selected.id,
                        getStatusLabel(selected.status),
                      )
                    }
                    disabled={selectedOrderUpdating}
                    aria-busy={selectedStatusUpdating}
                    className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70 flex items-center justify-center gap-2"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    {selectedStatusUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Atualizando...
                      </>
                    ) : (
                      <>
                        {getStatusLabel(selected.status) === "Recebido" &&
                          "Confirmar Pedido"}
                        {getStatusLabel(selected.status) === "Confirmado" &&
                          "Iniciar Separação"}
                        {getStatusLabel(selected.status) === "Em Separação" &&
                          "Marcar como Pronto"}
                        {getStatusLabel(selected.status) === "Pronto" &&
                          ((
                            selected.tipo_pedido ||
                            selected.type ||
                            ""
                          ).toLowerCase() === "retirada"
                            ? "Confirmar Retirada"
                            : selectedIsSalao
                              ? "Concluir pedido"
                              : "")}
                        {getStatusLabel(selected.status) ===
                          "Saiu para Entrega" && "Confirmar Entrega"}
                      </>
                    )}
                  </button>
                )}
              {!selectedCanProceed &&
                getStatusLabel(selected.status) !== "Entregue" &&
                getStatusLabel(selected.status) !== "Cancelado" &&
                getStatusLabel(selected.status) !== "Não entregue" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    O pedido só pode avançar após a aprovação do pagamento.
                  </div>
                )}
              {selectedPickupNeedsCashConfirmation && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Confirme o recebimento do pagamento antes de finalizar a
                  retirada.
                </div>
              )}
              {adminCannotDispatchDelivery && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Pedido pronto. A saída para entrega deve ser iniciada pelo
                  entregador.
                </div>
              )}
              {adminCannotConfirmDelivery && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                  A entrega deve ser confirmada pelo entregador com a chave do
                  cliente.
                </div>
              )}
              </>}
              {selectedCanTakeSalaoToTable && (
                <button
                  onClick={(event) =>
                    void takeSalaoOrderToTable(selected, event)
                  }
                  disabled={selectedOrderUpdating}
                  aria-busy={selectedStatusUpdating}
                  className="w-full py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium transition-colors hover:bg-green-700 disabled:cursor-wait disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {selectedStatusUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Levar pra mesa
                    </>
                  )}
                </button>
              )}
              {selectedCanForceFinalize && (
                <button
                  onClick={(event) =>
                    openForceFinalizeConfirm(selected, event)
                  }
                  disabled={selectedOrderUpdating}
                  aria-busy={selectedForceFinalizing}
                  className="w-full py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium transition-colors hover:bg-red-700 disabled:cursor-wait disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {selectedForceFinalizing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Pular etapas e finalizar
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => handlePrintComanda(selectedForPrint)}
                className="w-full py-2.5 rounded-lg text-gray-700 text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimir Comanda
              </button>
              <button
                onClick={() => setAdminAddItemsOrder(selected)}
                disabled={!selectedCanAdminAddItems || selectedOrderUpdating}
                className="w-full py-2.5 rounded-lg text-blue-700 text-sm font-medium border border-blue-200 hover:bg-blue-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Adicionar produtos
              </button>
              {!selectedIsSalao && <button
                onClick={() => openItemsChecklist(selected)}
                className="w-full py-2.5 rounded-lg text-gray-700 text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" /> Ver produtos
              </button>}
              {!selectedIsSalao && !selectedIsFiado && <button
                onClick={openRefundModal}
                disabled={!selectedCanRefund || selectedOrderUpdating}
                className="w-full py-2.5 rounded-lg text-blue-700 text-sm font-medium border border-blue-200 hover:bg-blue-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Reembolsar
              </button>}
              <button
                onClick={() => toggleArchivedOrder(selected)}
                disabled={selectedOrderUpdating}
                aria-busy={selectedArchiving}
                className="w-full py-2.5 rounded-lg text-gray-700 text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors disabled:cursor-wait disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {selectedArchiving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    {selected.arquivado ? (
                      <RefreshCw className="w-4 h-4" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                    {selected.arquivado
                      ? "Restaurar pedido"
                      : "Arquivar pedido"}
                  </>
                )}
              </button>
              {getStatusLabel(selected.status) !== "Cancelado" &&
                getStatusLabel(selected.status) !== "Entregue" &&
                !selectedCancellationPending && (
                  <button
                    onClick={() =>
                      void requestOrderCancellation(selected.id)
                    }
                    disabled={selectedOrderUpdating}
                    aria-busy={selectedCancelling}
                    className="w-full py-2.5 rounded-lg text-red-600 text-sm font-medium border border-red-200 hover:bg-red-50 transition-colors disabled:cursor-wait disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {selectedCancelling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cancelando...
                      </>
                    ) : (
                      "Cancelar Pedido"
                    )}
                  </button>
                )}
              {!selectedIsSalao && <button className="w-full py-2.5 rounded-lg text-gray-600 text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" /> Entrar em Contato
              </button>}
            </div>
          </div>
        </div>
      )}
      {cancellationReviewOrder && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Analisar cancelamento
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Pedido{" "}
                  {cancellationReviewOrder.numero_pedido ||
                    cancellationReviewOrder.id}
                </p>
              </div>
              <button type="button" onClick={closeCancellationReview}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Total pago: R${" "}
              {Number(
                getCancellationRequest(cancellationReviewOrder)?.valor_pago ||
                  0,
              )
                .toFixed(2)
                .replace(".", ",")}
            </div>

            <label className="mt-4 block text-sm font-medium text-gray-700">
              Valor do reembolso
            </label>
            <input
              value={cancellationRefundValue}
              onChange={(event) =>
                setCancellationRefundValue(event.target.value)
              }
              inputMode="decimal"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="0,00"
            />

            <label className="mt-4 block text-sm font-medium text-gray-700">
              Observação
            </label>
            <textarea
              value={cancellationReviewNote}
              onChange={(event) =>
                setCancellationReviewNote(event.target.value)
              }
              className="mt-1 min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Obrigatória para retenção de valores ou recusa"
            />

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => void rejectCancellationRequest()}
                disabled={Boolean(resolvingCancellationOrderId)}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
              >
                Recusar solicitação
              </button>
              <button
                type="button"
                onClick={() => void requestCancellationApproval()}
                disabled={Boolean(resolvingCancellationOrderId)}
                className="rounded-lg bg-blue-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Aprovar solicitação
              </button>
            </div>
          </div>
        </div>
      )}
      <MfaApprovalModal
        open={Boolean(cancelApprovalOrderId)}
        title="Aprovar cancelamento"
        description="Selecione um administrador do mercado e confirme o código do autenticador."
        loading={Boolean(cancellingOrderId)}
        onClose={() => setCancelApprovalOrderId("")}
        onConfirm={(approval) =>
          void cancelOrder(cancelApprovalOrderId, approval)
        }
      />
      <MfaApprovalModal
        open={cancellationReviewApprovalOpen}
        title="Aprovar solicitação de cancelamento"
        description="Confirme o reembolso e o cancelamento do pedido com um administrador do mercado."
        loading={Boolean(resolvingCancellationOrderId)}
        onClose={() => setCancellationReviewApprovalOpen(false)}
        onConfirm={(approval) => void approveCancellationRequest(approval)}
      />
      <MfaApprovalModal
        open={refundApprovalOpen}
        title="Aprovar reembolso"
        description="Confirme o reembolso do pedido com um administrador do mercado."
        loading={refundSubmitting}
        onClose={() => setRefundApprovalOpen(false)}
        onConfirm={(approval) => void submitRefund(approval)}
      />
    </div>
  );
}
