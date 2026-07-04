import api from '@/shared/lib/api';

const DATABASE_NAME = 'ali-compras-admin-cache';
const DATABASE_VERSION = 1;
const DATA_STORE = 'data';
const IMAGE_CACHE_PREFIX = 'ali-compras-admin-images:';

type CachedRecord = {
  key: string;
  scope: string;
  value: unknown;
  savedAt: string;
};

export type AdminCacheProgress = {
  progress: number;
  message: string;
  detail?: string;
};

export type AdminCacheWarmupResult = {
  cachedResources: number;
  cachedImages: number;
  skippedResources: number;
  savedAt: string;
};

type AdminCacheUser = {
  id?: string;
  loja_id?: string;
};

const isBrowser = () => typeof window !== 'undefined';

const getDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (!isBrowser() || !('indexedDB' in window)) {
    reject(new Error('Este navegador não permite preparar os dados para uso rápido.'));
    return;
  }

  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onerror = () => reject(request.error || new Error('Não foi possível preparar os dados neste dispositivo.'));
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(DATA_STORE)) {
      const store = database.createObjectStore(DATA_STORE, { keyPath: 'key' });
      store.createIndex('scope', 'scope', { unique: false });
    }
  };
  request.onsuccess = () => resolve(request.result);
});

const requestResult = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Não foi possível acessar os dados preparados.'));
});

const completeTransaction = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error || new Error('Não foi possível salvar os dados neste dispositivo.'));
  transaction.onabort = () => reject(transaction.error || new Error('Preparação cancelada.'));
});

const withDataStore = async <T,>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => Promise<T>,
) => {
  const database = await getDatabase();
  try {
    const transaction = database.transaction(DATA_STORE, mode);
    const result = await operation(transaction.objectStore(DATA_STORE));
    await completeTransaction(transaction);
    return result;
  } finally {
    database.close();
  }
};

export function getAdminCacheScope(user?: AdminCacheUser | null) {
  if (!user && isBrowser()) {
    try {
      user = JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      user = null;
    }
  }

  return `admin:${user?.loja_id || 'global'}:${user?.id || 'anonymous'}`;
}

const recordKey = (scope: string, key: string) => `${scope}:${key}`;

export async function saveAdminCachedData(scope: string, key: string, value: unknown) {
  const record: CachedRecord = {
    key: recordKey(scope, key),
    scope,
    value,
    savedAt: new Date().toISOString(),
  };
  await withDataStore('readwrite', (store) => requestResult(store.put(record)));
}

export async function getAdminCachedData<T>(scope: string, key: string): Promise<T | null> {
  const record = await withDataStore(
    'readonly',
    (store) => requestResult(store.get(recordKey(scope, key)) as IDBRequest<CachedRecord | undefined>),
  );
  return (record?.value as T | undefined) ?? null;
}

export async function deleteAdminCachedData(scope: string, key: string) {
  await withDataStore('readwrite', (store) => requestResult(store.delete(recordKey(scope, key))));
}

const unwrap = (payload: any) => payload?.data?.data ?? payload?.data ?? payload;

const toList = (payload: any): any[] => {
  const data = unwrap(payload);
  return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
};

const getTotalPages = (payload: any) => {
  const candidates = [payload?.data, payload?.data?.data, payload];
  const pageContainer = candidates.find((candidate) => candidate && !Array.isArray(candidate)
    && (candidate.total_pages !== undefined || candidate.totalPages !== undefined));
  const pages = Number(pageContainer?.total_pages ?? pageContainer?.totalPages ?? 1);
  return Number.isFinite(pages) && pages > 0 ? pages : 1;
};

const getTodayInBrasilia = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const getAllPages = async (url: string, params: Record<string, unknown> = {}) => {
  const firstResponse = await api.get(url, { params: { ...params, page: 1, per_page: 100 } });
  const firstList = toList(firstResponse.data);
  const totalPages = getTotalPages(firstResponse.data);

  if (totalPages <= 1) return firstList;

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => api.get(url, {
      params: { ...params, page: index + 2, per_page: 100 },
    })),
  );

  return [...firstList, ...remaining.flatMap((response) => toList(response.data))];
};

const isImageProperty = (key: string) => /(?:imagem|image|foto|photo|logo|thumbnail|banner)/i.test(key);

const isImageUrl = (value: string) => /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(value)
  || /(?:image|imagem|upload|storage|media)/i.test(value);

const getImageUrls = (value: unknown, key = '', urls = new Set<string>()) => {
  if (typeof value === 'string') {
    if (isImageProperty(key) || isImageUrl(value)) urls.add(value);
    return urls;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => getImageUrls(item, key, urls));
  } else if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => {
      getImageUrls(childValue, childKey, urls);
    });
  }

  return urls;
};

const toAbsoluteImageUrl = (url: string) => {
  try {
    return new URL(url, String(api.defaults.baseURL || window.location.origin)).href;
  } catch {
    return null;
  }
};

const cacheImages = async (
  scope: string,
  imageUrls: string[],
  onProgress: (cached: number, total: number) => void,
) => {
  if (!('caches' in window) || imageUrls.length === 0) return 0;

  const cache = await caches.open(`${IMAGE_CACHE_PREFIX}${scope}`);
  let completed = 0;
  let cached = 0;
  const queue = [...imageUrls];
  const worker = async () => {
    while (queue.length) {
      const imageUrl = queue.shift();
      if (!imageUrl) continue;

      try {
        const request = new Request(imageUrl, { mode: 'no-cors' });
        const existing = await cache.match(request);
        if (!existing) {
          const response = await fetch(request);
          if (response.ok || response.type === 'opaque') await cache.put(request, response.clone());
        }
        cached += 1;
      } catch {
        // A failed image should not prevent the rest of the catalog from being available.
      } finally {
        completed += 1;
        onProgress(completed, imageUrls.length);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(4, imageUrls.length) }, worker));
  return cached;
};

