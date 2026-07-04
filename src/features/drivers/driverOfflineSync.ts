import type { DriverRoute } from './components/MyDeliveriesScreen';

const DATABASE_NAME = 'ali-compras-driver-offline';
const DATABASE_VERSION = 1;
const ASSIGNED_DELIVERIES_STORE = 'assigned_deliveries';
const PENDING_SYNC_STORE = 'pending_sync';

export type PendingStopSync = {
  id: string;
  scope: string;
  routeId: string;
  stopId: string;
  payload: {
    status: 'delivered' | 'failed';
    reason?: string;
    chave_recebimento_hash?: string;
  };
  createdAt: string;
  attempts: number;
  lastError?: string;
  retryable: boolean;
};

type StoredDelivery = {
  key: string;
  scope: string;
  routeId: string;
  route: DriverRoute;
  savedAt: string;
};

type ApiClient = {
  patch: (url: string, data?: unknown) => Promise<unknown>;
};

const isBrowser = () => typeof window !== 'undefined';

export const isDriverOnline = () => !isBrowser() || navigator.onLine;

export const getDriverOfflineScope = () => {
  if (!isBrowser()) return 'driver:anonymous';

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return `driver:${user.id || user.entregador_id || 'anonymous'}`;
  } catch {
    return 'driver:anonymous';
  }
};

const getDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (!isBrowser() || !('indexedDB' in window)) {
    reject(new Error('Este navegador não permite usar entregas sem internet.'));
    return;
  }

  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onerror = () => reject(request.error || new Error('Não foi possível preparar as entregas sem internet.'));
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(ASSIGNED_DELIVERIES_STORE)) {
      const deliveries = database.createObjectStore(ASSIGNED_DELIVERIES_STORE, { keyPath: 'key' });
      deliveries.createIndex('scope', 'scope', { unique: false });
    }
    if (!database.objectStoreNames.contains(PENDING_SYNC_STORE)) {
      const pendingSync = database.createObjectStore(PENDING_SYNC_STORE, { keyPath: 'id' });
      pendingSync.createIndex('scope', 'scope', { unique: false });
    }
  };
  request.onsuccess = () => resolve(request.result);
});

const requestResult = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Falha no armazenamento offline.'));
});

const completeTransaction = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error || new Error('Falha no armazenamento offline.'));
  transaction.onabort = () => reject(transaction.error || new Error('Operacao offline cancelada.'));
});

const withStore = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => Promise<T>,
) => {
  const database = await getDatabase();
  try {
    const transaction = database.transaction(storeName, mode);
    const result = await operation(transaction.objectStore(storeName));
    await completeTransaction(transaction);
    return result;
  } finally {
    database.close();
  }
};

const scopeKey = (routeId: string, scope = getDriverOfflineScope()) => `${scope}:${routeId}`;

export async function saveAssignedDelivery(route: DriverRoute, scope = getDriverOfflineScope()) {
  const record: StoredDelivery = {
    key: scopeKey(route.id, scope),
    scope,
    routeId: route.id,
    route,
    savedAt: new Date().toISOString(),
  };
  await withStore(ASSIGNED_DELIVERIES_STORE, 'readwrite', async store => requestResult(store.put(record)));
}

export async function getCachedAssignedDelivery(routeId: string, scope = getDriverOfflineScope()) {
  const record = await withStore(
    ASSIGNED_DELIVERIES_STORE,
    'readonly',
    async store => requestResult(store.get(scopeKey(routeId, scope)) as IDBRequest<StoredDelivery | undefined>),
  );
  return record?.route || null;
}

export async function getCachedAssignedDeliveries(scope = getDriverOfflineScope()) {
  const records = await withStore(
    ASSIGNED_DELIVERIES_STORE,
    'readonly',
    async store => requestResult(store.index('scope').getAll(scope) as IDBRequest<StoredDelivery[]>),
  );
  return records
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
    .map(record => record.route);
}

const createId = () => globalThis.crypto?.randomUUID?.()
  || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export async function hashReceiptKey(receiptKey: string) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Seu navegador não permite confirmar entregas sem internet.');
  }

  const bytes = new TextEncoder().encode(receiptKey);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function queueStopSync(
  routeId: string,
  stopId: string,
  payload: PendingStopSync['payload'],
  scope = getDriverOfflineScope(),
) {
  const record: PendingStopSync = {
    id: createId(),
    scope,
    routeId,
    stopId,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    retryable: true,
  };
  await withStore(PENDING_SYNC_STORE, 'readwrite', async store => requestResult(store.put(record)));
  return record;
}

export async function getPendingStopSync(scope = getDriverOfflineScope()) {
  const records = await withStore(
    PENDING_SYNC_STORE,
    'readonly',
    async store => requestResult(store.index('scope').getAll(scope) as IDBRequest<PendingStopSync[]>),
  );
  return records.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

const updatePendingSync = async (record: PendingStopSync) => {
  await withStore(PENDING_SYNC_STORE, 'readwrite', async store => requestResult(store.put(record)));
};

const removePendingSync = async (id: string) => {
  await withStore(PENDING_SYNC_STORE, 'readwrite', async store => requestResult(store.delete(id)));
};

const getErrorMessage = (error: any) => (
  error?.response?.data?.message
  || error?.response?.data?.error
  || error?.message
  || 'Não foi possível enviar a confirmação. Tente novamente.'
);

export async function synchronizePendingStops(api: ApiClient, scope = getDriverOfflineScope()) {
  const pending = await getPendingStopSync(scope);
  let synchronized = 0;
  let retryableFailures = 0;
  let blockedFailures = 0;

  for (const item of pending) {
    if (!item.retryable || !isDriverOnline()) {
      if (!item.retryable) blockedFailures += 1;
      continue;
    }

    try {
      await api.patch(`/delivery-route-stops/${item.stopId}/check`, item.payload);
      await removePendingSync(item.id);
      synchronized += 1;
    } catch (error: any) {
      const hasResponse = Boolean(error?.response);
      const retryable = !hasResponse || error.response?.status >= 500 || error.response?.status === 429;
      await updatePendingSync({
        ...item,
        attempts: item.attempts + 1,
        lastError: getErrorMessage(error),
        retryable,
      });

      if (retryable) {
        retryableFailures += 1;
        if (!hasResponse) break;
      } else {
        blockedFailures += 1;
      }
    }
  }

  const remaining = (await getPendingStopSync(scope)).length;
  return { synchronized, remaining, retryableFailures, blockedFailures };
}
