import { useState, useEffect } from "react";
import type { MouseEvent } from "react";
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
  CheckCircle2,
  Printer,
  List,
  Map as MapIcon,
  ChevronDown,
  ChevronRight,
  TruckIcon,
  Navigation,
  Loader2,
} from "lucide-react";
import api from '@/shared/lib/api';
import {
  allStatuses,
  bairroColors,
  frontendToBackendStatus,
  orderItemsMock,
  PRIMARY,
  statusColor,
  statusFlow,
  statusLabels,
} from '@/features/orders/constants';
import { printBairroRoute, printComanda } from '@/features/orders/utils/print';
import {
  canChangeDeliveryCourier,
  getApiErrorMessage,
  getApiList,
  getBackendStatus,
  getOrderAddress,
  getOrderNeighborhood,
  getOrderPaymentMethod,
  getOrderPaymentStatus,
  getOrderStreetAddress,
  hexToRgba,
  isDeliveryOrder,
} from '@/features/orders/utils/orderUtils';
import { DeliveryAssignmentModal } from '@/features/orders/components/DeliveryAssignmentModal';
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';

export function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [bairroFilter, setBairroFilter] = useState("Todos");
  const [selected, setSelected] = useState<any | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"lista" | "bairros">("lista");
  const [expandedBairros, setExpandedBairros] = useState<
    Record<string, boolean>
  >({});
  const [couriers, setCouriers] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [deliveryRecords, setDeliveryRecords] = useState<any[]>([]);
  const [currentDelivery, setCurrentDelivery] = useState<any | null>(null);
  const [assigningCourier, setAssigningCourier] = useState(false);
  const [unassigningDeliveryId, setUnassigningDeliveryId] = useState("");
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
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    if (!user?.loja_id) return;

    api
      .get(`/lojas/${user.loja_id}/configuracoes`)
      .then((res) => {
        const config = res.data?.data || res.data;
        if (config?.cor_primaria) setPrimaryColor(config.cor_primaria);
      })
      .catch(() => setPrimaryColor(PRIMARY));
  }, [user?.loja_id]);

  useEffect(() => {
    if (viewMode === "bairros" && typeFilter === "Retirada") {
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

  const fetchOrders = async (
    pageNum = 1,
    reset = false,
    options: { silent?: boolean } = {},
  ) => {
    try {
      if (!options.silent) setLoading(true);
      const params: any = {
        page: pageNum,
        per_page: PER_PAGE + 1, // Pesquisa 21 para saber se tem mais
        status: frontendToBackendStatus[statusFilter],
        tipo_pedido:
          typeFilter === "Todos" ? undefined : typeFilter.toLowerCase(),
        busca: search || undefined,
      };

      const response = await api.get("/pedidos", { params });
      const rawData = response.data.data;
      const data = Array.isArray(rawData) ? rawData : rawData?.data || [];

      const more = data.length > PER_PAGE;
      const displayData = more ? data.slice(0, PER_PAGE) : data;

      setHasMore(more);
      setOrders((prev) => (reset ? displayData : [...prev, ...displayData]));
      setPage(pageNum);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      if (!options.silent) setLoading(false);
    }
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchOrders(1, true, { silent: true });
      fetchAuxiliaryData();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [statusFilter, typeFilter, search]);

  const handleLoadMore = () => {
    fetchOrders(page + 1);
  };

  const fetchOrderItems = async (orderId: string) => {
    try {
      const response = await api.get("/itens_pedido", {
        params: { pedido_id: orderId },
      });
      const rawItems = response.data.data ?? response.data;
      setSelectedItems(Array.isArray(rawItems) ? rawItems : []);
    } catch (error) {
      console.error("Error fetching order items:", error);
      // fallback
      try {
        const resp2 = await api.get(`/pedidos/${orderId}/itens`);
        const rawItems2 = resp2.data.data ?? resp2.data;
        setSelectedItems(Array.isArray(rawItems2) ? rawItems2 : []);
      } catch (err2) {
        setSelectedItems(Array.isArray(orderItemsMock) ? orderItemsMock : []);
      }
    }
  };

  const fetchOrderPayments = async (orderId: string) => {
    try {
      const response = await api.get(`/pedidos/${orderId}/pagamentos`);
      setSelectedPayments(getApiList(response.data));
    } catch (error) {
      console.error("Error fetching order payments:", error);
      try {
        const response = await api.get("/pagamentos", {
          params: { pedido_id: orderId },
        });
        setSelectedPayments(getApiList(response.data));
      } catch (fallbackError) {
        console.error("Error fetching order payments fallback:", fallbackError);
        setSelectedPayments([]);
      }
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
    setCurrentDelivery(null);
    fetchOrderItems(order.id);
    fetchOrderPayments(order.id);
    if ((order.tipo_pedido || order.type || "").toLowerCase() === "entrega") {
      fetchOrderDelivery(order.id);
    }
  };

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
        const bairro =
          getOrderNeighborhood(selected);
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
      showSystemNotice("Não é possível desvincular o entregador depois que a entrega saiu para rota.");
      return;
    }

    try {
      setUnassigningDeliveryId(delivery.id);
      const response = await api.patch(`/entregas/${delivery.id}/desvincular-entregador`);
      const updatedDelivery = response.data.data || response.data;

      setDeliveryRecords((prev) =>
        prev.map((item) => (item.id === updatedDelivery.id ? updatedDelivery : item)),
      );

      if (currentDelivery?.id === updatedDelivery.id) {
        setCurrentDelivery(updatedDelivery);
      }

      setSelectedOrderIds((prev) =>
        prev.filter((orderId) => orderId !== updatedDelivery.pedido_id),
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
    // Map current status to next status in backend format
    const backendStatusFlow = [
      "pendente",
      "confirmado",
      "em_separacao",
      "pronto",
      "saiu_para_entrega",
      "entregue",
    ];
    const rawStatus = getBackendStatus(currentStatus);
    let idx = backendStatusFlow.indexOf(rawStatus);

    if (idx >= 0 && idx < backendStatusFlow.length - 1) {
      const nextStatus = backendStatusFlow[idx + 1];
      try {
        const order =
          selected?.id === id ? selected : orders.find((o) => o.id === id);
        const isDeliveryOrder =
          (order?.tipo_pedido || order?.type || "").toLowerCase() === "entrega";
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

          if (nextStatus === "entregue" && delivery.status !== "entregue") {
            await api.patch(`/entregas/${delivery.id}/entregar`);
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
      } catch (error) {
        console.error("Error updating status", error);
        showSystemNotice(
          getApiErrorMessage(
            error,
            "Erro ao atualizar status. Verifique se as condições para este status foram atendidas (ex: entregador atribuído).",
          ),
        );
      }
    }
  };

  const cancelOrder = async (id: string) => {
    try {
      await api.patch(`/pedidos/${id}/cancelar`);
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: "cancelado" } : o)),
      );
      if (selected?.id === id)
        setSelected((p: any) => (p ? { ...p, status: "cancelado" } : null));
    } catch (error) {
      console.error("Error canceling order", error);
    }
  };

  const getStatusLabel = (status: string) => statusLabels[status] || status;

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
    (order) => !assignedOrderIds.has(order.id),
  );
  const deliveryOrders = bairroFilteredDeliveryOrders.filter(
    (order) => !assignedOrderIds.has(order.id),
  );
  const selectableDeliveryOrders =
    viewMode === "bairros" ? deliveryOrders : listDeliveryOrders;
  const selectedDeliveryOrders = selectableDeliveryOrders.filter((order) =>
    selectedOrderIds.includes(order.id),
  );
  const selectedDeliveryCount = selectedDeliveryOrders.length;
  const activeFiltersCount = [
    search,
    statusFilter !== "Todos",
    typeFilter !== "Todos",
    bairroFilter !== "Todos",
  ].filter(Boolean).length;
  const selectedPayment = selectedPayments[0] || selected?.pagamento || null;
  const selectedForPrint = selected
    ? { ...selected, pagamento: selectedPayment }
    : selected;
  const selectedPaymentMethod = getOrderPaymentMethod(selected, selectedPayment);
  const selectedPaymentStatus = getOrderPaymentStatus(selected, selectedPayment);
  const selectedPaymentStatusClass = ["Aprovado", "Confirmado"].includes(
    selectedPaymentStatus,
  )
    ? "text-green-600"
    : ["Rejeitado", "Cancelado", "Estornado", "Expirado"].includes(
          selectedPaymentStatus,
        )
      ? "text-red-600"
      : "text-amber-600";
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
        !assignedOrderIds.has(order.id) &&
        !["entregue", "cancelado", "Entregue", "Cancelado"].includes(
          order.status,
        ),
    );
    if (activeOrders.length === 0) {
      showSystemNotice(
        "Nenhum pedido não atribuído disponível para adicionar.",
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
      {/* Left panel: list or bairros */}
      <div
        className={`flex flex-col ${selected ? "hidden lg:flex lg:w-1/2 xl:w-3/5" : "flex-1"}`}
      >
        {/* Filters bar */}
        <div className="relative bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between gap-3">
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
                      setTypeFilter(viewMode === "bairros" ? "Entrega" : "Todos");
                      setBairroFilter("Todos");
                    }}
                    className="text-xs font-medium text-gray-500 hover:text-gray-800"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
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

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                    Tipo
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1"
                  >
                    {(viewMode === "bairros"
                      ? ["Entrega"]
                      : ["Todos", "Entrega", "Retirada"]
                    ).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

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
        {viewMode === "lista" && (
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filtered.map((order, orderIndex) => {
              const statusDisplay = getStatusLabel(order.status);
              const sc = statusColor[order.status] ||
                statusColor["Recebido"] || { bg: "#fffbeb", text: "#d97706" };
              const isEntrega = isDeliveryOrder(order);
              const canSelectForDelivery =
                isEntrega &&
                !assignedOrderIds.has(order.id) &&
                !["entregue", "cancelado"].includes(order.status);
              const isSelectedForDelivery = selectedOrderIds.includes(order.id);
              const assignedDelivery = deliveryByOrderId.get(order.id);
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
                    canSelectForDelivery ? isSelectedForDelivery : undefined
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
                          "--tw-ring-color": hexToRgba(primaryColor, 0.35),
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
                            style={{ backgroundColor: sc.bg, color: sc.text }}
                          >
                            {statusDisplay}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {isEntrega ? "Entrega" : "Retirada"}
                          </span>
                          {isEntrega && assignedDelivery?.entregador_id && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                              <span>Atribuído</span>
                              <button
                                type="button"
                                title="Desvincular entregador"
                                aria-label="Desvincular entregador"
                                disabled={unassigningDeliveryId === assignedDelivery.id}
                                onClick={(event) =>
                                  handleUnassignCourier(assignedDelivery, event)
                                }
                                className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                              >
                                {unassigningDeliveryId === assignedDelivery.id ? (
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
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(
                              order.realizado_em ||
                                order.criado_em ||
                                order.created_at ||
                                new Date(),
                            ).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
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
                    </div>
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <div className="p-4 flex justify-center border-t border-gray-100">
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
                <p className="text-sm">Nenhum pedido encontrado</p>
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
                  !["entregue", "cancelado", "Entregue", "Cancelado"].includes(
                    o.status,
                  ),
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
                          printBairroRoute(bairro, group.orders);
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
                          !assignedOrderIds.has(order.id) &&
                          !["entregue", "cancelado"].includes(order.status);
                        const isSelectedForDelivery = selectedOrderIds.includes(
                          order.id,
                        );
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
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5 truncate">
                                {order.cliente?.nome || order.customer}
                              </div>
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
                                    printComanda(order);
                                  }}
                                  className="text-[11px] flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors"
                                  title="Imprimir comanda"
                                >
                                  <Printer className="w-3 h-3" />
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
                {new Date(
                  selected.realizado_em ||
                    selected.criado_em ||
                    selected.created_at ||
                    new Date(),
                ).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                ·{" "}
                {(selected.tipo_pedido || selected.type || "").toUpperCase() ===
                "ENTREGA"
                  ? "Entrega"
                  : "Retirada"}
              </div>
            </div>
            <button
              onClick={() => printComanda(selectedForPrint, selectedItems)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              title="Imprimir comanda"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Imprimir</span>
            </button>
            <button
              onClick={() => setSelected(null)}
              className="hidden lg:block text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Timeline */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {statusFlow.map((s, i) => {
                  const currentDisplay = getStatusLabel(selected.status);
                  const curIdx =
                    statusFlow.indexOf(currentDisplay) >= 0
                      ? statusFlow.indexOf(currentDisplay)
                      : 0;
                  const done = i <= curIdx;
                  return (
                    <div
                      key={s}
                      className="flex items-center gap-1 flex-shrink-0"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: done ? PRIMARY : "#e5e7eb",
                          }}
                        >
                          {done ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                          )}
                        </div>
                        <span className="text-[9px] text-gray-500 mt-1 text-center max-w-12 leading-tight">
                          {s}
                        </span>
                      </div>
                      {i < statusFlow.length - 1 && (
                        <div
                          className="w-6 h-0.5 mb-3 flex-shrink-0"
                          style={{
                            backgroundColor: i < curIdx ? PRIMARY : "#e5e7eb",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer info */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
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
                  {selected.cliente?.telefone ||
                    selected.phone ||
                    "Sem telefone"}
                </div>
                {selected.cpf_na_nota && (
                  <div className="text-sm text-gray-500">
                    <span className="font-medium text-gray-700">CPF na nota:</span>{" "}
                    {selected.cpf_na_nota_cpf || "Informado"}
                  </div>
                )}
                {(selected.tipo_pedido || selected.type || "").toLowerCase() ===
                  "entrega" && (
                  <>
                    <div className="flex items-start gap-2 text-sm text-gray-500">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>
                        {getOrderAddress(selected)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: "#e0e7ff", color: "#3730a3" }}
                      >
                        Bairro:{" "}
                        {getOrderNeighborhood(selected)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h4 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" style={{ color: PRIMARY }} /> Itens
                do Pedido
              </h4>
              <div className="space-y-2.5">
                {Array.isArray(selectedItems) &&
                  selectedItems.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm text-gray-700">
                          {item.quantity || item.qty}x{" "}
                          {item.produto?.nome || item.name}
                        </div>
                        {(item.observacoes || item.obs) && (
                          <div className="text-xs text-gray-400 italic mt-0.5">
                            {item.observacoes || item.obs}
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-700">
                        R${" "}
                        {(
                          (item.price_unit || item.price) *
                          (item.quantity || item.qty)
                        )
                          .toFixed(2)
                          .replace(".", ",")}
                      </div>
                    </div>
                  ))}
              </div>
              <div className="border-t border-gray-100 mt-3 pt-3 space-y-1.5">
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
                      {parseFloat(selected.taxa_entrega || 6.99)
                        .toFixed(2)
                        .replace(".", ",")}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Retirada na loja</span>
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
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h4 className="text-gray-700 font-semibold mb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4" style={{ color: PRIMARY }} />{" "}
                Pagamento
              </h4>
              <div className="text-sm text-gray-600">
                {selectedPaymentMethod}
              </div>
              {selectedPaymentStatus !== "Não informado" && (
                <div className={`mt-1 text-xs font-medium ${selectedPaymentStatusClass}`}>
                  ✓ {selectedPaymentStatus}
                </div>
              )}
            </div>

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
                        onClick={(event) => handleUnassignCourier(currentDelivery, event)}
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
              {getStatusLabel(selected.status) !== "Entregue" &&
                getStatusLabel(selected.status) !== "Cancelado" && (
                  <button
                    onClick={() =>
                      advanceStatus(
                        selected.id,
                        getStatusLabel(selected.status),
                      )
                    }
                    className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    {getStatusLabel(selected.status) === "Recebido" &&
                      "Confirmar Pedido"}
                    {getStatusLabel(selected.status) === "Confirmado" &&
                      "Iniciar Separação"}
                    {getStatusLabel(selected.status) === "Em Separação" &&
                      "Marcar como Pronto"}
                    {getStatusLabel(selected.status) === "Pronto" &&
                      "Enviar para Entrega"}
                    {getStatusLabel(selected.status) === "Saiu para Entrega" &&
                      "Confirmar Entrega"}
                  </button>
                )}
              <button
                onClick={() => printComanda(selected, selectedItems)}
                className="w-full py-2.5 rounded-lg text-gray-700 text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimir Comanda
              </button>
              {getStatusLabel(selected.status) !== "Cancelado" &&
                getStatusLabel(selected.status) !== "Entregue" && (
                  <button
                    onClick={() => cancelOrder(selected.id)}
                    className="w-full py-2.5 rounded-lg text-red-600 text-sm font-medium border border-red-200 hover:bg-red-50 transition-colors"
                  >
                    Cancelar Pedido
                  </button>
                )}
              <button className="w-full py-2.5 rounded-lg text-gray-600 text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" /> Entrar em Contato
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
