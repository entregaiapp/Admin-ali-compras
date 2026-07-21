import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOrdersReconciliationScheduler,
  getFirstAvailableOperationalTab,
  getOrdersReconciliationPlan,
  getOrdersRealtimeAction,
  OPERATIONAL_ORDER_TAB_KEYS,
  readOperationalAvailability,
} from "./ordersReconciliation";

const availability = (totals: Partial<Record<string, number>> = {}) =>
  Object.fromEntries(OPERATIONAL_ORDER_TAB_KEYS.map((key) => [key, {
    disponivel: Number(totals[key] || 0) > 0,
    total: Number(totals[key] || 0),
  }]));

describe("orders reconciliation", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("routes valid events and falls back safely for incomplete or unknown payloads", () => {
    expect(getOrdersRealtimeAction({
      version: 1,
      event: "PEDIDO_CRIADO",
      pedidoId: "pedido-1",
      tipoPedido: "retirada",
      requiresPrintAlert: true,
    })).toEqual({
      full: false,
      orderId: "pedido-1",
      type: "retirada",
      openPendingPrint: true,
    });
    expect(getOrdersRealtimeAction({ event: "PEDIDO_ATUALIZADO" }).full).toBe(true);
    expect(getOrdersRealtimeAction({
      version: 2,
      event: "PEDIDO_ATUALIZADO",
      pedidoId: "pedido-1",
      tipoPedido: "entrega",
    }).full).toBe(true);
  });

  it("reloads only the currently open modality and uses its list response as the summary", () => {
    expect(getOrdersReconciliationPlan({
      full: false,
      listTypes: ["entrega"],
      summaryTypes: [],
    }, "entrega")).toEqual({ listType: "entrega", summaryTypes: [] });
    expect(getOrdersReconciliationPlan({
      full: false,
      listTypes: [],
      summaryTypes: ["retirada"],
    }, "entrega")).toEqual({ listType: null, summaryTypes: ["retirada"] });
  });

  it("downgrades a stale list request for another modality to summary only", () => {
    expect(getOrdersReconciliationPlan({
      full: false,
      listTypes: ["retirada"],
      summaryTypes: [],
    }, "entrega")).toEqual({ listType: null, summaryTypes: ["retirada"] });
  });

  it("keeps the backend tab priority and rejects temporary malformed responses", () => {
    const parsed = readOperationalAvailability(availability({
      andamento: 3,
      cancelamentos: 1,
    }));
    expect(parsed).not.toBeNull();
    expect(getFirstAvailableOperationalTab(parsed!)).toBe("andamento");
    expect(readOperationalAvailability({ andamento: { total: 3 } })).toBeNull();
  });

  it("groups nearby events without losing resources from the first event", async () => {
    vi.useFakeTimers();
    const reconcile = vi.fn(async () => undefined);
    const scheduler = createOrdersReconciliationScheduler({
      reconcile,
      isVisible: () => true,
    });

    scheduler.schedule({ reason: "realtime", listTypes: ["entrega"] });
    scheduler.schedule({ reason: "realtime", summaryTypes: ["retirada"] });
    await vi.advanceTimersByTimeAsync(250);

    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledWith(expect.objectContaining({
      listTypes: ["entrega"],
      summaryTypes: ["retirada"],
      eventCount: 2,
    }));
  });

  it("queues at most one accumulated execution while reconciliation is running", async () => {
    vi.useFakeTimers();
    let releaseFirst: (() => void) | undefined;
    const first = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const reconcile = vi.fn()
      .mockImplementationOnce(() => first)
      .mockResolvedValue(undefined);
    const scheduler = createOrdersReconciliationScheduler({
      reconcile,
      isVisible: () => true,
    });

    scheduler.schedule({ reason: "manual", full: true, immediate: true });
    scheduler.schedule({ reason: "realtime", listTypes: ["entrega"] });
    scheduler.schedule({ reason: "realtime", listTypes: ["entrega"] });
    expect(reconcile).toHaveBeenCalledTimes(1);

    releaseFirst?.();
    await first;
    await vi.advanceTimersByTimeAsync(250);
    expect(reconcile).toHaveBeenCalledTimes(2);
    expect(reconcile.mock.calls[1][0].eventCount).toBe(2);
  });

  it("does not run while hidden and performs one full reconciliation when visible", async () => {
    vi.useFakeTimers();
    let visible = false;
    const reconcile = vi.fn(async () => undefined);
    const scheduler = createOrdersReconciliationScheduler({
      reconcile,
      isVisible: () => visible,
    });

    scheduler.schedule({ reason: "interval", full: true });
    scheduler.schedule({ reason: "realtime", summaryTypes: ["retirada"] });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(reconcile).not.toHaveBeenCalled();

    visible = true;
    scheduler.schedule({ reason: "visible", full: true, immediate: true });
    await scheduler.flush();
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(reconcile.mock.calls[0][0].full).toBe(true);
  });

  it("deduplicates subscribed and focus requests covered by an equivalent load", async () => {
    vi.useFakeTimers();
    const reconcile = vi.fn(async () => undefined);
    const scheduler = createOrdersReconciliationScheduler({
      reconcile,
      isVisible: () => true,
    });

    scheduler.schedule({ reason: "initial", full: true, immediate: true });
    await scheduler.flush();
    scheduler.schedule({ reason: "focus", full: true, dedupeEquivalent: true });
    await vi.advanceTimersByTimeAsync(250);

    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(scheduler.getStats().avoidedRequests).toBe(1);
  });

  it("disposes timers without executing pending work", async () => {
    vi.useFakeTimers();
    const reconcile = vi.fn(async () => undefined);
    const scheduler = createOrdersReconciliationScheduler({
      reconcile,
      isVisible: () => true,
    });
    scheduler.schedule({ reason: "realtime", listTypes: ["entrega"] });
    scheduler.dispose();
    await vi.advanceTimersByTimeAsync(500);
    expect(reconcile).not.toHaveBeenCalled();
  });
});
