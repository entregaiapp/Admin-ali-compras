import api from "@/shared/lib/api";
import type { ProductConfiguration, ProductConfigurationPatch, ProductStorePayload } from "../types/product";

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
    purchaseMode?: 'simples' | 'configuravel';
    includeOptionProducts?: boolean;
  }, options: { forceRefresh?: boolean } = {}) {
    void options;
    const active =
      params.active !== undefined
        ? params.active
        : params.activeOnly
          ? true
          : undefined;

    const response = await api.get("/produtos_loja", {
      params: {
        busca: params.search || undefined,
        categoria_id: params.categoryId || undefined,
        ativo: active,
        produto_ativo: active === true ? true : undefined,
        modo_compra: params.purchaseMode || undefined,
        incluir_opcoes_produto: params.includeOptionProducts || undefined,
        promocao_ativa: params.promoOnly || undefined,
        page: params.page,
        per_page: params.perPage,
      },
    });

    return toPaginatedProducts(response.data);
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
    void options;
    // Os filtros de produtos devem refletir exclusivamente o catálogo da loja.
    // A API também inclui os ancestrais necessários para preservar a navegação
    // por departamento, categoria e subcategoria.
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
    return response.data.data;
  },

  async createLocalProduct(payload: Record<string, any>) {
    const response = await api.post("/produtos_loja/locais", payload);
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
    return response.data.data;
  },

  async patchProductConfiguration(productStoreId: string, configurationPatch: ProductConfigurationPatch) {
    const response = await api.patch(`/produtos_loja/${productStoreId}/configuracao`, configurationPatch, {
      timeout: 60000,
    });
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

    return response.data.data;
  },

  async updateStoreProduct(productStoreId: string, payload: Partial<ProductStorePayload> & Record<string, any>) {
    await api.patch(`/produtos_loja/${productStoreId}`, payload);
  },

  async uploadProductImage(productId: string, file: File, isPrimary = true) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("is_primary", String(isPrimary));
    const response = await api.post(`/produtos/${productId}/images/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  },

  async uploadProductImageFromUrl(productId: string, url: string, isPrimary = true) {
    const response = await api.post(`/produtos/${productId}/images/from-url`, {
      url,
      is_primary: isPrimary,
    });
    return response.data.data;
  },

  async createStoreProductVariation(payload: Record<string, any>) {
    await api.post("/variacoes_produto_loja", payload);
  },

  async toggleHighlight(productStoreId: string, highlighted: boolean) {
    await api.patch(`/produtos_loja/${productStoreId}`, { destaque: highlighted });
  },

  async toggleStatus(productStoreId: string, active: boolean) {
    await api.patch(`/produtos_loja/${productStoreId}/ativo`, { ativo: active });
  },

  async removeStoreProduct(productStoreId: string) {
    const response = await api.delete(`/produtos_loja/${productStoreId}`);
    return response.data.data as { deactivatedLocalProduct?: boolean; removedLocalProduct?: boolean };
  },
};
