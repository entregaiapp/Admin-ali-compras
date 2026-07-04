import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, GripVertical, X, Image, Calendar, Power, Loader2, UploadCloud, ArrowUp, ArrowDown, Search, PackageCheck } from 'lucide-react';
import { bannersService } from '../services/bannersService';
import type { Banner, BannerDisplayType, BannerPageKey, BannerPayload, BannerPlacementKey, BannerSegmentRules } from '../types/banner';
import { productsService } from '@/features/products';
import { dateInputInBrasilia, endOfBrasiliaDayInput, startOfBrasiliaDayInput } from '@/shared/lib/dateTime';

const PRIMARY = '#122a4c';

const displayOptions: Array<{ value: BannerDisplayType; label: string }> = [
  { value: 'inline', label: 'Inline' },
  { value: 'modal', label: 'Modal' },
  { value: 'full_width', label: 'Full width' },
  { value: 'fixed', label: 'Fixo' },
];

const pageOptions: Array<{ value: BannerPageKey; label: string }> = [
  { value: 'home', label: 'Home' },
  { value: 'products', label: 'Produtos' },
  { value: 'categories', label: 'Categorias' },
  { value: 'cart', label: 'Carrinho' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'payment', label: 'Pagamento' },
  { value: 'order_confirmed', label: 'Pedido confirmado' },
  { value: 'profile', label: 'Perfil' },
  { value: 'notifications', label: 'Notificações' },
  { value: 'support', label: 'Suporte' },
];

const placementOptions: Array<{ value: BannerPlacementKey; label: string; pages: BannerPageKey[] }> = [
  { value: 'home_top', label: 'Topo da home', pages: ['home'] },
  { value: 'below_categories', label: 'Abaixo das categorias', pages: ['home'] },
  { value: 'below_promos', label: 'Abaixo das ofertas', pages: ['home'] },
  { value: 'below_bestsellers', label: 'Abaixo dos mais vendidos', pages: ['home'] },
  { value: 'below_buy_again', label: 'Abaixo de compre novamente', pages: ['home'] },
  { value: 'below_featured', label: 'Abaixo dos destaques', pages: ['home'] },
  { value: 'products_top', label: 'Topo de produtos', pages: ['products'] },
  { value: 'categories_top', label: 'Topo de categorias', pages: ['categories'] },
  { value: 'cart_top', label: 'Topo do carrinho', pages: ['cart'] },
  { value: 'checkout_top', label: 'Topo do checkout', pages: ['checkout', 'payment', 'order_confirmed'] },
];

const placementLabelByValue = new Map(placementOptions.map((option) => [option.value, option.label]));

const unique = <T,>(items: T[]) => Array.from(new Set(items));

function derivePageKeys(placementKeys: BannerPlacementKey[]): BannerPageKey[] {
  const pageKeys = unique(placementKeys.flatMap((placementKey) => (
    placementOptions.find((option) => option.value === placementKey)?.pages || []
  )));
  return pageKeys.length ? pageKeys : ['home'];
}

function formatBannerPlacements(banner: Pick<Banner, 'placement_key' | 'placement_keys'>) {
  const placementKeys = banner.placement_keys?.length ? banner.placement_keys : [banner.placement_key];
  return placementKeys
    .map((placementKey) => placementLabelByValue.get(placementKey) || placementKey)
    .join(', ');
}

const audienceOptions: Array<{ value: BannerSegmentRules['audience']; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'authenticated', label: 'Clientes logados' },
  { value: 'new', label: 'Novos clientes' },
  { value: 'returning', label: 'Clientes recorrentes' },
  { value: 'inactive', label: 'Sem pedido há X dias' },
];

const emptyRules: BannerSegmentRules = { audience: 'all' };

const emptyPayload: BannerPayload = {
  titulo: '',
  subtitulo: '',
  cta_text: 'Ver ofertas',
  imagem_url: '',
  imagem_path: '',
  display_type: 'inline',
  page_key: 'home',
  page_keys: ['home'],
  placement_key: 'home_top',
  placement_keys: ['home_top'],
  action_type: 'product_collection',
  background_color: PRIMARY,
  ativo: true,
  prioridade: 0,
  inicia_em: '',
  expira_em: '',
  segment_rules: emptyRules,
  produto_loja_ids: [],
};

