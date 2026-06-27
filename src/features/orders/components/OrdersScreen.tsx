import { useState, useEffect } from "react";
import type { MouseEvent } from "react";
import { useSearchParams } from "react-router";
import {
  Search,
  Filter,
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
  Map as MapIcon,
  ChevronDown,
  ChevronRight,
  TruckIcon,
  Navigation,
  Loader2,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import api from "@/shared/lib/api";
import { formatBrasiliaTime } from "@/shared/lib/dateTime";
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
  getOrderItemChecklistId,
  getOrderItemName,
  getOrderItemQuantity,
  getOrderItemTotal,
  getOrderNeighborhood,
  getOrderPaymentMethod,
  getOrderPaymentStatus,
  getOrderStreetAddress,
  getPreferredOrderPayment,
  hexToRgba,
  isDeliveryOrder,
  isOrderPaid,
  isOrderPendingCash,
} from "@/features/orders/utils/orderUtils";
import { DeliveryAssignmentModal } from "@/features/orders/components/DeliveryAssignmentModal";
import { OrderItemsChecklistModal } from "@/features/orders/components/OrderItemsChecklistModal";
import { ManualDeliveryOrderModal } from "@/features/orders/components/ManualDeliveryOrderModal";
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
const formatCurrency = (value: unknown) =>
  `R$ ${Number(value || 0)
    .toFixed(2)
    .replace(".", ",")}`;
const toCurrencyCents = (value: unknown) =>
  Math.round(Number(value || 0) * 100);
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
const formatCashChangeInfo = (payment: any) => {
  if (payment?.forma_pagamento !== "dinheiro" && payment?.method !== "dinheiro") {
    return "";
  }

  if ((payment?.pagamento_entrega_tipo || payment?.paymentOnDeliveryMethod) === "cartao") {
    return "Cobrar com cartão na entrega";
  }

  if (payment?.sem_troco === true) return "Não precisa de troco";

  if (payment?.troco_para != null) {
    return `Troco para ${formatCurrency(payment.troco_para)} · devolver ${formatCurrency(payment.troco_valor || 0)}`;
  }

  return "";
};
const canOrderProceedForFulfillment = (order: any, payments: any[] = []) =>
  isOrderPaid(order, payments) ||
  isOrderPendingCash(order, payments) ||
  order?.origem_checkout === "admin_dashboard";
const REFUND_ACTIVE_STATUSES = new Set(["pendente", "processando", "aprovado"]);
const ORDER_TABS = [
  { value: "Entrega", label: "Delivery" },
  { value: "Retirada", label: "Retirada" },
  { value: "Salao", label: "Salão" },
] as const;
type OrderTab = (typeof ORDER_TABS)[number]["value"];
type OrderType = "entrega" | "retirada" | "salao";
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

