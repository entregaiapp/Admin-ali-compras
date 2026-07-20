const MESA_OPEN_TIME_STORAGE_PREFIX = "admin_salao_mesa_open_time";

type MesaOpenTimeEntry = {
  comandaId: string;
  openedAt: number;
};

type MesaOpenTimeStorage = Record<string, MesaOpenTimeEntry>;

type MesaOpenTimeCandidate = {
  id?: string | number | null;
  comanda_aberta?: {
    id?: string | number | null;
    status?: unknown;
    aberta_em?: unknown;
  } | null;
};

export type MesaOpenTimes = Record<string, number>;

const storageKey = (lojaId: string) =>
  `${MESA_OPEN_TIME_STORAGE_PREFIX}:${lojaId}`;

const readStorage = (lojaId: string): MesaOpenTimeStorage => {
  if (typeof window === "undefined" || !lojaId) return {};

  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(lojaId)) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => {
        const entry = value as Partial<MesaOpenTimeEntry>;
        return (
          typeof entry?.comandaId === "string" &&
          Number.isFinite(entry?.openedAt) &&
          Number(entry.openedAt) > 0
        );
      }),
    ) as MesaOpenTimeStorage;
  } catch {
    return {};
  }
};

const writeStorage = (lojaId: string, entries: MesaOpenTimeStorage) => {
  if (typeof window === "undefined" || !lojaId) return;

  try {
    if (Object.keys(entries).length === 0) {
      localStorage.removeItem(storageKey(lojaId));
      return;
    }
    localStorage.setItem(storageKey(lojaId), JSON.stringify(entries));
  } catch {
    // O contador continua funcionando durante a sessão mesmo se o navegador
    // bloquear o acesso ao armazenamento local.
  }
};

const toOpenTimes = (entries: MesaOpenTimeStorage): MesaOpenTimes =>
  Object.fromEntries(
    Object.entries(entries).map(([mesaId, entry]) => [mesaId, entry.openedAt]),
  );

const isActiveComanda = (comanda: MesaOpenTimeCandidate["comanda_aberta"]) =>
  Boolean(comanda?.id) &&
  !["fechada", "paga", "cancelada"].includes(
    String(comanda?.status || "").toLowerCase(),
  );

export const parseMesaOpenedAt = (value: unknown): number | null => {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
};

export const registerMesaOpenTime = (
  lojaId: string,
  mesaId: string,
  comandaId: string,
  openedAt = Date.now(),
): MesaOpenTimes => {
  const entries = readStorage(lojaId);
  entries[String(mesaId)] = {
    comandaId: String(comandaId),
    openedAt,
  };
  writeStorage(lojaId, entries);
  return toOpenTimes(entries);
};

export const removeMesaOpenTime = (
  lojaId: string,
  mesaId: string,
): MesaOpenTimes => {
  const entries = readStorage(lojaId);
  delete entries[String(mesaId)];
  writeStorage(lojaId, entries);
  return toOpenTimes(entries);
};

export const reconcileMesaOpenTimes = (
  lojaId: string,
  mesas: MesaOpenTimeCandidate[],
  observedAt = Date.now(),
): MesaOpenTimes => {
  const storedEntries = readStorage(lojaId);
  const activeEntries: MesaOpenTimeStorage = {};

  mesas.forEach((mesa) => {
    const mesaId = String(mesa?.id || "");
    const comanda = mesa?.comanda_aberta;
    if (!mesaId || !isActiveComanda(comanda)) return;

    const comandaId = String(comanda.id);
    const storedEntry = storedEntries[mesaId];
    const serverOpenedAt = parseMesaOpenedAt(comanda.aberta_em);
    activeEntries[mesaId] = {
      comandaId,
      openedAt:
        serverOpenedAt ||
        (storedEntry?.comandaId === comandaId
          ? storedEntry.openedAt
          : observedAt),
    };
  });

  writeStorage(lojaId, activeEntries);
  return toOpenTimes(activeEntries);
};

export const formatMesaOpenDuration = (openedAt: number, now: number) => {
  const totalMinutes = Math.max(0, Math.floor((now - openedAt) / 60_000));
  if (totalMinutes < 1) return "menos de 1 min";

  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}min`);

  return parts.join(" ");
};