function toDateInput(value?: string | null) {
  if (!value) return '';
  return dateInputInBrasilia(value);
}

function listToText(value?: string[]) {
  return (value || []).join(', ');
}

function textToList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function bannerToPayload(banner?: Banner | null): BannerPayload {
  if (!banner) return emptyPayload;
  const placementKeys = banner.placement_keys?.length ? banner.placement_keys : [banner.placement_key || 'home_top'];
  const pageKeys = banner.page_keys?.length ? banner.page_keys : derivePageKeys(placementKeys);
  return {
    titulo: banner.titulo || '',
    subtitulo: banner.subtitulo || '',
    cta_text: banner.cta_text || 'Ver ofertas',
    imagem_url: banner.imagem_url || '',
    imagem_path: banner.imagem_path || '',
    display_type: banner.display_type,
    page_key: banner.page_key || pageKeys[0],
    page_keys: pageKeys,
    placement_key: banner.placement_key || placementKeys[0],
    placement_keys: placementKeys,
    action_type: 'product_collection',
    background_color: banner.background_color || PRIMARY,
    ativo: banner.ativo,
    prioridade: banner.prioridade || 0,
    inicia_em: toDateInput(banner.inicia_em),
    expira_em: toDateInput(banner.expira_em),
    segment_rules: banner.segment_rules || emptyRules,
    produto_loja_ids: banner.produto_loja_ids || [],
  };
}

function getProductCategoryLabel(product: any) {
  return product.categoria_caminho || product.categoria_nome || 'Sem categoria';
}