export function OrdersScreen() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [typeFilter, setTypeFilter] = useState<OrderTab>("Entrega");
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
  const [couriers, setCouriers] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [deliveryRecords, setDeliveryRecords] = useState<any[]>([]);
  const [currentDelivery, setCurrentDelivery] = useState<any | null>(null);
  const [assigningCourier, setAssigningCourier] = useState(false);
  const [unassigningDeliveryId, setUnassigningDeliveryId] = useState("");
  const [updatingStatusOrderId, setUpdatingStatusOrderId] = useState("");
  const [confirmingCashPaymentId, setConfirmingCashPaymentId] = useState("");
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [manualOrderOpen, setManualOrderOpen] = useState(false);
  const [salaoEnabled, setSalaoEnabled] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState<Record<OrderType, number>>({
    entrega: 0,
    retirada: 0,
    salao: 0,
  });
  const [lastOrdersLoadedAt, setLastOrdersLoadedAt] = useState<Record<OrderType, string>>(() => {
    const initialCursor = new Date(0).toISOString();
    return { entrega: initialCursor, retirada: initialCursor, salao: initialCursor };
  });
  const [newOrderCursorsReady, setNewOrderCursorsReady] = useState(false);
  const [checkingNewOrders, setCheckingNewOrders] = useState(false);
  const [archivedStartDate, setArchivedStartDate] = useState("");
  const [archivedEndDate, setArchivedEndDate] = useState("");
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
  }, [statusFilter, typeFilter, viewMode, archivedStartDate, archivedEndDate]);

  useEffect(() => {
    if (!user?.loja_id) return;
    api.get(`/salao/lojas/${user.loja_id}/modulos`).then((modulesResult) => {
      const modules = modulesResult.data?.data ?? modulesResult.data ?? [];
      setSalaoEnabled(Array.isArray(modules) && modules.some((module: any) => module.slug === "salao" && module.enabled === true));
    }).catch(() => setSalaoEnabled(false));
  }, [user?.loja_id]);

  useEffect(() => {
    if (!user?.loja_id) return;

    const types: OrderType[] = ["entrega", "retirada", "salao"];
    Promise.all(
      types.map((type) => api.get("/pedidos/novos/contagem", {
        params: { tipo_pedido: type, arquivado: "false" },
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
  }, [user?.loja_id]);

  useEffect(() => {
    if (!user?.loja_id) {
      setPrimaryColor(PRIMARY);
      setStorePrintData(null);
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
  }, [search, statusFilter, typeFilter, bairroFilter, viewMode]);

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

  const getOrderQueryParams = (pageNum = 1) => ({
    page: pageNum,
    per_page: PER_PAGE,
    arquivado: viewMode === "arquivados" ? "true" : "false",
    status: frontendToBackendStatus[statusFilter],
    tipo_pedido: typeFilter.toLowerCase(),
    busca: search || undefined,
    realizado_em_inicial:
      viewMode === "arquivados" ? archivedStartDate || undefined : undefined,
    realizado_em_final:
      viewMode === "arquivados" ? archivedEndDate || undefined : undefined,
  });

  const getNewOrdersQueryParams = (type: OrderType) => ({
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

      const more = Array.isArray(rawData)
        ? data.length > PER_PAGE
        : pageNum < Number(rawData?.total_pages || pageNum);
      const displayData =
        Array.isArray(rawData) && more ? data.slice(0, PER_PAGE) : data;

      setHasMore(more);
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
      if (reset) {
        const activeType = typeFilter.toLowerCase() as OrderType;
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
      const types: OrderType[] = salaoEnabled
        ? ["entrega", "retirada", "salao"]
        : ["entrega", "retirada"];
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

  const handleNewOrdersButton = () => {
    const activeType = typeFilter.toLowerCase() as OrderType;
    if (newOrdersCount[activeType] > 0) {
      void refreshCurrentOrderTab();
      return;
    }

    const nextType = (["entrega", "retirada", ...(salaoEnabled ? ["salao"] : [])] as OrderType[])
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
      return payments;
    } catch (error) {
      console.error("Error fetching order payments:", error);
      try {
        const response = await api.get("/pagamentos", {
          params: { pedido_id: orderId },
        });
        const payments = getApiList(response.data);
        setSelectedPayments(payments);
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
    setSelected(order);
    setSelectedItems([]);
    setSelectedPayments([]);
    setSelectedRefunds([]);
    setCurrentDelivery(null);
    fetchOrderItems(order.id);
    fetchOrderPayments(order.id).then((payments) =>
      fetchOrderRefunds(payments),
    );
    if ((order.tipo_pedido || order.type || "").toLowerCase() === "entrega") {
      fetchOrderDelivery(order.id);
    }
  };

  const handlePrintComanda = async (order: any) => {
    const printWindow = window.open("", "_blank", "width=420,height=650");
    if (!printWindow) {
      showSystemNotice(
        "O navegador bloqueou a janela de impressão. Permita pop-ups e tente novamente.",
      );
      return;
    }

    try {
      const items = await loadOrderItems(order.id);
      const orderPayment =
        selected?.id === order.id
          ? getPreferredOrderPayment(order, selectedPayments)
          : getPreferredOrderPayment(order);
      printComanda(
        { ...order, pagamento: orderPayment },
        items,
        storePrintData,
        printWindow,
      );
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
      const orderHasPendingCash = isOrderPendingCash(order, orderPayments);

      if (!orderIsPaid && !orderHasPendingCash) {
        showSystemNotice(
          "O pedido só pode avançar após a aprovação do pagamento.",
        );
        return;
      }

      if (
        orderType === "retirada" &&
        nextStatus === "entregue" &&
        orderHasPendingCash
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
        observacao: "Pagamento em dinheiro recebido na retirada",
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
      showSystemNotice("Pagamento em dinheiro confirmado como recebido.");
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
    const matchSearch =
      customerName.includes(search.toLowerCase()) ||
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
    (order) =>
      !assignedOrderIds.has(order.id) && !hasPendingCancellationRequest(order),
  );
  const deliveryOrders = bairroFilteredDeliveryOrders.filter(
    (order) =>
      !assignedOrderIds.has(order.id) && !hasPendingCancellationRequest(order),
  );
  const selectableDeliveryOrders =
    viewMode === "bairros" ? deliveryOrders : listDeliveryOrders;
  const selectedDeliveryOrders = selectableDeliveryOrders.filter((order) =>
    selectedOrderIds.includes(order.id),
  );
  const selectedDeliveryCount = selectedDeliveryOrders.length;
  const activeFiltersCount =
    viewMode === "arquivados"
      ? [
          search,
          statusFilter !== "Todos",
          archivedStartDate,
          archivedEndDate,
        ].filter(Boolean).length
      : [
          search,
          statusFilter !== "Todos",
          bairroFilter !== "Todos",
        ].filter(Boolean).length;
  const availableOrderTabs = ORDER_TABS.filter(
    (tab) => tab.value !== "Salao" || salaoEnabled,
  );
  const totalNewOrdersCount = availableOrderTabs.reduce(
    (total, tab) => total + newOrdersCount[tab.value.toLowerCase() as OrderType],
    0,
  );
  const selectedPayment = getPreferredOrderPayment(selected, selectedPayments);
  const selectedIsPaid = isOrderPaid(selected, selectedPayments);
  const selectedIsPendingCash = isOrderPendingCash(selected, selectedPayments);
  const selectedRefundedAmount = selectedRefunds
    .filter((refund) =>
      REFUND_ACTIVE_STATUSES.has(String(refund.status || "").toLowerCase()),
    )
    .reduce((sum, refund) => sum + Number(refund.valor || 0), 0);
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
  const selectedCashChangeInfo = formatCashChangeInfo(selectedPayment);
  const selectedIsCardOnDelivery =
    (selectedPayment?.pagamento_entrega_tipo || selectedPayment?.paymentOnDeliveryMethod) === "cartao";
  const selectedStatusUpdating = updatingStatusOrderId === selected?.id;
  const selectedCancelling = cancellingOrderId === selected?.id;
  const selectedArchiving = archivingOrderId === selected?.id;
  const selectedCancellationPending = hasPendingCancellationRequest(selected);
  const selectedCanRefund =
    Boolean(selected?.id) &&
    selectedIsPaid &&
    !selectedCancellationPending &&
    selectedRefundableAmount > 0;
  const selectedCancellationResolving =
    resolvingCancellationOrderId === selected?.id;
  const selectedOrderUpdating =
    selectedStatusUpdating ||
    selectedCancelling ||
    selectedArchiving ||
    selectedCancellationResolving;
  const selectedPaymentStatusClass = ["Aprovado", "Confirmado"].includes(
    selectedPaymentStatus,
  )
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
  const selectedCanProceed = selectedIsPaid || selectedIsPendingCash || selected?.origem_checkout === "admin_dashboard";
  const selectedPickupNeedsCashConfirmation =
    selectedIsPickup && selectedIsPendingCash && selectedStatusLabel === "Pronto";
  const selectedCanTakeSalaoToTable =
    Boolean(selected) &&
    canTakeSalaoOrderToTable(selected) &&
    selectedCanProceed &&
    !selectedCancellationPending;
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
  const listGroups =
    viewMode === "arquivados"
      ? [
          {
            key: "arquivados",
            title: "Arquivados",
            description: "Pedidos arquivados manualmente",
            orders: filtered,
          },
        ]
      : [
          {
            key: "cancelamentos",
            title: "Cancelamentos para análise",
            description: "Pedidos bloqueados até a decisão da loja",
            orders: filtered.filter(hasPendingCancellationRequest),
          },
          {
            key: "andamento",
            title: "Em andamento",
            description: "Pedidos que ainda exigem ação",
            orders: filtered.filter(
              (order) =>
                !hasPendingCancellationRequest(order) &&
                !["entregue", "nao_entregue", "cancelado"].includes(
                  order.status,
                ),
            ),
          },
          {
            key: "entregues",
            title: "Entregues",
            description: "Finalizados prontos para arquivar",
            orders: filtered.filter(
              (order) => order.status === "entregue" && isOrderPaid(order),
            ),
          },
          {
            key: "entregues_aguardando_pagamento",
            title: "Entregues aguardando pagamento",
            description: "Finalizados com pagamento pendente",
            orders: filtered.filter(
              (order) => order.status === "entregue" && !isOrderPaid(order),
            ),
          },
          {
            key: "nao_entregues",
            title: "Não entregues",
            description: "Pedidos com problema relatado pelo entregador",
            orders: filtered.filter((order) => order.status === "nao_entregue"),
          },
          {
            key: "cancelados",
            title: "Cancelados",
            description: "Pedidos cancelados",
            orders: filtered.filter((order) => order.status === "cancelado"),
          },
        ].filter((group) => group.orders.length > 0);
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
      (order) =>
        canOrderProceedForFulfillment(order) &&
        !assignedOrderIds.has(order.id) &&
        !hasPendingCancellationRequest(order) &&
        ![
          "entregue",
          "nao_entregue",
          "cancelado",
          "Entregue",
          "Não entregue",
          "Cancelado",
        ].includes(order.status),
    );
    if (activeOrders.length === 0) {
      showSystemNotice(
        "Nenhum pedido pago e não atribuído disponível para adicionar.",
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

  if (loading && orders.length === 0) {
    return (
      <div className="p-5 flex-1 h-full flex items-center justify-center">
        <div
          className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin"
          style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }}
        ></div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {manualOrderOpen && user?.loja_id && (
        <ManualDeliveryOrderModal lojaId={user.loja_id} onClose={() => setManualOrderOpen(false)} onCreated={() => fetchOrders(1, true)} />
      )}
      {/* Left panel: list or bairros */}
      <div
        className={`flex flex-col ${selected ? "hidden lg:flex lg:w-1/2 xl:w-3/5" : "flex-1"}`}
      >
        <div className="border-b border-gray-200 bg-white px-4 pt-2">
          <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Tipos de pedido">
            {availableOrderTabs.map((tab) => {
              const active = typeFilter === tab.value;
              const type = tab.value.toLowerCase() as OrderType;
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
                      if (viewMode === "bairros") setViewMode("lista");
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
        </div>
        {/* Filters bar */}
        <div className="relative bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            {typeFilter !== "Salao" && <button type="button" onClick={() => setManualOrderOpen(true)} className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: primaryColor }}>+ Criar pedido</button>}
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" style={{ color: PRIMARY }} />
              Filtros
              {activeFiltersCount > 0 && (
                <span
                  className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
              />
            </button>

            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode("lista")}
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
                  onClick={() => setViewMode("bairros")}
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
                onClick={() => setViewMode("arquivados")}
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

          {filtersOpen && (
            <div className="absolute left-4 right-4 top-[calc(100%-4px)] z-30 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-800">
                  Filtros de pedidos
                </div>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("Todos");
                      if (viewMode === "arquivados") {
                        setArchivedStartDate("");
                        setArchivedEndDate("");
                      } else {
                        setBairroFilter("Todos");
                      }
                    }}
                    className="text-xs font-medium text-gray-500 hover:text-gray-800"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>

              <div
                className={`grid grid-cols-1 gap-3 ${viewMode === "arquivados" ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
              >
                <div className="relative">
                  <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                    Busca
                  </label>
                  <Search className="absolute left-3 bottom-2.5 w-4 h-4 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Pedido ou cliente"
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

              {viewMode === "bairros" && (
                <div className="mt-3 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  A visualização por bairro mostra pedidos de entrega e também
                  respeita busca, status e bairro selecionado.
                </div>
              )}
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
            <span className="text-xs text-gray-500">
              {filtered.length} pedido{filtered.length !== 1 ? "s" : ""}{" "}
              arquivado{filtered.length !== 1 ? "s" : ""}
            </span>
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
          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 space-y-4">
            {listGroups.map((group) => (
              <section
                key={group.key}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">
                      {group.title}
                    </h3>
                    <p className="text-xs text-gray-500">{group.description}</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {group.orders.length}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {group.orders.map((order, orderIndex) => {
                    const statusDisplay = getStatusLabel(order.status);
                    const sc = statusColor[order.status] ||
                      statusColor["Recebido"] || {
                        bg: "#fffbeb",
                        text: "#d97706",
                      };
                    const isEntrega = isDeliveryOrder(order);
                    const canSelectForDelivery =
                      isEntrega &&
                      canOrderProceedForFulfillment(order) &&
                      !assignedOrderIds.has(order.id) &&
                      !hasPendingCancellationRequest(order) &&
                      !["entregue", "nao_entregue", "cancelado"].includes(
                        order.status,
                      );
                    const isSelectedForDelivery = selectedOrderIds.includes(
                      order.id,
                    );
                    const assignedDelivery = deliveryByOrderId.get(order.id);
                    const failureReason = getDeliveryFailureReason(order);
                    const canTakeToTable = canTakeSalaoOrderToTable(order);
                    const takingToTable = updatingStatusOrderId === order.id;
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
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
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
                                {!canOrderProceedForFulfillment(order) && (
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
                                  {formatBrasiliaTime(
                                    order.realizado_em ||
                                      order.criado_em ||
                                      order.created_at ||
                                      new Date(),
                                  )}
                                </span>
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <CreditCard className="w-3 h-3" />
                                  {getOrderPaymentMethod(order)}
                                </span>
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
            ))}

            {hasMore && (
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

            {filtered.length === 0 && !loading && (
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
        )}

        {/* ── POR BAIRRO VIEW ────────────────────────── */}
        {viewMode === "bairros" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sortedBairros.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <TruckIcon className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">Nenhum pedido de entrega encontrado</p>
              </div>
            )}
            {sortedBairros.map(([bairro, group], idx) => {
              const col = bairroColors[group.colorIdx];
              const isExpanded = expandedBairros[bairro] !== false; // expanded by default
              const activeOrders = group.orders.filter(
                (o) =>
                  canOrderProceedForFulfillment(o) &&
                  !hasPendingCancellationRequest(o) &&
                  ![
                    "entregue",
                    "nao_entregue",
                    "cancelado",
                    "Entregue",
                    "Não entregue",
                    "Cancelado",
                  ].includes(o.status),
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
                        const canSelectForDelivery =
                          canOrderProceedForFulfillment(order) &&
                          !assignedOrderIds.has(order.id) &&
                          !hasPendingCancellationRequest(order) &&
                          !["entregue", "nao_entregue", "cancelado"].includes(
                            order.status,
                          );
                        const isSelectedForDelivery = selectedOrderIds.includes(
                          order.id,
                        );
                        const failureReason = getDeliveryFailureReason(order);
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
                                {!canOrderProceedForFulfillment(order) && (
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
                                  · {getOrderPaymentMethod(order)}
                                </span>
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
                {formatBrasiliaTime(
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
                  {formatBrasiliaTime(selected.agendado_para)}
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
                  const done = isFailedStep ? false : i <= curIdx;
                  const connectorDone = i < curIdx;
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
                              : done
                                ? PRIMARY
                                : "#e5e7eb",
                          }}
                        >
                          {isFailedStep ? (
                            <CircleX className="w-3.5 h-3.5 text-white" />
                          ) : done ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
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
                  selectedItems.map((item: any, idx: number) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm text-gray-700">
                          {getOrderItemQuantity(item)}x {getOrderItemName(item)}
                        </div>
                        {(item.observacoes || item.obs) && (
                          <div className="text-xs text-gray-400 italic mt-0.5">
                            {item.observacoes || item.obs}
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-700">
                        R${" "}
                        {getOrderItemTotal(item).toFixed(2).replace(".", ",")}
                      </div>
                    </div>
                  ))}
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
            {!selectedIsSalao && <div className="bg-white border border-gray-200 rounded-xl p-4">
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
                  {selectedPaymentStatus}
                </div>
              )}
              {!selectedIsPaid && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {selectedIsPendingCash
                    ? "Pagamento em dinheiro pendente de recebimento."
                    : "Pagamento pendente"}
                </div>
              )}
              {selectedIsPickup && selectedIsPendingCash && (
                <button
                  type="button"
                  onClick={confirmCashPayment}
                  disabled={!selectedPayment?.id || confirmingCashPaymentId === selectedPayment.id}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:cursor-wait disabled:opacity-70"
                >
                  {confirmingCashPaymentId === selectedPayment?.id && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Marcar dinheiro como recebido
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
                </div>
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
                  Confirme o recebimento do dinheiro antes de finalizar a
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
              <button
                onClick={() => handlePrintComanda(selectedForPrint)}
                className="w-full py-2.5 rounded-lg text-gray-700 text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimir Comanda
              </button>
              {!selectedIsSalao && <button
                onClick={() => openItemsChecklist(selected)}
                className="w-full py-2.5 rounded-lg text-gray-700 text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" /> Ver produtos
              </button>}
              {!selectedIsSalao && <button
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
