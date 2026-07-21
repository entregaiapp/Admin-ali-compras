export type OperationalOrderType = "entrega" | "retirada";
export type OperationalOrderTabKey =
  | "falta_imprimir"
  | "andamento"
  | "cancelamentos"
  | "saiu_para_entrega"
  | "entregues"
  | "entregues_aguardando_pagamento"
  | "nao_entregues"
  | "cancelados";
export type OperationalTabAvailability = Record<
  OperationalOrderTabKey,
  { disponivel: boolean; total: number }
>;

export const OPERATIONAL_ORDER_TAB_KEYS: OperationalOrderTabKey[] = [
  "falta_imprimir",
  "andamento",
  "cancelamentos",
  "saiu_para_entrega",
  "entregues",
  "entregues_aguardando_pagamento",
  "nao_entregues",
  "cancelados",
];

export type OrdersReconciliationReason =
  | "initial"
  | "realtime"
  | "interval"
  | "focus"
  | "online"
  | "visible"
  | "manual";

export type OrdersReconciliationResources = {
  full: boolean;
  listTypes: OperationalOrderType[];
  summaryTypes: OperationalOrderType[];
  reasons: OrdersReconciliationReason[];
  eventCount: number;
};

export type OrdersReconciliationSchedule = {
  reason: OrdersReconciliationReason;
  full?: boolean;
  listTypes?: OperationalOrderType[];
  summaryTypes?: OperationalOrderType[];
  eventCount?: number;
  immediate?: boolean;
  dedupeEquivalent?: boolean;
};

export type OrdersRealtimePayload = {
  version?: unknown;
  event?: unknown;
  pedidoId?: unknown;
  tipoPedido?: unknown;
  requiresPrintAlert?: unknown;
};

export type OrdersRealtimeAction = {
  full: boolean;
  orderId: string | null;
  type: OperationalOrderType | null;
  openPendingPrint: boolean;
};

export const readOperationalAvailability = (
  value: unknown,
): OperationalTabAvailability | null => {
  if (!value || typeof value !== "object") return null;
  const entries = OPERATIONAL_ORDER_TAB_KEYS.map((key) => {
    const item = (value as Record<string, any>)[key];
    const total = Number(item?.total);
    if (!item || !Number.isFinite(total) || typeof item.disponivel !== "boolean") {
      return null;
    }
    return [key, { disponivel: item.disponivel, total }] as const;
  });
  if (entries.some((entry) => entry === null)) return null;
  return Object.fromEntries(entries) as OperationalTabAvailability;
};

export const getFirstAvailableOperationalTab = (
  availability: OperationalTabAvailability,
) => OPERATIONAL_ORDER_TAB_KEYS.find(
  (key) => availability[key].disponivel,
) || null;

export const getOrdersReconciliationPlan = (
  resources: Pick<OrdersReconciliationResources, "full" | "listTypes" | "summaryTypes">,
  currentType: OperationalOrderType | null,
) => {
  const listType = currentType &&
    (resources.full || resources.listTypes.includes(currentType))
    ? currentType
    : null;
  const summaryTypes = new Set(resources.summaryTypes);
  if (resources.full) {
    summaryTypes.add("entrega");
    summaryTypes.add("retirada");
  }
  resources.listTypes.forEach((type) => {
    if (type !== listType) summaryTypes.add(type);
  });
  if (listType) summaryTypes.delete(listType);
  return { listType, summaryTypes: [...summaryTypes] };
};

type PendingResources = {
  full: boolean;
  listTypes: Set<OperationalOrderType>;
  summaryTypes: Set<OperationalOrderType>;
  reasons: Set<OrdersReconciliationReason>;
  eventCount: number;
};

const KNOWN_ORDER_EVENTS = new Set([
  "PEDIDO_CRIADO",
  "PEDIDO_ATUALIZADO",
  "PEDIDO_IMPRESSAO_ATUALIZADA",
]);

const emptyResources = (): PendingResources => ({
  full: false,
  listTypes: new Set(),
  summaryTypes: new Set(),
  reasons: new Set(),
  eventCount: 0,
});

const hasResources = (resources: PendingResources) =>
  resources.full ||
  resources.listTypes.size > 0 ||
  resources.summaryTypes.size > 0;

const serializeResources = (
  resources: PendingResources,
): OrdersReconciliationResources => ({
  full: resources.full,
  listTypes: [...resources.listTypes],
  summaryTypes: [...resources.summaryTypes],
  reasons: [...resources.reasons],
  eventCount: resources.eventCount,
});