function ProductPickerModal({
  title = 'Selecionar produtos do banner',
  categories,
  selectedIds,
  onChange,
  onProductsSeen,
  onClose,
}: {
  title?: string;
  categories: any[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onProductsSeen: (products: any[]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [purchaseMode, setPurchaseMode] = useState<'all' | 'simples' | 'configuravel'>('all');
  const [promoOnly, setPromoOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<any[]>([]);
  const [productById, setProductById] = useState<Record<string, any>>({});
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const perPage = 30;

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedProducts = useMemo(() => (
    selectedIds.map((id) => productById[id] || { id, nome: id })
  ), [productById, selectedIds]);

  const currentPage = Math.min(page, totalPages);
  const visibleProducts = products;

  const rememberProducts = useCallback((items: any[]) => {
    if (items.length === 0) return;
    setProductById((current) => {
      const next = { ...current };
      items.forEach((product) => {
        next[product.id] = product;
      });
      return next;
    });
    onProductsSeen(items);
  }, [onProductsSeen]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let ignore = false;

    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        setProductError(null);
        const result = await productsService.getStoreProductsPage({
          search: debouncedQuery,
          categoryId,
          purchaseMode: purchaseMode === 'all' ? undefined : purchaseMode,
          includeOptionProducts: true,
          promoOnly,
          page,
          perPage,
          activeOnly: true,
        });

        if (ignore) return;
        setProducts(result.products);
        setTotalProducts(result.total);
        setTotalPages(Math.max(1, result.totalPages));
        rememberProducts(result.products);
      } catch (error: any) {
        if (!ignore) {
          setProductError(error?.response?.data?.message || error?.message || 'Não foi possível buscar os produtos.');
        }
      } finally {
        if (!ignore) setLoadingProducts(false);
      }
    };

    fetchProducts();

    return () => {
      ignore = true;
    };
  }, [categoryId, debouncedQuery, page, perPage, promoOnly, purchaseMode, rememberProducts]);

  useEffect(() => {
    const missingIds = selectedIds.filter((id) => !productById[id]);
    if (missingIds.length === 0) return;

    let ignore = false;

    const fetchSelectedProducts = async () => {
      try {
        const selectedProductsData = await productsService.getStoreProductsByIds(missingIds);
        if (!ignore) rememberProducts(selectedProductsData);
      } catch (error) {
        console.error('Erro ao buscar produtos selecionados do banner:', error);
      }
    };

    fetchSelectedProducts();

    return () => {
      ignore = true;
    };
  }, [productById, rememberProducts, selectedIds]);

  useEffect(() => {
    setPage(1);
  }, [categoryId, debouncedQuery, promoOnly, purchaseMode]);

  const toggle = (productId: string) => {
    onChange(selectedSet.has(productId)
      ? selectedIds.filter((id) => id !== productId)
      : [...selectedIds, productId]);
  };

  const selectVisible = () => {
    const next = new Set(selectedIds);
    visibleProducts.forEach((product) => next.add(product.id));
    onChange(Array.from(next));
  };

  const clearSelected = () => onChange([]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{selectedIds.length} selecionado{selectedIds.length === 1 ? '' : 's'} · {totalProducts} encontrado{totalProducts === 1 ? '' : 's'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_300px]">
          <div className="flex min-h-0 flex-col border-r border-gray-100">
            <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-[1fr_240px_220px]">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Buscar por nome, marca, código ou categoria"
                />
              </div>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.caminho || category.nome}
                  </option>
                ))}
              </select>
              <select
                value={purchaseMode}
                onChange={(event) => setPurchaseMode(event.target.value as 'all' | 'simples' | 'configuravel')}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="all">Todos os tipos de produto</option>
                <option value="simples">Produtos simples</option>
                <option value="configuravel">Produtos configuráveis</option>
              </select>
              <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 md:col-span-3">
                <input
                  type="checkbox"
                  checked={promoOnly}
                  onChange={(event) => setPromoOnly(event.target.checked)}
                />
                Apenas produtos em promoção
              </label>
            </div>

            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <button type="button" onClick={selectVisible} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                Selecionar página atual
              </button>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-gray-200 px-2 py-1 disabled:opacity-40">
                  Anterior
                </button>
                <span>Página {currentPage} de {totalPages}</span>
                <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-lg border border-gray-200 px-2 py-1 disabled:opacity-40">
                  Próxima
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {loadingProducts ? (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 py-14 text-center text-sm text-gray-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando produtos...
                </div>
              ) : productError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {productError}
                </div>
              ) : visibleProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-14 text-center text-sm text-gray-500">
                  <PackageCheck className="mb-2 h-8 w-8 text-gray-300" />
                  Nenhum produto encontrado.
                </div>
              ) : (
                <div className="grid gap-2">
                  {visibleProducts.map((product) => {
                    const selected = selectedSet.has(product.id);
                    return (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() => toggle(product.id)}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${selected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                      >
                        <input type="checkbox" checked={selected} readOnly className="h-4 w-4" />
                        {product.imagem_url ? (
                          <img src={product.imagem_url} alt={product.nome} className="h-12 w-12 rounded-lg object-cover" />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-gray-100" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-gray-900">{product.nome}</div>
                          {product.modo_compra === 'configuravel' && (
                            <span className="mt-1 inline-flex rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">Configurável</span>
                          )}
                          <div className="truncate text-xs text-gray-500">{product.marca || 'Sem marca'} · {getProductCategoryLabel(product)}</div>
                        </div>
                        <div className="text-sm font-bold text-gray-800">
                          {product.preco ? `R$ ${Number(product.preco).toFixed(2).replace('.', ',')}` : '-'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <aside className="flex min-h-0 flex-col bg-gray-50">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <span className="text-sm font-semibold text-gray-800">Selecionados</span>
              <button type="button" onClick={clearSelected} className="text-xs font-semibold text-red-600 hover:text-red-700">
                Limpar
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {selectedProducts.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
                  Nenhum produto selecionado.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm">
                      {product.imagem_url ? (
                        <img src={product.imagem_url} alt={product.nome} className="h-9 w-9 rounded-lg object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded-lg bg-gray-100" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-gray-800">{product.nome}</div>
                        <div className="truncate text-[11px] text-gray-400">{getProductCategoryLabel(product)}</div>
                      </div>
                      <button type="button" onClick={() => toggle(product.id)} className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 p-4">
              <button type="button" onClick={onClose} className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>
                Concluir seleção
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function BannerForm({
  banner,
  categories,
  categoriesLoading,
  onLoadCategories,
  onClose,
  onSaved,
}: {
  banner?: Banner | null;
  categories: any[];
  categoriesLoading: boolean;
  onLoadCategories: () => Promise<void>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<BannerPayload>(() => bannerToPayload(banner));
  const [productById, setProductById] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [productPickerTarget, setProductPickerTarget] = useState<'banner' | 'purchased' | null>(null);

  const selectedPlacements = useMemo(
    () => new Set(form.placement_keys?.length ? form.placement_keys : [form.placement_key]),
    [form.placement_key, form.placement_keys],
  );

  const selectedPageLabels = useMemo(
    () => derivePageKeys(form.placement_keys?.length ? form.placement_keys : [form.placement_key])
      .map((pageKey) => pageOptions.find((option) => option.value === pageKey)?.label || pageKey)
      .join(', '),
    [form.placement_key, form.placement_keys],
  );

  const rememberProducts = useCallback((items: any[]) => {
    if (items.length === 0) return;
    setProductById((current) => {
      const next = { ...current };
      items.forEach((product) => {
        next[product.id] = product;
      });
      return next;
    });
  }, []);

  useEffect(() => {
    onLoadCategories();
  }, [onLoadCategories]);

  const update = <K extends keyof BannerPayload>(key: K, value: BannerPayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const togglePlacement = (placementKey: BannerPlacementKey) => {
    setForm((current) => {
      const currentPlacementKeys = current.placement_keys?.length ? current.placement_keys : [current.placement_key];
      let placementKeys = currentPlacementKeys.includes(placementKey)
        ? currentPlacementKeys.filter((value) => value !== placementKey)
        : [...currentPlacementKeys, placementKey];

      if (placementKeys.length === 0) {
        placementKeys = [placementKey];
      }

      const pageKeys = derivePageKeys(placementKeys);
      return {
        ...current,
        page_key: pageKeys[0],
        page_keys: pageKeys,
        placement_key: placementKeys[0],
        placement_keys: placementKeys,
      };
    });
  };

  const updateRules = (patch: Partial<BannerSegmentRules>) => {
    setForm((current) => ({
      ...current,
      segment_rules: {
        ...current.segment_rules,
        ...patch,
      },
    }));
  };

  const togglePurchasedProduct = (productId: string) => {
    const currentIds = form.segment_rules.purchased_product_ids || [];
    updateRules({
      purchased_product_ids: currentIds.includes(productId)
        ? currentIds.filter((id) => id !== productId)
        : [...currentIds, productId],
    });
  };

  const togglePurchasedCategory = (categoryId: string) => {
    const currentIds = form.segment_rules.purchased_category_ids || [];
    updateRules({
      purchased_category_ids: currentIds.includes(categoryId)
        ? currentIds.filter((id) => id !== categoryId)
        : [...currentIds, categoryId],
    });
  };

  const selectedPickerIds = productPickerTarget === 'purchased'
    ? form.segment_rules.purchased_product_ids || []
    : form.produto_loja_ids;

  const updatePickerSelection = (ids: string[]) => {
    if (productPickerTarget === 'purchased') {
      updateRules({ purchased_product_ids: ids });
    } else {
      update('produto_loja_ids', ids);
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);
      const uploaded = await bannersService.uploadImage(file, setUploadProgress);
      setForm((current) => ({
        ...current,
        imagem_url: uploaded.url,
        imagem_path: uploaded.path,
      }));
    } catch (error: any) {
      setError(error?.response?.data?.message || error?.message || 'Não foi possível enviar a imagem.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload: BannerPayload = {
      ...form,
      placement_key: (form.placement_keys?.length ? form.placement_keys[0] : form.placement_key) || 'home_top',
      placement_keys: form.placement_keys?.length ? form.placement_keys : [form.placement_key || 'home_top'],
      page_key: derivePageKeys(form.placement_keys?.length ? form.placement_keys : [form.placement_key || 'home_top'])[0],
      page_keys: derivePageKeys(form.placement_keys?.length ? form.placement_keys : [form.placement_key || 'home_top']),
      inicia_em: startOfBrasiliaDayInput(form.inicia_em || ''),
      expira_em: endOfBrasiliaDayInput(form.expira_em || ''),
      segment_rules: {
        ...form.segment_rules,
        inactive_days: form.segment_rules.audience === 'inactive' ? form.segment_rules.inactive_days || 30 : undefined,
      },
    };

    try {
      if (banner?.id) {
        await bannersService.updateBanner(banner.id, payload);
      } else {
        await bannersService.createBanner(payload);
      }
      onSaved();
      onClose();
    } catch (error: any) {
      setError(error?.response?.data?.message || error?.message || 'Não foi possível salvar o banner.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      {productPickerTarget && (
        <ProductPickerModal
          title={productPickerTarget === 'purchased' ? 'Selecionar produtos já comprados' : 'Selecionar produtos do banner'}
          categories={categories}
          selectedIds={selectedPickerIds}
          onChange={updatePickerSelection}
          onProductsSeen={rememberProducts}
          onClose={() => setProductPickerTarget(null)}
        />
      )}
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">{banner ? 'Editar Banner' : 'Novo Banner'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <label className="block">
              <span className="block text-sm text-gray-600 mb-1.5">Imagem do banner *</span>
              <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                {form.imagem_url ? (
                  <img src={form.imagem_url} alt={form.titulo || 'Banner'} className="h-48 w-full object-cover" />
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center gap-2">
                    <Image className="w-8 h-8 text-gray-300" />
                    <span className="text-sm text-gray-500">Enviar imagem</span>
                    <span className="text-xs text-gray-400">O servidor converte para WebP</span>
                  </div>
                )}
                <div className="border-t border-gray-200 p-3">
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} className="hidden" id="banner-upload" />
                  <label htmlFor="banner-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white" style={{ backgroundColor: PRIMARY }}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    {uploading ? `Enviando ${uploadProgress}%` : 'Escolher imagem'}
                  </label>
                </div>
              </div>
            </label>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Título *</label>
              <input value={form.titulo} onChange={(event) => update('titulo', event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" required />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Subtítulo</label>
              <input value={form.subtitulo || ''} onChange={(event) => update('subtitulo', event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Texto do botão</label>
                <input value={form.cta_text || ''} onChange={(event) => update('cta_text', event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Cor de overlay</label>
                <input type="color" value={form.background_color} onChange={(event) => update('background_color', event.target.value)} className="h-[38px] w-full border border-gray-200 rounded-lg bg-white" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Tipo</label>
              <select value={form.display_type} onChange={(event) => update('display_type', event.target.value as BannerDisplayType)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
                {displayOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>

            <div>
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <label className="block text-sm text-gray-600">Posições de exibição</label>
                  <div className="text-xs text-gray-400">Telas: {selectedPageLabels}</div>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                  {selectedPlacements.size} selecionada{selectedPlacements.size === 1 ? '' : 's'}
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2">
                {pageOptions
                  .filter((page) => placementOptions.some((option) => option.pages[0] === page.value))
                  .map((page) => (
                    <div key={page.value} className="mb-2 last:mb-0 rounded-lg bg-white p-2 shadow-sm">
                      <div className="mb-1.5 text-[11px] font-semibold uppercase text-gray-400">{page.label}</div>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {placementOptions
                          .filter((option) => option.pages[0] === page.value)
                          .map((option) => {
                            const checked = selectedPlacements.has(option.value);
                            return (
                              <label key={option.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${checked ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-gray-100 text-gray-700 hover:bg-gray-50'}`}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePlacement(option.value)}
                                />
                                <span>{option.label}</span>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Prioridade</label>
                <input type="number" min={0} value={form.prioridade} onChange={(event) => update('prioridade', Number(event.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Início</label>
                <input type="date" value={form.inicia_em || ''} onChange={(event) => update('inicia_em', event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Fim</label>
                <input type="date" value={form.expira_em || ''} onChange={(event) => update('expira_em', event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.ativo} onChange={(event) => update('ativo', event.target.checked)} />
              Banner ativo
            </label>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Produtos ao clicar</label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">
                      {form.produto_loja_ids.length} produto{form.produto_loja_ids.length === 1 ? '' : 's'} selecionado{form.produto_loja_ids.length === 1 ? '' : 's'}
                    </div>
                    <div className="text-xs text-gray-500">O cliente verá estes produtos ao tocar no banner.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProductPickerTarget('banner')}
                    className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    Selecionar produtos
                  </button>
                </div>
                {form.produto_loja_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.produto_loja_ids.slice(0, 6).map((id) => (
                      <span key={id} className="max-w-[180px] truncate rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm">
                        {productById[id]?.nome || id}
                      </span>
                    ))}
                    {form.produto_loja_ids.length > 6 && (
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-500 shadow-sm">
                        +{form.produto_loja_ids.length - 6}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-3 space-y-3">
              <div className="font-semibold text-sm text-gray-800">Segmentação</div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Público</label>
                <select value={form.segment_rules.audience} onChange={(event) => updateRules({ audience: event.target.value as BannerSegmentRules['audience'] })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
                  {audienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              {form.segment_rules.audience === 'inactive' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Dias sem pedido</label>
                  <input type="number" min={1} value={form.segment_rules.inactive_days || 30} onChange={(event) => updateRules({ inactive_days: Number(event.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cidades</label>
                  <input value={listToText(form.segment_rules.cities)} onChange={(event) => updateRules({ cities: textToList(event.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" placeholder="Recife, Olinda" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Bairros</label>
                  <input value={listToText(form.segment_rules.neighborhoods)} onChange={(event) => updateRules({ neighborhoods: textToList(event.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" placeholder="Boa Viagem" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Gasto mínimo acumulado</label>
                <input type="number" min={0} value={form.segment_rules.min_total_spent || ''} onChange={(event) => updateRules({ min_total_spent: event.target.value ? Number(event.target.value) : undefined })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" placeholder="0,00" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Já comprou produtos</label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500">
                        {(form.segment_rules.purchased_product_ids || []).length} selecionado{(form.segment_rules.purchased_product_ids || []).length === 1 ? '' : 's'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setProductPickerTarget('purchased')}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-white"
                        style={{ backgroundColor: PRIMARY }}
                      >
                        Selecionar
                      </button>
                    </div>
                    {(form.segment_rules.purchased_product_ids || []).length > 0 && (
                      <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
                        {(form.segment_rules.purchased_product_ids || []).slice(0, 12).map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => togglePurchasedProduct(id)}
                            className="max-w-[140px] truncate rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 shadow-sm hover:text-red-600"
                          >
                            {productById[id]?.nome || id}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Já comprou categorias</label>
                  <div className="max-h-28 overflow-y-auto rounded-lg border border-gray-200 p-2">
                    {categoriesLoading ? (
                      <div className="flex items-center gap-2 px-2 py-2 text-xs text-gray-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Carregando categorias...
                      </div>
                    ) : categories.map((category) => (
                      <label key={category.id} className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700">
                        <input type="checkbox" checked={(form.segment_rules.purchased_category_ids || []).includes(category.id)} onChange={() => togglePurchasedCategory(category.id)} />
                        <span className="truncate">{category.nome}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button disabled={saving || uploading || !form.imagem_url} className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-70 inline-flex items-center justify-center gap-2" style={{ backgroundColor: PRIMARY }}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {banner ? 'Salvar' : 'Criar Banner'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function BannersScreen() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editing, setEditing] = useState<Banner | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const bannerList = await bannersService.getBanners();
      setBanners(bannerList);
    } catch (error: any) {
      setError(error?.response?.data?.message || error?.message || 'Não foi possível carregar os banners.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    if (categories.length > 0 || categoriesLoading) return;

    try {
      setCategoriesLoading(true);
      const categoryList = await productsService.getActiveCategories();
      setCategories(categoryList);
    } catch (error: any) {
      setError(error?.response?.data?.message || error?.message || 'Não foi possível carregar as categorias.');
    } finally {
      setCategoriesLoading(false);
    }
  }, [categories.length, categoriesLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const remove = async (id: string) => {
    if (!window.confirm('Excluir este banner?')) return;
    await bannersService.deleteBanner(id);
    await fetchData();
  };

  const toggle = async (banner: Banner) => {
    await bannersService.toggleBanner(banner.id, !banner.ativo);
    await fetchData();
  };

  const move = async (banner: Banner, direction: -1 | 1) => {
    const ordered = [...banners].sort((a, b) => a.prioridade - b.prioridade || a.titulo.localeCompare(b.titulo));
    const index = ordered.findIndex((item) => item.id === banner.id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;
    [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
    await bannersService.reorder(ordered.map((item, idx) => ({ id: item.id, prioridade: idx })));
    await fetchData();
  };

  return (
    <div className="p-5 overflow-y-auto flex-1 h-full">
      {editing !== undefined && (
        <BannerForm
          banner={editing}
          categories={categories}
          categoriesLoading={categoriesLoading}
          onLoadCategories={loadCategories}
          onClose={() => setEditing(undefined)}
          onSaved={fetchData}
        />
      )}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-gray-900 font-semibold">Banners e Conteúdo da Home</h2>
          <p className="text-gray-500 text-sm mt-0.5">{banners.filter((banner) => banner.ativo).length} banners ativos</p>
        </div>
        <button
          onClick={() => setEditing(null)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90"
          style={{ backgroundColor: PRIMARY }}
        >
          <Plus className="w-4 h-4" /> Novo Banner
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="mb-6 bg-gray-100 rounded-xl p-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Prévia dos ativos</div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {banners.filter((banner) => banner.ativo).map((banner) => (
            <div key={banner.id} className="w-72 h-32 rounded-xl flex-shrink-0 overflow-hidden relative text-white">
              <img src={banner.imagem_url} alt={banner.titulo} className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${banner.background_color}dd 0%, ${banner.background_color}44 100%)` }} />
              <div className="absolute inset-0 p-3 flex flex-col justify-end">
                <div className="text-sm font-semibold truncate">{banner.titulo}</div>
                <div className="text-xs opacity-85 truncate">{banner.subtitulo}</div>
              </div>
            </div>
          ))}
          {!banners.some((banner) => banner.ativo) && <div className="text-sm text-gray-500">Nenhum banner ativo.</div>}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando banners...
          </div>
        ) : banners.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Nenhum banner cadastrado.
          </div>
        ) : (
          banners.map((banner) => (
            <div key={banner.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className="text-gray-300 flex-shrink-0">
                <GripVertical className="w-4 h-4" />
              </div>
              <img src={banner.imagem_url} alt={banner.titulo} className="w-24 h-14 rounded-lg flex-shrink-0 object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800 text-sm">{banner.titulo}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${banner.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {banner.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                    {banner.display_type} · {formatBannerPlacements(banner)}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5 truncate">{banner.subtitulo || 'Sem subtítulo'}</div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />{toDateInput(banner.inicia_em) || 'Agora'} → {toDateInput(banner.expira_em) || 'Sem fim'}
                  </span>
                  <span className="text-[11px] text-blue-500">{banner.produto_loja_ids.length} produtos</span>
                  <span className="text-[11px] text-gray-400">Prioridade {banner.prioridade}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => move(banner, -1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Subir">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => move(banner, 1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Descer">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditing(banner)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Editar">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => toggle(banner)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title={banner.ativo ? 'Desativar' : 'Ativar'}>
                  <Power className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(banner.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Excluir">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
