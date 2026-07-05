import api from "@/shared/lib/api";
import { deleteAdminCachedData, getAdminCachedData, getAdminCacheScope } from '@/features/performance';
import type { ProductConfiguration, ProductStorePayload } from "../types/product";

const STORE_PRODUCTS_CACHE_PREFIX = "admin-store-products:v1:";
const ACTIVE_CATEGORIES_CACHE_PREFIX = "admin-product-categories:v10:";
const CACHE_MAX_AGE = 5 * 60 * 1000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

const toList = (payload: any) => {
  const data = payload?.data;
  return Array.isArray(data) ? data : data?.data || [];
};

const toPaginatedProducts = (payload: any) => {
  const data = payload?.data;
  const products = Array.isArray(data) ? data : data?.data || [];

  return {
    products,
    total: data?.total ?? products.length,
    page: data?.page ?? 1,
    perPage: data?.per_page ?? products.length,
    totalPages: data?.total_pages ?? 1,
  };
};

const getSessionItem = <T,>(key: string): T | null => {
  try {
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (!parsed?.createdAt || Date.now() - parsed.createdAt > CACHE_MAX_AGE) {
      sessionStorage.removeItem(key);
      return null;
    }

    return parsed.data as T;
  } catch {
    return null;
  }
};

const setSessionItem = (key: string, data: unknown) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ createdAt: Date.now(), data }));
  } catch {
    // Network results remain usable if browser storage is unavailable.
  }
};

const getStoreId = (): string | null => {
  try {
    const lojaId = JSON.parse(localStorage.getItem("user") || "{}")?.loja_id;
    return UUID_REGEX.test(lojaId) ? lojaId : null;
  } catch {
    return null;
  }
};

const clearCacheByPrefix = (prefix: string) => {
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Ignore unavailable storage.
  }
};

const invalidateStoreProductsCache = () => {
  clearCacheByPrefix(STORE_PRODUCTS_CACHE_PREFIX);
  clearCacheByPrefix(ACTIVE_CATEGORIES_CACHE_PREFIX);
  void deleteAdminCachedData(getAdminCacheScope(), 'catalog:products');
  void deleteAdminCachedData(getAdminCacheScope(), 'catalog:configurations');
};

const getWarmedStoreProducts = () => getAdminCachedData<any[]>(getAdminCacheScope(), 'catalog:products');

const getWarmedCategories = () => getAdminCachedData<any[]>(getAdminCacheScope(), 'catalog:categories');

