import { useState, useEffect } from 'react';
import { 
  Tag, Search, Edit2, X, Package, Trash2, 
  DollarSign, Percent, Plus, CalendarDays, Power
} from 'lucide-react';
import api from '@/shared/lib/api';
import { showSystemNotice } from '@/shared/components/SystemToast';
import { dateTimeInputInBrasilia, formatBrasiliaDate } from '@/shared/lib/dateTime';
import { ADMIN_STORE_THEME_UPDATED_EVENT } from '@/shared/constants/uiEvents';

const PRIMARY = '#122a4c';
const PROMOTIONS_PER_PAGE = 24;
const PRODUCT_SEARCH_LIMIT = 20;

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

const isConfigurableProduct = (product: { modo_compra?: string | null }) => product.modo_compra === 'configuravel';

type PromotionTarget = {
  id: string;
  name: string;
  price: string;
  promoPrice: string;
  promotionUntil: string;
  active: boolean;
  configurable: boolean;
  storeProductId?: string;
  optionProductId?: string;
};

type PromotionStatusFilter = 'all' | 'active' | 'inactive';

const hasPromotionalPrice = (product: any) => (
  product?.preco_promocional !== null
  && product?.preco_promocional !== undefined
  && Number(product.preco_promocional) > 0
);

const isPromotionActive = (product: any) => {
  if (!hasPromotionalPrice(product)) return false;
  const regularPrice = Number(product?.preco);
  const promotionalPrice = Number(product?.preco_promocional);
  if (!Number.isFinite(regularPrice) || promotionalPrice >= regularPrice) return false;
  if (!product?.promocao_ate) return true;
  const endTime = new Date(product.promocao_ate).getTime();
  return Number.isFinite(endTime) && endTime >= Date.now();
};

const promotionDateTimeValue = (value?: string | null) => dateTimeInputInBrasilia(value);

