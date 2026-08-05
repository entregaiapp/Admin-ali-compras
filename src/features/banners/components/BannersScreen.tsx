import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, GripVertical, X, Image, Calendar, Power, Loader2, UploadCloud, ArrowUp, ArrowDown, Search, PackageCheck } from 'lucide-react';
import { bannersService } from '../services/bannersService';
import type { Banner, BannerDisplayType, BannerPageKey, BannerPayload, BannerPlacementKey, BannerSegmentRules } from '../types/banner';
import { productsService } from '@/features/products';
import { dateInputInBrasilia, endOfBrasiliaDayInput, startOfBrasiliaDayInput } from '@/shared/lib/dateTime';
import api from '@/shared/lib/api';
import { ADMIN_STORE_THEME_UPDATED_EVENT } from '@/shared/constants/uiEvents';

const PRIMARY = '#122a4c';
const getApiData = (payload: any) => payload?.data?.data ?? payload?.data ?? payload;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((character) => character + character).join('')
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(value)) return `rgba(18, 42, 76, ${alpha})`;

  const number = Number.parseInt(value, 16);
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
};

type BannerStatusFilter = 'all' | 'active' | 'inactive';

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

function uniqueSortedLabels(values: Array<string | null | undefined>) {
  const labels = new Map<string, string>();
  values.forEach((value) => {
    const label = String(value || '').trim();
    if (!label) return;
    const key = label.toLocaleLowerCase('pt-BR');
    if (!labels.has(key)) labels.set(key, label);
  });
  return Array.from(labels.values()).sort((first, second) => first.localeCompare(second, 'pt-BR', { sensitivity: 'base' }));
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
  primaryColor,
}: {
  title?: string;
  categories: any[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onProductsSeen: (products: any[]) => void;
  onClose: () => void;
  primaryColor: string;
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
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
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
              <button type="button" onClick={onClose} className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white" style={{ backgroundColor: primaryColor }}>
                Concluir seleção
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function BannerClientPreview({ form, primaryColor }: { form: BannerPayload; primaryColor: string }) {
  const displayLabel = displayOptions.find((option) => option.value === form.display_type)?.label || form.display_type;
  const placementKeys = form.placement_keys?.length ? form.placement_keys : [form.placement_key];
  const placementLabel = placementKeys
    .map((placement) => placementLabelByValue.get(placement) || placement)
    .join(', ');
  const isModal = form.display_type === 'modal';
  const isWide = form.display_type === 'full_width' || form.display_type === 'fixed';
  const overlayColor = form.background_color || primaryColor;

  const bannerImage = (
    form.imagem_url
      ? <img src={form.imagem_url} alt={form.titulo || 'Prévia do banner'} className="h-full w-full object-cover" />
      : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gray-200 text-gray-400">
          <Image className="h-7 w-7" />
          <span className="text-[10px] font-medium">Imagem do banner</span>
        </div>
      )
  );

  return (
    <section className="mb-5 overflow-hidden rounded-xl border border-gray-200 bg-gray-50/70">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Prévia no app do cliente</h3>
          <p className="mt-0.5 text-xs text-gray-500">Atualizada automaticamente conforme os campos são alterados.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: hexToRgba(primaryColor, 0.08), color: primaryColor }}>{displayLabel}</span>
          <span className="max-w-64 truncate rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600" title={placementLabel}>{placementLabel}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="relative mx-auto h-[350px] w-full max-w-[390px] overflow-hidden rounded-[28px] border-[5px] border-gray-800 bg-white shadow-sm">
          <div className="absolute left-1/2 top-2 z-30 h-4 w-20 -translate-x-1/2 rounded-full bg-gray-800" />
          <div className="flex h-11 items-end justify-between border-b border-gray-100 px-4 pb-2">
            <div className="h-2.5 w-24 rounded-full bg-gray-200" />
            <div className="h-5 w-5 rounded-full bg-gray-100" />
          </div>

          <div className="relative h-[299px] overflow-hidden bg-gray-50">
            <div className="space-y-3 p-4">
              <div className="h-3 w-32 rounded-full bg-gray-200" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((item) => <div key={item} className="h-10 w-10 rounded-full bg-gray-200" />)}
              </div>
              <div className="h-3 w-24 rounded-full bg-gray-200" />
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((item) => <div key={item} className="h-16 rounded-lg bg-white shadow-sm" />)}
              </div>
            </div>

            {!isModal && (
              <div className={`absolute left-4 right-4 ${form.display_type === 'fixed' ? 'top-3 z-20' : 'top-6'}`}>
                <div
                  className="relative flex-shrink-0 overflow-hidden text-left shadow-sm"
                  style={{
                    width: isWide ? '100%' : '280px',
                    maxWidth: '100%',
                    height: isWide ? '118px' : '140px',
                    borderRadius: '16px',
                  }}
                >
                  {bannerImage}
                  <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${hexToRgba(overlayColor, 0.93)} 0%, ${hexToRgba(overlayColor, 0.33)} 100%)` }} />
                  <div className="absolute inset-0 flex flex-col justify-end p-4">
                    <h4 className="line-clamp-2 text-white" style={{ fontSize: '21px', fontWeight: 800, lineHeight: 1.1 }}>{form.titulo || 'Título do banner'}</h4>
                    {form.subtitulo && <p className="mt-1 truncate text-xs text-white/85">{form.subtitulo}</p>}
                    <span className="mt-2 self-start rounded-full bg-white px-3 py-1 text-[11px] font-bold" style={{ color: primaryColor }}>
                      {form.cta_text || 'Ver ofertas'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {isModal && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
                <div className="relative w-full max-w-[290px] overflow-hidden rounded-2xl bg-white shadow-xl">
                  <span className="absolute right-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/35 text-sm text-white">×</span>
                  <div className="relative h-[175px]">
                    {bannerImage}
                    <div className="absolute inset-0" style={{ background: `linear-gradient(0deg, ${hexToRgba(overlayColor, 0.93)} 0%, transparent 80%)` }} />
                    <div className="absolute bottom-0 p-4 text-white">
                      <h4 className="line-clamp-2 text-xl font-extrabold">{form.titulo || 'Título do banner'}</h4>
                      {form.subtitulo && <p className="mt-1 line-clamp-2 text-xs text-white/85">{form.subtitulo}</p>}
                    </div>
                  </div>
                  <div className="p-3">
                    <span className="block rounded-xl py-2.5 text-center text-xs font-bold text-white" style={{ backgroundColor: primaryColor }}>
                      {form.cta_text || 'Ver ofertas'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-gray-400">Visualização em escala reduzida do aplicativo do cliente.</p>
      </div>
    </section>
  );
}

function BannerForm({
  banner,
  categories,
  categoriesLoading,
  onLoadCategories,
  onClose,
  onSaved,
  primaryColor,
  deliveryAreas,
  deliveryAreasLoading,
}: {
  banner?: Banner | null;
  categories: any[];
  categoriesLoading: boolean;
  onLoadCategories: () => Promise<void>;
  onClose: () => void;
  onSaved: () => void;
  primaryColor: string;
  deliveryAreas: any[];
  deliveryAreasLoading: boolean;
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

  const selectedCities = form.segment_rules.cities || [];
  const selectedNeighborhoods = form.segment_rules.neighborhoods || [];
  const cityOptions = useMemo(
    () => uniqueSortedLabels([
      ...deliveryAreas.map((area) => area.cidade),
      ...selectedCities,
    ]),
    [deliveryAreas, form.segment_rules.cities],
  );
  const neighborhoodOptions = useMemo(() => {
    const selectedCityKeys = new Set(selectedCities.map((city) => city.toLocaleLowerCase('pt-BR')));
    const supportedNeighborhoods = deliveryAreas
      .filter((area) => selectedCityKeys.size === 0 || selectedCityKeys.has(String(area.cidade || '').trim().toLocaleLowerCase('pt-BR')))
      .map((area) => area.bairro || area.nome);
    return uniqueSortedLabels([...supportedNeighborhoods, ...selectedNeighborhoods]);
  }, [deliveryAreas, form.segment_rules.cities, form.segment_rules.neighborhoods]);

  const isLocationSelected = (values: string[], value: string) => values.some(
    (item) => item.localeCompare(value, 'pt-BR', { sensitivity: 'base' }) === 0,
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

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (productPickerTarget) setProductPickerTarget(null);
      else if (!saving && !uploading) onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, productPickerTarget, saving, uploading]);

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

  const toggleLocationRule = (key: 'cities' | 'neighborhoods', value: string) => {
    const currentValues = form.segment_rules[key] || [];
    const nextValues = isLocationSelected(currentValues, value)
      ? currentValues.filter((item) => item.localeCompare(value, 'pt-BR', { sensitivity: 'base' }) !== 0)
      : [...currentValues, value];

    if (key === 'cities') updateRules({ cities: nextValues });
    else updateRules({ neighborhoods: nextValues });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      {productPickerTarget && (
        <ProductPickerModal
          title={productPickerTarget === 'purchased' ? 'Selecionar produtos já comprados' : 'Selecionar produtos do banner'}
          categories={categories}
          selectedIds={selectedPickerIds}
          onChange={updatePickerSelection}
          onProductsSeen={rememberProducts}
          onClose={() => setProductPickerTarget(null)}
          primaryColor={primaryColor}
        />
      )}
      <form onSubmit={submit} className="flex max-h-[calc(100vh-2rem)] w-full max-w-[1480px] flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="z-20 flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{banner ? 'Editar banner' : 'Novo banner'}</h2>
            <p className="mt-0.5 text-xs text-gray-500">Configure conteúdo, exibição e público.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100" title="Fechar (Esc)" aria-label="Fechar modal"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="min-h-0 overflow-y-auto p-5">
          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="xl:hidden">
            <BannerClientPreview form={form} primaryColor={primaryColor} />
          </div>

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
                  <label htmlFor="banner-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white" style={{ backgroundColor: primaryColor }}>
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
                    style={{ backgroundColor: primaryColor }}
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
                    <div>
                      <div className="text-xs font-semibold text-gray-700">Cidades atendidas</div>
                      <div className="text-[10px] text-gray-400">Nenhuma seleção inclui todas.</div>
                    </div>
                    {selectedCities.length > 0 && (
                      <button type="button" onClick={() => updateRules({ cities: [] })} className="text-[10px] font-semibold" style={{ color: primaryColor }}>Limpar</button>
                    )}
                  </div>
                  <div className="max-h-36 overflow-y-auto p-2">
                    {deliveryAreasLoading ? (
                      <div className="flex items-center gap-2 px-2 py-3 text-xs text-gray-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando cidades...</div>
                    ) : cityOptions.length > 0 ? cityOptions.map((city) => (
                      <label key={city} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                        <input type="checkbox" checked={isLocationSelected(selectedCities, city)} onChange={() => toggleLocationRule('cities', city)} />
                        <span className="truncate">{city}</span>
                      </label>
                    )) : (
                      <div className="px-2 py-3 text-xs text-gray-400">Nenhuma cidade cadastrada nas áreas de entrega.</div>
                    )}
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
                    <div>
                      <div className="text-xs font-semibold text-gray-700">Bairros atendidos</div>
                      <div className="text-[10px] text-gray-400">Filtrados pelas cidades escolhidas.</div>
                    </div>
                    {selectedNeighborhoods.length > 0 && (
                      <button type="button" onClick={() => updateRules({ neighborhoods: [] })} className="text-[10px] font-semibold" style={{ color: primaryColor }}>Limpar</button>
                    )}
                  </div>
                  <div className="max-h-36 overflow-y-auto p-2">
                    {deliveryAreasLoading ? (
                      <div className="flex items-center gap-2 px-2 py-3 text-xs text-gray-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando bairros...</div>
                    ) : neighborhoodOptions.length > 0 ? neighborhoodOptions.map((neighborhood) => (
                      <label key={neighborhood} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                        <input type="checkbox" checked={isLocationSelected(selectedNeighborhoods, neighborhood)} onChange={() => toggleLocationRule('neighborhoods', neighborhood)} />
                        <span className="truncate">{neighborhood}</span>
                      </label>
                    )) : (
                      <div className="px-2 py-3 text-xs text-gray-400">Nenhum bairro cadastrado para as cidades selecionadas.</div>
                    )}
                  </div>
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
                        style={{ backgroundColor: primaryColor }}
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

        <div className="mt-5 flex gap-2 border-t border-gray-100 pt-4">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button disabled={saving || uploading || !form.imagem_url} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-70" style={{ backgroundColor: primaryColor }}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {banner ? 'Salvar' : 'Criar Banner'}
          </button>
        </div>
        </div>
          <aside className="hidden min-h-0 overflow-y-auto border-l border-gray-200 bg-gray-50/70 p-5 xl:block">
            <BannerClientPreview form={form} primaryColor={primaryColor} />
          </aside>
        </div>
      </form>
    </div>
  );
}

export function BannersScreen() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [deliveryAreas, setDeliveryAreas] = useState<any[]>([]);
  const [deliveryAreasLoading, setDeliveryAreasLoading] = useState(false);
  const [editing, setEditing] = useState<Banner | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState(PRIMARY);
  const [statusFilter, setStatusFilter] = useState<BannerStatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [bannerToRemove, setBannerToRemove] = useState<Banner | null>(null);
  const [removing, setRemoving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [draggedBannerId, setDraggedBannerId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null);

  const user = (() => {
    try {
      const userJson = localStorage.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  })();

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

    if (user?.loja_id) {
      api.get(`/lojas/${user.loja_id}/configuracoes`)
        .then((response) => {
          const rawConfig = getApiData(response);
          const config = Array.isArray(rawConfig) ? rawConfig[0] || {} : rawConfig || {};
          setPrimaryColor(config.cor_primaria || PRIMARY);
        })
        .catch((error) => console.error('Erro ao carregar a configuração visual da loja:', error));

      setDeliveryAreasLoading(true);
      api.get('/areas_entrega', { params: { loja_id: user.loja_id, per_page: 100 } })
        .then((response) => {
          const rawAreas = getApiData(response);
          const areas = Array.isArray(rawAreas) ? rawAreas : Array.isArray(rawAreas?.data) ? rawAreas.data : [];
          setDeliveryAreas(areas.filter((area) => (
            area?.ativa !== false
            && area?.ativa !== 0
            && String(area?.status || '').toLocaleLowerCase('pt-BR') !== 'inativo'
          )));
        })
        .catch((error) => {
          console.error('Erro ao carregar as áreas de entrega dos banners:', error);
          setDeliveryAreas([]);
        })
        .finally(() => setDeliveryAreasLoading(false));
    }
  }, [fetchData]);

  useEffect(() => {
    const handleStoreThemeUpdated = (event: Event) => {
      const nextPrimaryColor = (event as CustomEvent<{ primaryColor?: string }>).detail?.primaryColor;
      if (nextPrimaryColor) setPrimaryColor(nextPrimaryColor);
    };

    window.addEventListener(ADMIN_STORE_THEME_UPDATED_EVENT, handleStoreThemeUpdated);
    return () => window.removeEventListener(ADMIN_STORE_THEME_UPDATED_EVENT, handleStoreThemeUpdated);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && bannerToRemove && !removing) setBannerToRemove(null);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [bannerToRemove, removing]);

  const remove = async () => {
    if (!bannerToRemove) return;
    try {
      setRemoving(true);
      await bannersService.deleteBanner(bannerToRemove.id);
      await fetchData();
      setBannerToRemove(null);
    } catch (error: any) {
      setError(error?.response?.data?.message || error?.message || 'Não foi possível excluir o banner.');
    } finally {
      setRemoving(false);
    }
  };

  const toggle = async (banner: Banner) => {
    await bannersService.toggleBanner(banner.id, !banner.ativo);
    await fetchData();
  };

  const persistOrder = async (ordered: Banner[]) => {
    const previousBanners = banners;
    const nextBanners = ordered.map((banner, index) => ({ ...banner, prioridade: index }));

    try {
      setReordering(true);
      setError(null);
      setBanners(nextBanners);
      const savedBanners = await bannersService.reorder(
        nextBanners.map((banner) => ({ id: banner.id, prioridade: banner.prioridade })),
      );
      if (savedBanners.length > 0) setBanners(savedBanners);
    } catch (error: any) {
      setBanners(previousBanners);
      setError(error?.response?.data?.message || error?.message || 'Não foi possível atualizar a ordem dos banners.');
    } finally {
      setReordering(false);
      setDraggedBannerId(null);
      setDropTarget(null);
    }
  };

  const move = async (banner: Banner, direction: -1 | 1) => {
    const ordered = [...banners].sort((a, b) => a.prioridade - b.prioridade || a.titulo.localeCompare(b.titulo));
    const index = ordered.findIndex((item) => item.id === banner.id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;
    [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
    await persistOrder(ordered);
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, bannerId: string) => {
    if (reordering) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', bannerId);
    setDraggedBannerId(bannerId);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    if (!draggedBannerId || draggedBannerId === targetId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
    setDropTarget((current) => current?.id === targetId && current.position === position
      ? current
      : { id: targetId, position });
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = draggedBannerId || event.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId || !dropTarget) {
      setDraggedBannerId(null);
      setDropTarget(null);
      return;
    }

    const ordered = [...banners].sort((a, b) => a.prioridade - b.prioridade || a.titulo.localeCompare(b.titulo));
    const sourceIndex = ordered.findIndex((banner) => banner.id === sourceId);
    if (sourceIndex < 0) return;
    const [draggedBanner] = ordered.splice(sourceIndex, 1);
    const targetIndex = ordered.findIndex((banner) => banner.id === targetId);
    if (targetIndex < 0) return;
    const insertionIndex = targetIndex + (dropTarget.position === 'after' ? 1 : 0);
    ordered.splice(insertionIndex, 0, draggedBanner);
    await persistOrder(ordered);
  };

  const bannerCounts = useMemo(() => ({
    all: banners.length,
    active: banners.filter((banner) => banner.ativo).length,
    inactive: banners.filter((banner) => !banner.ativo).length,
  }), [banners]);

  const orderedBanners = useMemo(
    () => [...banners].sort((a, b) => a.prioridade - b.prioridade || a.titulo.localeCompare(b.titulo)),
    [banners],
  );

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');
  const filteredBanners = useMemo(() => orderedBanners.filter((banner) => {
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'active' && banner.ativo)
      || (statusFilter === 'inactive' && !banner.ativo);
    const searchableText = [banner.titulo, banner.subtitulo, formatBannerPlacements(banner)]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('pt-BR');
    return matchesStatus && (!normalizedSearch || searchableText.includes(normalizedSearch));
  }), [normalizedSearch, orderedBanners, statusFilter]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-50/70">
      {editing !== undefined && (
        <BannerForm
          banner={editing}
          categories={categories}
          categoriesLoading={categoriesLoading}
          onLoadCategories={loadCategories}
          onClose={() => setEditing(undefined)}
          onSaved={fetchData}
          primaryColor={primaryColor}
          deliveryAreas={deliveryAreas}
          deliveryAreasLoading={deliveryAreasLoading}
        />
      )}

      <div className="flex min-h-[56px] items-end justify-between gap-3 border-b border-gray-200 bg-white px-4">
        <div className="flex h-full min-w-0 items-end overflow-x-auto" role="tablist" aria-label="Status dos banners">
          {([
            ['all', 'Todos'],
            ['active', 'Ativos'],
            ['inactive', 'Inativos'],
          ] as [BannerStatusFilter, string][]).map(([status, label]) => {
            const selected = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setStatusFilter(status)}
                className="relative flex h-full min-h-[56px] shrink-0 items-center gap-2 px-4 text-sm font-semibold transition-colors"
                style={{ color: selected ? primaryColor : '#64748b' }}
              >
                {label}
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{
                    backgroundColor: selected ? hexToRgba(primaryColor, 0.1) : '#f1f5f9',
                    color: selected ? primaryColor : '#64748b',
                  }}
                >
                  {bannerCounts[status]}
                </span>
                {selected && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t-full" style={{ backgroundColor: primaryColor }} />}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setEditing(null)}
          className="mb-2.5 flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo banner</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por título, subtítulo ou posição"
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:bg-white"
            />
          </div>
          <div className="hidden px-2 text-right sm:block">
            <div className="text-xs font-medium text-gray-500">{reordering ? 'Atualizando ordem' : 'Banners ativos'}</div>
            <div className="text-sm font-bold text-gray-800">{reordering ? 'Aguarde...' : bannerCounts.active}</div>
          </div>
        </div>

        {bannerCounts.active > 0 && (
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
              <Image className="h-4 w-4" style={{ color: primaryColor }} />
              <h3 className="text-sm font-semibold text-gray-800">Prévia dos banners ativos</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto p-3">
              {orderedBanners.filter((banner) => banner.ativo).map((banner) => (
                <div key={banner.id} className="relative h-28 w-64 flex-shrink-0 overflow-hidden rounded-lg text-white">
                  <img src={banner.imagem_url} alt={banner.titulo} className="h-full w-full object-cover" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${banner.background_color}dd 0%, ${banner.background_color}33 100%)` }} />
                  <div className="absolute inset-0 flex flex-col justify-end p-3">
                    <div className="truncate text-sm font-semibold">{banner.titulo}</div>
                    <div className="truncate text-xs opacity-85">{banner.subtitulo}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: primaryColor }} /> Carregando banners...
          </div>
        ) : filteredBanners.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="hidden grid-cols-[28px_88px_minmax(0,1fr)_150px_128px] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500 md:grid">
              <span title="Arraste para ordenar"><GripVertical className="h-4 w-4" /></span><span>Imagem</span><span>Banner</span><span>Exibição</span><span className="text-right">Ações</span>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredBanners.map((banner) => (
                <div
                  key={banner.id}
                  onDragOver={(event) => handleDragOver(event, banner.id)}
                  onDrop={(event) => handleDrop(event, banner.id)}
                  className={`grid gap-3 px-4 py-3 transition-all md:grid-cols-[28px_88px_minmax(0,1fr)_150px_128px] md:items-center ${draggedBannerId === banner.id ? 'bg-gray-50 opacity-50' : 'hover:bg-gray-50/70'}`}
                  style={dropTarget?.id === banner.id ? {
                    boxShadow: dropTarget.position === 'before'
                      ? `inset 0 2px 0 ${primaryColor}`
                      : `inset 0 -2px 0 ${primaryColor}`,
                  } : undefined}
                >
                  <button
                    type="button"
                    draggable={!reordering}
                    aria-label={`Arrastar ${banner.titulo} para alterar a ordem`}
                    aria-grabbed={draggedBannerId === banner.id}
                    onDragStart={(event) => handleDragStart(event, banner.id)}
                    onDragEnd={() => {
                      setDraggedBannerId(null);
                      setDropTarget(null);
                    }}
                    className="hidden cursor-grab touch-none rounded-md p-1 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing disabled:cursor-not-allowed md:block"
                    title="Arraste para alterar a ordem"
                    disabled={reordering}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <img src={banner.imagem_url} alt={banner.titulo} className="h-14 w-full rounded-lg object-cover md:w-[88px]" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-gray-900">{banner.titulo}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${banner.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {banner.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-gray-500">{banner.subtitulo || 'Sem subtítulo'}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{toDateInput(banner.inicia_em) || 'Agora'} → {toDateInput(banner.expira_em) || 'Sem fim'}</span>
                      <span>{banner.produto_loja_ids.length} produtos</span>
                      <span>Prioridade {banner.prioridade}</span>
                    </div>
                  </div>
                  <div className="min-w-0 text-xs text-gray-600">
                    <div className="font-semibold text-gray-700">{displayOptions.find((option) => option.value === banner.display_type)?.label || banner.display_type}</div>
                    <div className="mt-0.5 line-clamp-2 text-gray-500">{formatBannerPlacements(banner)}</div>
                  </div>
                  <div className="flex items-center justify-end gap-0.5">
                    <button type="button" disabled={reordering} onClick={() => move(banner, -1)} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-40" title="Mover para cima" aria-label="Mover para cima"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" disabled={reordering} onClick={() => move(banner, 1)} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-40" title="Mover para baixo" aria-label="Mover para baixo"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setEditing(banner)} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100" title="Editar banner" aria-label="Editar banner"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => toggle(banner)} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100" title={banner.ativo ? 'Desativar banner' : 'Ativar banner'} aria-label={banner.ativo ? 'Desativar banner' : 'Ativar banner'}><Power className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setBannerToRemove(banner)} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600" title="Excluir banner" aria-label="Excluir banner"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-300"><Image className="h-7 w-7" /></div>
            <h3 className="text-base font-semibold text-gray-800">Nenhum banner encontrado</h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500">Altere a busca ou o filtro para visualizar outros banners.</p>
            {banners.length === 0 && (
              <button type="button" onClick={() => setEditing(null)} className="mt-4 rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: primaryColor }}>Criar primeiro banner</button>
            )}
          </div>
        )}
      </div>

      {bannerToRemove && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="p-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"><Trash2 className="h-5 w-5" /></div>
              <h3 className="text-base font-semibold text-gray-900">Excluir banner?</h3>
              <p className="mt-1.5 text-sm text-gray-500">O banner <strong className="font-semibold text-gray-700">{bannerToRemove.titulo}</strong> será removido permanentemente.</p>
            </div>
            <div className="flex gap-2 border-t border-gray-200 bg-gray-50 p-4">
              <button type="button" onClick={() => setBannerToRemove(null)} disabled={removing} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
              <button type="button" onClick={remove} disabled={removing} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{removing ? 'Excluindo...' : 'Excluir'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
