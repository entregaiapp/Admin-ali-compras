import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSalaoRealtimeRefreshScheduler,
  createSingleFlightRunner,
  readSalaoListPayload,
  shouldReconcileSalaoVisibility,
} from "./salaoRealtimeRefresh";

const createLoaders = () => ({
  loadMesas: vi.fn(async () => undefined),
  loadComandas: vi.fn(async () => undefined),
  loadKds: vi.fn(async () => undefined),
  loadSelectedComanda: vi.fn(async () => undefined),
  loadAll: vi.fn(async () => undefined),
});

const flushDebounce = async () => {
  await vi.advanceTimersByTimeAsync(150);
};

describe("Salao Realtime refresh", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("updates only KDS and the matching selected comanda for KDS_ATUALIZADO", async () => {
    vi.useFakeTimers();
    const loaders = createLoaders();
    const scheduler = createSalaoRealtimeRefreshScheduler({
      loaders,
      getSelectedComandaId: () => "comanda-1",
    });

    scheduler.schedule({ event: "KDS_ATUALIZADO", comandaId: "comanda-1" });
    await flushDebounce();

    expect(loaders.loadKds).toHaveBeenCalledTimes(1);
    expect(loaders.loadSelectedComanda).toHaveBeenCalledTimes(1);
    expect(loaders.loadMesas).not.toHaveBeenCalled();
    expect(loaders.loadComandas).not.toHaveBeenCalled();
  });

  it("does not update the selected detail when KDS belongs to another comanda", async () => {
    vi.useFakeTimers();
    const loaders = createLoaders();
    const scheduler = createSalaoRealtimeRefreshScheduler({
      loaders,
      getSelectedComandaId: () => "comanda-1",
    });

    scheduler.schedule({ event: "KDS_ATUALIZADO", comandaId: "comanda-2" });
    await flushDebounce();

    expect(loaders.loadKds).toHaveBeenCalledTimes(1);
    expect(loaders.loadSelectedComanda).not.toHaveBeenCalled();
  });

  it.each(["GARCOM_SOLICITADO", "CONTA_SOLICITADA", "COMANDAS_UNIDAS"])(
    "%s does not update KDS",
    async (event) => {
      vi.useFakeTimers();
      const loaders = createLoaders();
      const scheduler = createSalaoRealtimeRefreshScheduler({
        loaders,
        getSelectedComandaId: () => "",
      });

      scheduler.schedule({ event });
      await flushDebounce();

      expect(loaders.loadKds).not.toHaveBeenCalled();
      expect(loaders.loadMesas).toHaveBeenCalledTimes(1);
      expect(loaders.loadComandas).toHaveBeenCalledTimes(
        ["CONTA_SOLICITADA", "COMANDAS_UNIDAS"].includes(event) ? 1 : 0,
      );
    },
  );

  it("updates KDS and tables for ITEM_ADICIONADO", async () => {
    vi.useFakeTimers();
    const loaders = createLoaders();
    const scheduler = createSalaoRealtimeRefreshScheduler({
      loaders,
      getSelectedComandaId: () => "",
    });

    scheduler.schedule({ event: "ITEM_ADICIONADO", comandaId: "comanda-1" });
    await flushDebounce();

    expect(loaders.loadKds).toHaveBeenCalledTimes(1);
    expect(loaders.loadMesas).toHaveBeenCalledTimes(1);
    expect(loaders.loadComandas).not.toHaveBeenCalled();
  });

  it("accumulates resources from different events within the debounce", async () => {
    vi.useFakeTimers();
    const loaders = createLoaders();
    const scheduler = createSalaoRealtimeRefreshScheduler({
      loaders,
      getSelectedComandaId: () => "",
    });

    scheduler.schedule({ event: "ITEM_ADICIONADO" });
    await vi.advanceTimersByTimeAsync(75);
    scheduler.schedule({ event: "GARCOM_SOLICITADO" });
    await flushDebounce();

    expect(loaders.loadKds).toHaveBeenCalledTimes(1);
    expect(loaders.loadMesas).toHaveBeenCalledTimes(1);
    expect(loaders.loadComandas).not.toHaveBeenCalled();
  });

  it("uses a full reconciliation for legacy payloads", async () => {
    vi.useFakeTimers();
    const loaders = createLoaders();
    const scheduler = createSalaoRealtimeRefreshScheduler({
      loaders,
      getSelectedComandaId: () => "",
    });

    scheduler.schedule({});
    await flushDebounce();

    expect(loaders.loadAll).toHaveBeenCalledTimes(1);
    expect(loaders.loadKds).not.toHaveBeenCalled();
  });

  it("warns and falls back to tables and comandas for an unknown event", async () => {
    vi.useFakeTimers();
    const loaders = createLoaders();
    const warn = vi.fn();
    const scheduler = createSalaoRealtimeRefreshScheduler({
      loaders,
      getSelectedComandaId: () => "",
      warn,
    });

    scheduler.schedule({ event: "EVENTO_NOVO" });
    await flushDebounce();

    expect(warn).toHaveBeenCalledWith(
      "[Salão Realtime] Evento desconhecido: EVENTO_NOVO",
    );
    expect(loaders.loadMesas).toHaveBeenCalledTimes(1);
    expect(loaders.loadComandas).toHaveBeenCalledTimes(1);
    expect(loaders.loadKds).not.toHaveBeenCalled();
  });

  it("queues at most one reconciliation while a resource load is active", async () => {
    const runner = createSingleFlightRunner<"kds">();
    let releaseFirst: (() => void) | undefined;
    const firstRequest = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const task = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(() => firstRequest)
      .mockResolvedValue(undefined);

    const active = runner.run("kds", task);
    const queued1 = runner.run("kds", task);
    const queued2 = runner.run("kds", task);
    expect(task).toHaveBeenCalledTimes(1);

    releaseFirst?.();
    await Promise.all([active, queued1, queued2]);

    expect(task).toHaveBeenCalledTimes(2);
  });

  it("reconciles visibility only when the page becomes visible", () => {
    expect(shouldReconcileSalaoVisibility("hidden")).toBe(false);
    expect(shouldReconcileSalaoVisibility("visible")).toBe(true);
  });

  it("distinguishes a missing list response from a valid empty list", () => {
    expect(readSalaoListPayload(undefined)).toBeNull();
    expect(readSalaoListPayload({ data: null })).toBeNull();
    expect(readSalaoListPayload([])).toEqual([]);
  });
});