const promotionEndLabel = (value?: string | null) => {
  if (!value) return 'Sem data de término';
  return formatBrasiliaDate(value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function PromotionsScreen() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [addPromoSearchInput, setAddPromoSearchInput] = useState('');
  const [addPromoSearch, setAddPromoSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPrice, setEditingPrice] = useState<PromotionTarget | null>(null);
  const [showAddPromo, setShowAddPromo] = useState(false);
  const [allStoreProducts, setAllStoreProducts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchingAvailableProducts, setSearchingAvailableProducts] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PromotionStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPromotions, setTotalPromotions] = useState(0);
  const [primaryColor, setPrimaryColor] = useState(PRIMARY);
  const [promotionToRemove, setPromotionToRemove] = useState<any | null>(null);

  const user = (() => {
    try {
      const userJson = localStorage.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  })();

  const fetchProducts = async (
    searchTerm = search,
    requestedPage = page,
    requestedStatus = statusFilter,
  ) => {
    try {
      setLoading(true);
      const response = await api.get('/produtos_loja', {
        params: {
          busca: searchTerm.trim() || undefined,
          incluir_opcoes_produto: true,
          incluir_promocoes_inativas: true,
          incluir_configuracao_opcoes: false,
          promocao_configurada: true,
          promocao_ativa: requestedStatus === 'all' ? undefined : requestedStatus === 'active',
          page: requestedPage,
          per_page: PROMOTIONS_PER_PAGE,
        },
      });
      const data = response.data.data;
      const all = Array.isArray(data) ? data : data?.data || [];
      
      setProducts(all.filter(hasPromotionalPrice));
      setPage(Number(data?.page || requestedPage));
      setTotalPages(Math.max(1, Number(data?.total_pages || 1)));
      setTotalPromotions(Number(data?.total ?? all.length));
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProducts = async (searchTerm = addPromoSearch) => {
    const normalizedSearch = searchTerm.trim();
    if (normalizedSearch.length < 2) {
      setAllStoreProducts([]);
      setSearchingAvailableProducts(false);
      return;
    }

    try {
      setSearchingAvailableProducts(true);
      const response = await api.get('/produtos_loja', {
        params: {
          busca: normalizedSearch,
          ativo: true,
          incluir_opcoes_produto: true,
          incluir_promocoes_inativas: true,
          incluir_configuracao_opcoes: false,
          promocao_configurada: false,
          include_total: false,
          page: 1,
          per_page: PRODUCT_SEARCH_LIMIT,
        },
      });
      const data = response.data.data;
      setAllStoreProducts(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error('Error fetching available products:', error);
      showSystemNotice('Não foi possível buscar os produtos da loja.');
    } finally {
      setSearchingAvailableProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts('', 1, 'all');

    if (user?.loja_id) {
      api.get(`/lojas/${user.loja_id}/configuracoes`)
        .then((response) => {
          const rawConfig = getApiData(response);
          const config = Array.isArray(rawConfig) ? rawConfig[0] || {} : rawConfig || {};
          setPrimaryColor(config.cor_primaria || PRIMARY);
        })
        .catch((error) => console.error('Error fetching store configuration:', error));
    }
  }, []);

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
      if (event.key !== 'Escape') return;
      if (promotionToRemove) setPromotionToRemove(null);
      else if (editingPrice) setEditingPrice(null);
      else if (showAddPromo) setShowAddPromo(false);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [editingPrice, promotionToRemove, showAddPromo]);

  useEffect(() => {
    if (!showAddPromo) return;

    setAddPromoSearch('');
    setAddPromoSearchInput('');
    setAllStoreProducts([]);
  }, [showAddPromo]);

  const handlePromotionSearch = () => {
    const term = searchInput.trim();
    setSearch(term);
    setPage(1);
    fetchProducts(term, 1, statusFilter);
  };

  const handleAvailableProductSearch = () => {
    const term = addPromoSearchInput.trim();
    setAddPromoSearch(term);
    fetchAvailableProducts(term);
  };

  const handleSavePromotion = async () => {
    if (!editingPrice) return;

    try {
      setSaving(true);
      const val = parseFloat(editingPrice.promoPrice.toString().replace(',', '.'));
      const regularPrice = Number(editingPrice.price);
      
      if (!Number.isFinite(val) || val <= 0) {
        showSystemNotice('Informe um preço promocional válido.');
        return;
      }
      if (val >= regularPrice) {
        showSystemNotice('O preço promocional deve ser menor que o preço atual.');
        return;
      }

      if (
        editingPrice.active
        && editingPrice.promotionUntil
        && new Date(editingPrice.promotionUntil).getTime() <= Date.now()
      ) {
        showSystemNotice('Para ativar a promoção, informe uma data futura ou deixe a validade em branco.');
        return;
      }

      const promotionUntil = editingPrice.active
        ? editingPrice.promotionUntil || null
        : new Date().toISOString();

      const target = editingPrice;
      if (target?.optionProductId && target.storeProductId) {
        await api.patch(`/produtos_loja/${target.storeProductId}/configuracao/opcoes/${target.optionProductId}/promocao`, {
          preco_promocional: val,
          promocao_ate: promotionUntil,
        });
      } else {
        await api.patch(`/produtos_loja/${target.id}`, {
          preco_promocional: val,
          promocao_ate: promotionUntil,
        });
      }
      
      await fetchProducts(search, page, statusFilter);
      if (showAddPromo) fetchAvailableProducts(addPromoSearch);
      setEditingPrice(null);
      setShowAddPromo(false);
      showSystemNotice(editingPrice.active ? 'Promoção salva e ativada.' : 'Promoção desativada.');
    } catch (error) {
      console.error('Error updating promotion:', error);
      showSystemNotice('Não foi possível salvar a promoção.');
    } finally {
      setSaving(false);
    }
  };

  const updatePromotionStatus = async (
    target: PromotionTarget | any,
    nextActive: boolean,
    options: { closeModal?: boolean } = {},
  ) => {
    const promoPrice = Number(String(target.promoPrice ?? target.preco_promocional ?? '').replace(',', '.'));
    const regularPrice = Number(target.price ?? target.preco);

    if (!Number.isFinite(promoPrice) || promoPrice <= 0 || !Number.isFinite(regularPrice) || promoPrice >= regularPrice) {
      showSystemNotice('Configure um preço promocional válido antes de ativar ou desativar.');
      return;
    }

    try {
      setSaving(true);
      const promotionUntil = nextActive ? null : new Date().toISOString();
      const storeProductId = target.storeProductId || target.produto_loja_id_origem;
      const optionProductId = target.optionProductId || target.opcao_grupo_produto_id;

      if (optionProductId && storeProductId) {
        await api.patch(`/produtos_loja/${storeProductId}/configuracao/opcoes/${optionProductId}/promocao`, {
          preco_promocional: promoPrice,
          promocao_ate: promotionUntil,
        });
      } else {
        await api.patch(`/produtos_loja/${target.id}`, {
          preco_promocional: promoPrice,
          promocao_ate: promotionUntil,
        });
      }

      await fetchProducts(search, page, statusFilter);
      if (showAddPromo) fetchAvailableProducts(addPromoSearch);
      setEditingPrice((current) => current && current.id === target.id ? {
        ...current,
        active: nextActive,
        promotionUntil: nextActive ? '' : promotionDateTimeValue(promotionUntil),
      } : current);
      if (options.closeModal) {
        setEditingPrice(null);
      }
      showSystemNotice(nextActive ? 'Promoção ativada.' : 'Promoção desativada.');
    } catch (error) {
      console.error('Error updating promotion status:', error);
      showSystemNotice('Não foi possível alterar o status da promoção.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePromotion = (product: any) => {
    setPromotionToRemove(product);
  };

  const confirmRemovePromotion = async () => {
    if (!promotionToRemove) return;

    try {
      setSaving(true);
      const product = promotionToRemove;
      if (product.opcao_grupo_produto_id && product.produto_loja_id_origem) {
        await api.patch(`/produtos_loja/${product.produto_loja_id_origem}/configuracao/opcoes/${product.opcao_grupo_produto_id}/promocao`, {
          preco_promocional: null,
          promocao_ate: null,
        });
      } else {
        await api.patch(`/produtos_loja/${product.id}`, {
          preco_promocional: null,
          promocao_ate: null,
        });
      }
      await fetchProducts(search, page, statusFilter);
      setPromotionToRemove(null);
      showSystemNotice('Promoção removida.');
    } catch (error) {
      console.error('Error removing promotion:', error);
      showSystemNotice('Não foi possível remover a promoção.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = products;

  const availableProducts = allStoreProducts;

  const handleStatusFilterChange = (nextStatus: PromotionStatusFilter) => {
    setStatusFilter(nextStatus);
    setPage(1);
    fetchProducts(search, 1, nextStatus);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
    fetchProducts(search, nextPage, statusFilter);
  };

  const calculateDiscount = (price: number, promoPrice: number) => {
    if (!price || !promoPrice) return 0;
    return Math.round(((price - promoPrice) / price) * 100);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gray-50/70">
      <div className="flex min-h-[56px] items-end justify-between gap-3 border-b border-gray-200 bg-white px-4">
        <div className="flex h-full min-w-0 items-end overflow-x-auto" role="tablist" aria-label="Status das promoções">
          {([
            ['all', 'Todas'],
            ['active', 'Ativas'],
            ['inactive', 'Inativas'],
          ] as [PromotionStatusFilter, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={statusFilter === value}
              onClick={() => handleStatusFilterChange(value)}
              className="relative flex h-full min-h-[56px] shrink-0 items-center gap-2 px-4 text-sm font-semibold transition-colors"
              style={{ color: statusFilter === value ? primaryColor : '#64748b' }}
            >
              {label}
              {statusFilter === value && (
                <>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{ backgroundColor: hexToRgba(primaryColor, 0.1), color: primaryColor }}
                  >
                    {totalPromotions}
                  </span>
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t-full" style={{ backgroundColor: primaryColor }} />
                </>
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAddPromo(true)}
          className="mb-2.5 flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova promoção</span>
          <span className="sm:hidden">Nova</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex gap-2 rounded-xl border border-gray-200 bg-white p-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handlePromotionSearch();
              }}
              placeholder="Buscar produto em promoção"
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:bg-white"
            />
          </div>
          <button
            type="button"
            onClick={handlePromotionSearch}
            className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Buscar</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: primaryColor }} />
            <span className="text-sm font-medium text-gray-500">Carregando promoções...</span>
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtered.map(product => {
              const price = parseFloat(product.preco || 0);
              const promoPrice = parseFloat(product.preco_promocional || 0);
              const discount = calculateDiscount(price, promoPrice);
              const promotionActive = isPromotionActive(product);

              return (
                <article key={product.id} className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-gray-300">
                  <div className="p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-100">
                        {product.imagem_url ? (
                          <img src={product.imagem_url} alt={product.nome} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="w-8 h-8 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                           <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${promotionActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {promotionActive ? 'Ativa' : 'Inativa'}
                           </span>
                           <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                             -{discount}%
                           </span>
                           {product.destaque && (
                             <span className="w-2 h-2 rounded-full bg-amber-400" />
                           )}
                        </div>
                        <h3 className="truncate text-sm font-semibold text-gray-900">{product.nome}</h3>
                        {isConfigurableProduct(product) && (
                          <span className="mt-1 inline-flex rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">Configurável</span>
                        )}
                        <p className="text-xs text-gray-400 truncate">{product.marca || 'Sem marca'}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-end justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                       <div>
                          <div className="text-[10px] font-semibold text-gray-400">Preço original</div>
                          <div className="text-xs text-gray-500 line-through">R$ {price.toFixed(2).replace('.', ',')}</div>
                       </div>
                       <div className="text-right">
                          <div className="text-[10px] font-semibold text-green-600">Preço promocional</div>
                          <div className="text-base font-bold text-green-700">R$ {promoPrice.toFixed(2).replace('.', ',')}</div>
                       </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{promotionEndLabel(product.promocao_ate)}</span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
                      <button
                        type="button"
                        onClick={() => updatePromotionStatus(product, !promotionActive)}
                        disabled={saving}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                          promotionActive
                            ? 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100'
                            : 'border-green-100 bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                        title={promotionActive ? 'Desativar promoção' : 'Ativar promoção'}
                      >
                        <Power className="h-3.5 w-3.5" />
                        {promotionActive ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => setEditingPrice({ 
                           id: product.id, 
                           name: product.nome, 
                           price: price.toFixed(2), 
                           promoPrice: promoPrice.toFixed(2),
                           promotionUntil: promotionDateTimeValue(product.promocao_ate),
                           active: promotionActive,
                           configurable: isConfigurableProduct(product),
                           storeProductId: product.produto_loja_id_origem,
                           optionProductId: product.opcao_grupo_produto_id,
                        })}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                        style={{ color: primaryColor }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Gerenciar promoção
                      </button>
                      <button
                        onClick={() => handleRemovePromotion(product)}
                        className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all"
                        title="Remover promoção"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex-row">
                <span className="text-xs text-gray-500">
                  Página {page} de {totalPages} · {totalPromotions} promoções
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => handlePageChange(page - 1)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages || loading}
                    onClick={() => handlePageChange(page + 1)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <Tag className="h-7 w-7 text-gray-300" />
            </div>
            <h3 className="text-gray-900 font-bold text-lg mb-1">Nenhuma promoção encontrada</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              {search 
                ? `Não encontramos nenhum produto em promoção com o nome "${search}".`
                : statusFilter === 'active'
                  ? 'Não há promoções ativas no momento.'
                  : statusFilter === 'inactive'
                    ? 'Não há promoções inativas ou encerradas.'
                    : 'Ainda não há promoções cadastradas.'}
            </p>
            {!search && statusFilter === 'all' && (
               <button
                  onClick={() => setShowAddPromo(true)}
                  className="mt-5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
               >
                  Criar primeira promoção
               </button>
            )}
          </div>
        )}
      </div>

      {/* Add Promotion Modal */}
      {showAddPromo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 animate-in fade-in duration-200">
           <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl animate-in zoom-in duration-200">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                 <div>
                    <h3 className="text-base font-semibold text-gray-900">Selecionar produto</h3>
                    <p className="mt-0.5 text-xs text-gray-500">Escolha um produto para aplicar a promoção.</p>
                 </div>
                 <button type="button" onClick={() => setShowAddPromo(false)} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100" title="Fechar (Esc)" aria-label="Fechar modal">
                    <X className="h-4 w-4" />
                 </button>
              </div>

              <div className="border-b border-gray-200 bg-gray-50/70 p-3">
                 <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      autoFocus
                      placeholder="Buscar em todos os produtos..."
                      value={addPromoSearchInput}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none transition"
                      onChange={e => setAddPromoSearchInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAvailableProductSearch();
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAvailableProductSearch}
                    disabled={searchingAvailableProducts || addPromoSearchInput.trim().length < 2}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Buscar
                  </button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                 {searchingAvailableProducts ? (
                   <div className="py-8 text-center text-sm text-gray-500">
                     Buscando produtos...
                   </div>
                 ) : availableProducts.map(p => (
                    <button
                       key={p.id}
                       onClick={() => setEditingPrice({ 
                          id: p.id, 
                          name: p.nome, 
                          price: parseFloat(p.preco || 0).toFixed(2), 
                          promoPrice: '',
                          promotionUntil: '',
                          active: true,
                          configurable: isConfigurableProduct(p),
                          storeProductId: p.produto_loja_id_origem,
                          optionProductId: p.opcao_grupo_produto_id,
                       })}
                       className="group flex w-full items-center gap-3 rounded-lg border border-transparent p-3 transition-colors hover:border-gray-200 hover:bg-gray-50"
                    >
                       <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200">
                          {p.imagem_url ? (
                            <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-gray-300" />
                          )}
                       </div>
                       <div className="flex-1 min-w-0 text-left">
                          <div className="font-bold text-gray-800 text-sm truncate">{p.nome}</div>
                          {isConfigurableProduct(p) && (
                            <span className="mt-1 inline-flex rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">Configurável</span>
                          )}
                          <div className="text-xs text-gray-400">{p.marca || 'Sem marca'}</div>
                       </div>
                       <div className="text-right">
                          <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Preço Base</div>
                          <div className="font-bold text-gray-700">R$ {parseFloat(p.preco || 0).toFixed(2).replace('.', ',')}</div>
                       </div>
                       <div className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors" style={{ backgroundColor: hexToRgba(primaryColor, 0.08), color: primaryColor }}>
                          <Plus className="w-4 h-4" />
                       </div>
                    </button>
                 ))}
                 {!searchingAvailableProducts && availableProducts.length === 0 && (
                   <div className="py-8 text-center text-sm text-gray-500">
                     {!addPromoSearch
                       ? 'Digite ao menos 2 caracteres para buscar um produto.'
                       : addPromoSearch.length < 2
                         ? 'Digite ao menos 2 caracteres para realizar a busca.'
                         : `Nenhum produto disponível encontrado para "${addPromoSearch}".`}
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Edit Modal (used for both Edit and Add Promo after selection) */}
      {editingPrice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4 animate-in fade-in duration-200">
           <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl animate-in zoom-in duration-200">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                 <h3 className="text-base font-semibold text-gray-900">Configurar promoção</h3>
                 <button type="button" onClick={() => setEditingPrice(null)} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100" title="Fechar (Esc)" aria-label="Fechar modal">
                    <X className="h-4 w-4" />
                 </button>
              </div>
              
              <div className="space-y-4 overflow-y-auto p-5">
                 <div className="p-3 bg-gray-50 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-white flex items-center justify-center border border-gray-100 flex-shrink-0">
                       <Tag className="h-5 w-5" style={{ color: primaryColor }} />
                    </div>
                    <div className="text-xs text-gray-700 font-bold line-clamp-1 flex-1">{editingPrice.name}</div>
                 </div>
                 {editingPrice.configurable && (
                   <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                     Esta promoção será aplicada ao preço base do item configurável. Preços específicos de tamanhos e adicionais continuam configuráveis no editor do item.
                   </p>
                 )}
                 
                 <div className="space-y-4">
                    <div>
                       <label className="mb-1.5 block text-xs font-semibold text-gray-600">Preço atual (R$)</label>
                       <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          {editingPrice.price.replace('.', ',')}
                       </div>
                    </div>
                    
                    <div>
                       <label className="mb-1.5 block text-xs font-semibold" style={{ color: primaryColor }}>Novo preço promocional (R$)</label>
                       <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            autoFocus
                            value={editingPrice.promoPrice}
                            onChange={e => setEditingPrice(prev => prev ? { ...prev, promoPrice: e.target.value } : null)}
                            className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-9 pr-4 text-lg font-bold outline-none transition"
                            placeholder="0,00"
                          />
                       </div>
                       {editingPrice.promoPrice && (
                         <div className="mt-2 flex items-center gap-1.5 px-2">
                            <Percent className="w-3 h-3 text-green-600" />
                            <span className="text-[10px] font-bold text-green-600">
                               Desconto de {calculateDiscount(parseFloat(editingPrice.price), parseFloat(editingPrice.promoPrice.replace(',', '.')))}%
                            </span>
                         </div>
                       )}
                    </div>

                    <div className="rounded-xl border border-gray-200 p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
                            <Power className="h-4 w-4" />
                            Promoção ativa
                          </div>
                          <p className="mt-0.5 text-[11px] text-gray-500">
                            Desative para interromper a oferta sem apagar o preço cadastrado.
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-label="Ativar ou desativar promoção"
                          aria-checked={editingPrice.active}
                          onClick={() => setEditingPrice((current) => current ? {
                            ...current,
                            active: !current.active,
                            promotionUntil: !current.active && current.promotionUntil && new Date(current.promotionUntil).getTime() <= Date.now()
                              ? ''
                              : current.promotionUntil,
                          } : null)}
                          className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-primary/10 ${editingPrice.active ? 'bg-green-600' : 'bg-gray-300'}`}
                        >
                          <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${editingPrice.active ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                        Data e hora de término
                      </label>
                      <input
                        type="datetime-local"
                        value={editingPrice.promotionUntil}
                        disabled={!editingPrice.active}
                        onChange={(event) => setEditingPrice((current) => current ? { ...current, promotionUntil: event.target.value } : null)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                      />
                      <p className="mt-1.5 text-[11px] text-gray-500">
                        Deixe em branco para manter a promoção ativa sem prazo de término.
                      </p>
                    </div>
                 </div>
              </div>

              <div className="flex gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4">
                 <button
                   type="button"
                   onClick={() => updatePromotionStatus(editingPrice, !editingPrice.active)}
                   disabled={saving || !editingPrice.promoPrice}
                   className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                     editingPrice.active
                       ? 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100'
                       : 'border-green-100 bg-green-50 text-green-700 hover:bg-green-100'
                   }`}
                 >
                   <Power className="h-4 w-4" />
                   {editingPrice.active ? 'Desativar' : 'Ativar'}
                 </button>
                 <button 
                   onClick={() => setEditingPrice(null)}
                   className="flex-1 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                 >
                    Cancelar
                 </button>
                 <button
                    onClick={handleSavePromotion}
                    disabled={saving || !editingPrice.promoPrice}
                    className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                 >
                    {saving ? 'Salvando...' : 'Salvar promoção'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {promotionToRemove && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl animate-in zoom-in duration-200">
            <div className="p-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Remover promoção?</h3>
              <p className="mt-1.5 text-sm text-gray-500">
                O preço promocional de <strong className="font-semibold text-gray-700">{promotionToRemove.nome}</strong> será removido.
              </p>
            </div>
            <div className="flex gap-2 border-t border-gray-200 bg-gray-50 p-4">
              <button
                type="button"
                onClick={() => setPromotionToRemove(null)}
                disabled={saving}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmRemovePromotion}
                disabled={saving}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