const covers = (
  current: OrdersReconciliationResources | null,
  requested: PendingResources,
) => {
  if (!current) return false;
  if (current.full) return true;
  if (requested.full) return false;
  return (
    [...requested.listTypes].every((type) => current.listTypes.includes(type)) &&
    [...requested.summaryTypes].every(
      (type) =>
        current.summaryTypes.includes(type) || current.listTypes.includes(type),
    )
  );
};

export const getOrdersRealtimeAction = (
  payload: OrdersRealtimePayload | null | undefined,
): OrdersRealtimeAction => {
  const version = Number(payload?.version);
  const event = String(payload?.event || "").trim();
  const orderId = String(payload?.pedidoId || "").trim();
  const rawType = String(payload?.tipoPedido || "").toLowerCase();
  const type = rawType === "entrega" || rawType === "retirada" ? rawType : null;

  if (
    version !== 1 ||
    !KNOWN_ORDER_EVENTS.has(event) ||
    !orderId ||
    !type
  ) {
    return { full: true, orderId: null, type: null, openPendingPrint: false };
  }

  return {
    full: false,
    orderId,
    type,
    openPendingPrint:
      event === "PEDIDO_CRIADO" && payload?.requiresPrintAlert === true,
  };
};

export const createOrdersReconciliationScheduler = ({
  reconcile,
  isVisible,
  debug = () => undefined,
  debounceMs = 250,
  dedupeMs = 1_000,
  now = () => Date.now(),
}: {
  reconcile: (resources: OrdersReconciliationResources) => Promise<void>;
  isVisible: () => boolean;
  debug?: (message: string, details: Record<string, unknown>) => void;
  debounceMs?: number;
  dedupeMs?: number;
  now?: () => number;
}) => {
  let pending = emptyResources();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let runningPromise: Promise<void> | null = null;
  let runningResources: OrdersReconciliationResources | null = null;
  let lastResources: OrdersReconciliationResources | null = null;
  let lastFinishedAt = 0;
  let avoidedRequests = 0;
  let disposed = false;

  const merge = (request: OrdersReconciliationSchedule) => {
    pending.full = pending.full || request.full === true;
    request.listTypes?.forEach((type) => pending.listTypes.add(type));
    request.summaryTypes?.forEach((type) => pending.summaryTypes.add(type));
    pending.reasons.add(request.reason);
    pending.eventCount += request.eventCount ?? (request.reason === "realtime" ? 1 : 0);
  };

  const flush = async (): Promise<void> => {
    if (disposed) return;
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
    if (runningPromise) return runningPromise;
    if (!isVisible() || !hasResources(pending)) return;

    const snapshot = serializeResources(pending);
    pending = emptyResources();
    runningResources = snapshot;
    debug("reconciliation_started", {
      reasons: snapshot.reasons,
      listTypes: snapshot.listTypes,
      summaryTypes: snapshot.summaryTypes,
      full: snapshot.full,
      eventCount: snapshot.eventCount,
      avoidedRequests,
    });

    runningPromise = (async () => {
      try {
        await reconcile(snapshot);
      } catch (error) {
        debug("reconciliation_failed", {
          reasons: snapshot.reasons,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        lastResources = snapshot;
        lastFinishedAt = now();
        runningResources = null;
        runningPromise = null;
      }

      if (!disposed && hasResources(pending) && isVisible()) {
        timeoutId = setTimeout(() => void flush(), debounceMs);
      }
    })();

    return runningPromise;
  };

  const schedule = (request: OrdersReconciliationSchedule) => {
    if (disposed) return;
    const requested = emptyResources();
    requested.full = request.full === true;
    request.listTypes?.forEach((type) => requested.listTypes.add(type));
    request.summaryTypes?.forEach((type) => requested.summaryTypes.add(type));

    if (
      request.dedupeEquivalent &&
      !hasResources(pending) &&
      (covers(runningResources, requested) ||
        (now() - lastFinishedAt <= dedupeMs && covers(lastResources, requested)))
    ) {
      avoidedRequests += 1;
      debug("reconciliation_deduplicated", {
        reason: request.reason,
        avoidedRequests,
      });
      return;
    }

    merge(request);
    if (!isVisible()) return;
    if (runningPromise) return;

    if (request.immediate) {
      void flush();
      return;
    }

    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => void flush(), debounceMs);
  };

  const dispose = () => {
    disposed = true;
    cancelPending();
  };

  const cancelPending = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
    pending = emptyResources();
  };

  return {
    schedule,
    flush,
    cancelPending,
    dispose,
    getStats: () => ({ avoidedRequests }),
  };
};