export async function warmAdminCache({
  user,
  onProgress,
}: {
  user?: AdminCacheUser | null;
  onProgress: (progress: AdminCacheProgress) => void;
}): Promise<AdminCacheWarmupResult> {
  if (!isBrowser()) throw new Error('Este recurso só está disponível no navegador.');

  const scope = getAdminCacheScope(user);
  const lojaId = user?.loja_id;
  const resources: Array<{ key: string; label: string; load: () => Promise<unknown> }> = [
    {
      key: 'catalog:products',
      label: 'Baixando o catálogo de produtos',
      load: () => getAllPages('/produtos_loja', { incluir_opcoes_produto: true }),
    },
    {
      key: 'catalog:categories',
      label: 'Baixando as categorias do catálogo',
      load: () => getAllPages('/categorias', { ativa: true, apenas_vinculadas: true }),
    },
    {
      key: 'categories',
      label: 'Preparando todas as categorias',
      load: () => getAllPages('/categorias'),
    },
    {
      key: 'customers',
      label: 'Preparando os clientes rápidos',
      load: () => getAllPages('/clientes'),
    },
    {
      key: 'banners',
      label: 'Baixando banners e imagens promocionais',
      load: () => getAllPages('/banners'),
    },
    {
      key: 'delivery:areas',
      label: 'Preparando áreas de entrega',
      load: () => getAllPages('/areas_entrega'),
    },
    {
      key: 'drivers',
      label: 'Preparando entregadores',
      load: () => getAllPages('/entregadores'),
    },
    {
      key: 'vehicles',
      label: 'Preparando veículos',
      load: () => getAllPages('/automoveis'),
    },
    {
      key: 'coupons',
      label: 'Preparando cupons',
      load: () => getAllPages('/cupons'),
    },
  ];

  if (lojaId) {
    resources.unshift(
      {
        key: 'store',
        label: 'Preparando dados da loja',
        load: async () => unwrap((await api.get(`/lojas/${lojaId}`)).data),
      },
      {
        key: 'store:settings',
        label: 'Preparando configurações da loja',
        load: async () => unwrap((await api.get(`/lojas/${lojaId}/configuracoes`)).data),
      },
      {
        key: 'store:hours',
        label: 'Preparando horários de funcionamento',
        load: async () => unwrap((await api.get(`/horarios_funcionamento/${lojaId}`)).data),
      },
    );
  }

  const cachedPayloads: unknown[] = [];
  let cachedResources = 0;
  let skippedResources = 0;
  onProgress({ progress: 0, message: 'Preparando armazenamento local', detail: '0%' });

  for (let index = 0; index < resources.length; index += 1) {
    const resource = resources[index];
    onProgress({ progress: Math.round((index / resources.length) * 65), message: resource.label });
    try {
      const value = await resource.load();
      await saveAdminCachedData(scope, resource.key, value);
      cachedPayloads.push(value);
      cachedResources += 1;
    } catch (error) {
      console.warn(`Não foi possível aquecer o cache de ${resource.key}:`, error);
      skippedResources += 1;
    }
  }

  const products = cachedPayloads
    .flatMap((payload) => Array.isArray(payload) ? payload : [])
    .filter((item: any) => item && typeof item === 'object' && (item.produto_id || item.ativo_na_loja !== undefined));
  const configurableProducts = products.filter((product: any) => product.modo_compra === 'configuravel');
  const configurations: unknown[] = [];

  if (configurableProducts.length) {
    onProgress({ progress: 68, message: 'Baixando opções dos produtos configuráveis' });
    const configurationResults = await Promise.allSettled(
      configurableProducts.map((product: any) => api.get(`/produtos_loja/${product.id}/configuracao`)),
    );
    const byProductId: Record<string, unknown> = {};
    configurationResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const configuration = unwrap(result.value.data);
        byProductId[configurableProducts[index].id] = configuration;
        configurations.push(configuration);
      }
    });
    await saveAdminCachedData(scope, 'catalog:configurations', byProductId);
    cachedResources += 1;
  }

  const today = getTodayInBrasilia();
  onProgress({ progress: 72, message: 'Preparando indicadores do dashboard' });
  try {
    const metrics = unwrap((await api.get(`/metricas?dataInicio=${today}&dataFim=${today}`)).data);
    await saveAdminCachedData(scope, `dashboard:${today}`, metrics);
    cachedPayloads.push(metrics);
    cachedResources += 1;
  } catch (error) {
    console.warn('Não foi possível aquecer os indicadores do dashboard:', error);
    skippedResources += 1;
  }

  const imageUrls = Array.from(getImageUrls([...cachedPayloads, ...configurations]))
    .map(toAbsoluteImageUrl)
    .filter((url): url is string => Boolean(url));

  onProgress({ progress: 75, message: imageUrls.length ? 'Salvando imagens do catálogo' : 'Finalizando preparação' });
  const cachedImages = await cacheImages(scope, imageUrls, (completed, total) => {
    const progress = 75 + Math.round((completed / total) * 25);
    onProgress({
      progress,
      message: 'Salvando imagens do catálogo',
      detail: `${completed} de ${total} imagens`,
    });
  });

  if (navigator.storage?.persist) {
    void navigator.storage.persist();
  }

  const savedAt = new Date().toISOString();
  await saveAdminCachedData(scope, 'warmup:meta', { savedAt, cachedResources, cachedImages });
  onProgress({ progress: 100, message: 'Sistema preparado para acesso rápido', detail: '100%' });

  return { cachedResources, cachedImages, skippedResources, savedAt };
}
