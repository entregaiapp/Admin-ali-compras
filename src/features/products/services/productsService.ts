import api from "@/shared/lib/api";
import type { ProductConfiguration, ProductStorePayload } from "../types/product";

const STORE_PRODUCTS_CACHE_PREFIX = "admin-store-products:v1:";
const ACTIVE_CATEGORIES_CACHE_PREFIX = "admin-active-categories:v4:";
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
};

export const productsService = {
  async getStoreProducts() {
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
      page: params.page,
      perPage: params.perPage,
    })}`;
    const cached = options.forceRefresh ? null : getSessionItem<ReturnType<typeof toPaginatedProducts>>(cacheKey);
    if (cached) return cached;

    const response = await api.get("/produtos_loja", {
      params: {
        busca: params.search || undefined,
        categoria_id: params.categoryId || undefined,
        ativo: active,
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

    const responses = await Promise.allSettled(
      uniqueIds.map((id) => api.get(`/produtos_loja/${id}`)),
    );

    return responses.flatMap((response) => (
      response.status === "fulfilled" && response.value.data.data
        ? [response.value.data.data]
        : []
    ));
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
    const lojaId = getStoreId();
    // No Admin, "em uso" significa que o produto está vinculado à loja, inclusive
    // quando está temporariamente inativo. Assim, o gestor ainda consegue filtrar
    // e reativar o item. Produtos simples e configuráveis usam a mesma categoria
    // final no vínculo produtos_loja.
    if (!lojaId) return [];

    const cacheKey = `${ACTIVE_CATEGORIES_CACHE_PREFIX}${lojaId}`;
    const cached = options.forceRefresh ? null : getSessionItem<any[]>(cacheKey);
    if (cached) return cached;

    const firstResponse = await api.get("/categorias", {
      params: { ativa: true, page: 1, per_page: 100 },
    });
    const firstData = firstResponse.data?.data;
    const totalPages = firstData?.total_pages || 1;
    const remainingResponses = totalPages > 1
      ? await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            api.get("/categorias", {
              params: { ativa: true, page: index + 2, per_page: 100 },
            }),
          ),
        )
      : [];
    const categories = [
      ...toList(firstResponse.data),
      ...remainingResponses.flatMap((response) => toList(response.data)),
    ];

    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    const usedCategoryIds = new Set<string>();
    const storeProducts = await this.getAllStoreProducts();

    storeProducts.forEach((product) => {
      if (product.produto_ativo === false) return;

      const categoryId = product.categoria_final_id || product.categoria_id;
      let category = categoryId ? categoriesById.get(categoryId) : null;

      while (category) {
        if (usedCategoryIds.has(category.id)) break;
        usedCategoryIds.add(category.id);
        category = category.categoria_pai_id
          ? categoriesById.get(category.categoria_pai_id)
          : null;
      }
    });

    const usedCategories = categories.filter((category) => usedCategoryIds.has(category.id));

    setSessionItem(cacheKey, usedCategories);
    return usedCategories;
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

  invalidateStoreProductsCache,
};
