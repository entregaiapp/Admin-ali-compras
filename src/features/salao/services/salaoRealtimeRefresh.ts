export type SalaoRefreshResources = {
  mesas: boolean;
  comandas: boolean;
  kds: boolean;
  selectedComanda: boolean;
  full: boolean;
};

export type SalaoRealtimePayload = {
  event?: string | null;
  comandaId?: string | null;
};

type SalaoRefreshLoaders = {
  loadMesas: () => Promise<unknown>;
  loadComandas: () => Promise<unknown>;
  loadKds: () => Promise<unknown>;
  loadSelectedComanda: () => Promise<unknown>;
  loadAll: () => Promise<unknown>;
};

type SingleFlightSlot = {
  running: boolean;
  queued: boolean;
  promise: Promise<void> | null;
};

export const readSalaoListPayload = (payload: unknown): any[] | null => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray((payload as any)?.data)) return (payload as any).data;
  if (Array.isArray((payload as any)?.data?.data)) {
    return (payload as any).data.data;
  }
  return null;
};

export const createSingleFlightRunner = <Resource extends string>() => {
  const slots = new Map<Resource, SingleFlightSlot>();

  const run = (resource: Resource, task: () => Promise<void>) => {
    const slot = slots.get(resource) || {
      running: false,
      queued: false,
      promise: null,
    };
    slots.set(resource, slot);

    if (slot.running) {
      slot.queued = true;
      return slot.promise || Promise.resolve();
    }

    const execute = async () => {
      slot.running = true;
      let firstError: unknown;
      try {
        do {
          slot.queued = false;
          try {
            await task();
          } catch (error) {
            firstError ??= error;
          }
        } while (slot.queued);
        if (firstError) throw firstError;
      } finally {
        slot.running = false;
        slot.promise = null;
      }
    };

    slot.promise = execute();
    return slot.promise;
  };

  return { run };
};

const EMPTY_RESOURCES = (): SalaoRefreshResources => ({
  mesas: false,
  comandas: false,
  kds: false,
  selectedComanda: false,
  full: false,
});

const MESA_EVENTS = new Set([
  "GARCOM_SOLICITADO",
  "ATENDIMENTO_ATUALIZADO",
  "MESA_CRIADA",
  "MESA_ATUALIZADA",
  "ABERTURA_SOLICITADA",
  "ABERTURA_RECUSADA",
  "ABERTURA_ATUALIZADA",
]);

const COMANDA_EVENTS = new Set([
  "COMANDA_ABERTA",
  "COMANDA_ATUALIZADA",
  "CONTA_SOLICITADA",
  "CONTA_FECHADA",
  "PAGAMENTO_CONFIRMADO",
  "MESA_TRANSFERIDA",
  "COMANDAS_UNIDAS",
]);

const matchesSelectedComanda = (
  payloadComandaId: string | null | undefined,
  selectedComandaId: string | null | undefined,
) => Boolean(
  payloadComandaId &&
  selectedComandaId &&
  String(payloadComandaId) === String(selectedComandaId),
);

export const getSalaoRefreshResources = (
  payload: SalaoRealtimePayload | null | undefined,
  selectedComandaId: string | null | undefined,
  warn: (message: string) => void = console.warn,
): SalaoRefreshResources => {
  const eventName = String(payload?.event || "").trim();
  if (!eventName) return { ...EMPTY_RESOURCES(), full: true };

  const selectedComanda = matchesSelectedComanda(
    payload?.comandaId,
    selectedComandaId,
  );

  if (eventName === "KDS_ATUALIZADO") {
    return { ...EMPTY_RESOURCES(), kds: true, selectedComanda };
  }

  if (eventName === "ITEM_ADICIONADO") {
    return {
      ...EMPTY_RESOURCES(),
      mesas: true,
      kds: true,
      selectedComanda,
    };
  }

  if (MESA_EVENTS.has(eventName)) {
    return { ...EMPTY_RESOURCES(), mesas: true };
  }

  if (COMANDA_EVENTS.has(eventName)) {
    return {
      ...EMPTY_RESOURCES(),
      mesas: true,
      comandas: true,
      selectedComanda,
    };
  }

  if (eventName === "PIN_REGENERADO") {
    return { ...EMPTY_RESOURCES(), comandas: true, selectedComanda };
  }

  warn(`[Salão Realtime] Evento desconhecido: ${eventName}`);
  return { ...EMPTY_RESOURCES(), mesas: true, comandas: true };
};

export const shouldReconcileSalaoVisibility = (visibilityState: string) =>
  visibilityState === "visible";

export const createSalaoRealtimeRefreshScheduler = ({
  loaders,
  getSelectedComandaId,
  warn = console.warn,
  debounceMs = 150,
}: {
  loaders: SalaoRefreshLoaders;
  getSelectedComandaId: () => string | null | undefined;
  warn?: (message: string) => void;
  debounceMs?: number;
}) => {
  let pending = EMPTY_RESOURCES();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const flush = async () => {
    timeoutId = null;
    const resources = pending;
    pending = EMPTY_RESOURCES();

    if (resources.full) {
      await loaders.loadAll();
      return;
    }

    const calls: Promise<unknown>[] = [];
    if (resources.mesas) calls.push(loaders.loadMesas());
    if (resources.comandas) calls.push(loaders.loadComandas());
    if (resources.kds) calls.push(loaders.loadKds());
    if (resources.selectedComanda) calls.push(loaders.loadSelectedComanda());
    await Promise.allSettled(calls);
  };

  const schedule = (payload: SalaoRealtimePayload | null | undefined) => {
    if (disposed) return;
    const requested = getSalaoRefreshResources(
      payload,
      getSelectedComandaId(),
      warn,
    );
    pending = {
      mesas: pending.mesas || requested.mesas,
      comandas: pending.comandas || requested.comandas,
      kds: pending.kds || requested.kds,
      selectedComanda:
        pending.selectedComanda || requested.selectedComanda,
      full: pending.full || requested.full,
    };

    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      void flush().catch((error) => {
        warn(
          `[Salão Realtime] Falha ao atualizar recursos: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }, debounceMs);
  };

  const dispose = () => {
    disposed = true;
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
    pending = EMPTY_RESOURCES();
  };

  return { schedule, flush, dispose };
};