export const productsService = {
  async getStoreProducts() {
    const warmedProducts = await getWarmedStoreProducts();
    if (warmedProducts) return warmedProducts;

    const response = await api.get("/produtos_loja");
    return toList(response.data);
  },

  async getStoreProductsPage(params: {
    search?: string;
    categoryId?: string;
    page: number;
    perPage: number;
    active?: boolean;
    activeOnly?: boolean;
    promoOnly?: boolean;
    purchaseMode?: 'simples' | 'configuravel';
    includeOptionProducts?: boolean;
  }, options: { forceRefresh?: boolean } = {}) {
    const active =
      params.active !== undefined
        ? params.active
        : params.activeOnly
          ? true
          : undefined;
    const cacheKey = `${STORE_PRODUCTS_CACHE_PREFIX}${JSON.stringify({
      lojaId: getStoreId(),
      search: params.search?.trim() || "",
      categoryId: params.categoryId || "",
      active,
      promoOnly: Boolean(params.promoOnly),
      purchaseMode: params.purchaseMode || '',
      includeOptionProducts: Boolean(params.includeOptionProducts),
      page: params.page,
      perPage: params.perPage,
    })}`;
    const cached = options.forceRefresh ? null : getSessionItem<ReturnType<typeof toPaginatedProducts>>(cacheKey);
    if (cached) return cached;

    const canUseWarmedCatalog = !options.forceRefresh
      && !params.search?.trim()
      && !params.categoryId
      && !params.promoOnly;
    if (canUseWarmedCatalog) {
      const warmedProducts = await getWarmedStoreProducts();
      if (warmedProducts) {
        const filteredProducts = warmedProducts.filter((product: any) => {
          const productIsActive = product.ativo_na_loja ?? product.ativo;
          if (active !== undefined && Boolean(productIsActive) !== active) return false;
          if (params.purchaseMode && product.modo_compra !== params.purchaseMode) return false;
          return true;
        });
        const offset = (params.page - 1) * params.perPage;
        return {
          products: filteredProducts.slice(offset, offset + params.perPage),
          total: filteredProducts.length,
          page: params.page,
          perPage: params.perPage,
          totalPages: Math.max(1, Math.ceil(filteredProducts.length / params.perPage)),
        };
      }
    }

    const response = await api.get("/produtos_loja", {
      params: {
        busca: params.search || undefined,
        categoria_id: params.categoryId || undefined,
        ativo: active,
        modo_compra: params.purchaseMode || undefined,
        incluir_opcoes_produto: params.includeOptionProducts || undefined,
        promocao_ativa: params.promoOnly || undefined,
        page: params.page,
        per_page: params.perPage,
      },
    });

    const result = toPaginatedProducts(response.data);
    setSessionItem(cacheKey, result);
    return result;
  },

  async getStoreProductsByIds(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return [];

    const virtualIds = uniqueIds.filter((id) => id.includes(':'));
    const storeProductIds = uniqueIds.filter((id) => !id.includes(':'));

    const responses = await Promise.allSettled(
      storeProductIds.map((id) => api.get(`/produtos_loja/${id}`)),
    );

    const virtualProducts = virtualIds.length > 0
      ? await api.get('/produtos_loja', {
        params: { incluir_opcoes_produto: true, ativo: true, per_page: 1000 },
      }).then((response) => toPaginatedProducts(response.data).products.filter((product: any) => virtualIds.includes(product.id)))
      : [];

    return [
      ...responses.flatMap((response) => (
      response.status === "fulfilled" && response.value.data.data
        ? [response.value.data.data]
        : []
      )),
      ...virtualProducts,
    ];
  },

  async getAllStoreProducts() {
    const firstResponse = await api.get("/produtos_loja", {
      params: { page: 1, per_page: 100 },
    });
    const firstData = firstResponse.data?.data;
    const firstList = toList(firstResponse.data);
    const totalPages = firstData?.total_pages || 1;

    if (totalPages <= 1) return firstList;

    const remainingResponses = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        api.get("/produtos_loja", {
          params: { page: index + 2, per_page: 100 },
        }),
      ),
    );

    return [
      ...firstList,
      ...remainingResponses.flatMap((response) => toList(response.data)),
    ];
  },

  async getActiveCategories(options: { forceRefresh?: boolean } = {}) {
    // Os filtros de produtos devem refletir exclusivamente o catálogo da loja.
    // A API também inclui os ancestrais necessários para preservar a navegação
    // por departamento, categoria e subcategoria.
    // Não há cache aqui: categorias variam conforme vínculos e não podem vazar
    // de uma loja ou sessão anterior para o módulo atual.
    if (!options.forceRefresh) {
      const warmedCategories = await getWarmedCategories();
      if (warmedCategories) return warmedCategories;
    }
    const categoriesEndpoint = "/categorias";
    const firstResponse = await api.get(categoriesEndpoint, {
      params: { ativa: true, apenas_vinculadas: true, page: 1, per_page: 100 },
    });
    const firstData = firstResponse.data?.data;
    const totalPages = firstData?.total_pages || 1;
    const remainingResponses = totalPages > 1
      ? await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            api.get(categoriesEndpoint, { params: { ativa: true, apenas_vinculadas: true, page: index + 2, per_page: 100 } }),
          ),
        )
      : [];
    const categories = [
      ...toList(firstResponse.data),
      ...remainingResponses.flatMap((response) => toList(response.data)),
    ];

    return categories;
  },

  async searchGlobalProducts(params: {
    search?: string;
    page: number;
    perPage: number;
  }) {
    const response = await api.get("/produtos", {
      params: {
        busca_global: params.search || undefined,
        ativo: true,
        escopo_catalogo: "global",
        page: params.page,
        per_page: params.perPage,
      },
    });

    const responseData = response.data.data;
    return {
      products: Array.isArray(responseData) ? responseData : responseData?.data || [],
      totalPages: responseData?.total_pages || 1,
    };
  },

  async getProductVariations(productId: string) {
    const response = await api.get("/variacoes_produto", {
      params: { produto_id: productId },
    });
    return toList(response.data);
  },

  async createStoreProduct(payload: ProductStorePayload) {
    const response = await api.post("/produtos_loja", payload);
    invalidateStoreProductsCache();
    return response.data.data;
  },

  async createLocalProduct(payload: Record<string, any>) {
    const response = await api.post("/produtos_loja/locais", payload);
    invalidateStoreProductsCache();
    return response.data.data;
  },

  async getProductConfiguration(productStoreId: string): Promise<any> {
    const response = await api.get(`/produtos_loja/${productStoreId}/configuracao`);
    return response.data.data;
  },

  async updateProductConfiguration(productStoreId: string, configuration: ProductConfiguration) {
    const response = await api.put(`/produtos_loja/${productStoreId}/configuracao`, configuration, {
      timeout: 60000,
    });
    invalidateStoreProductsCache();
    return response.data.data;
  },

  async uploadConfigurationOptionImage(productStoreId: string, file: File) {
    const formData = new FormData();
    formData.append("image", file);
    const response = await api.post(`/produtos_loja/${productStoreId}/configuracao/opcoes/imagem`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data as { url: string };
  },

  async importStoreProductsCSV(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/produtos_loja/importar-csv", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    });

    invalidateStoreProductsCache();
    return response.data.data;
  },

  async updateStoreProduct(productStoreId: string, payload: Partial<ProductStorePayload> & Record<string, any>) {
    await api.patch(`/produtos_loja/${productStoreId}`, payload);
    invalidateStoreProductsCache();
  },

  async uploadProductImage(productId: string, file: File, isPrimary = true) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("is_primary", String(isPrimary));
    const response = await api.post(`/produtos/${productId}/images/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    invalidateStoreProductsCache();
    return response.data.data;
  },

  async uploadProductImageFromUrl(productId: string, url: string, isPrimary = true) {
    const response = await api.post(`/produtos/${productId}/images/from-url`, {
      url,
      is_primary: isPrimary,
    });
    invalidateStoreProductsCache();
    return response.data.data;
  },

  async createStoreProductVariation(payload: Record<string, any>) {
    await api.post("/variacoes_produto_loja", payload);
  },

  async toggleHighlight(productStoreId: string, highlighted: boolean) {
    await api.patch(`/produtos_loja/${productStoreId}`, { destaque: highlighted });
    invalidateStoreProductsCache();
  },

  async toggleStatus(productStoreId: string, active: boolean) {
    await api.patch(`/produtos_loja/${productStoreId}/ativo`, { ativo: active });
    invalidateStoreProductsCache();
  },

  async removeStoreProduct(productStoreId: string) {
    const response = await api.delete(`/produtos_loja/${productStoreId}`);
    invalidateStoreProductsCache();
    return response.data.data as { deactivatedLocalProduct?: boolean; removedLocalProduct?: boolean };
  },

  invalidateStoreProductsCache,
};
