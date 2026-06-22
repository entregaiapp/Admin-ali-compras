import { useState, useEffect } from 'react';
import { 
  Tag, Search, Edit2, X, Package, Trash2, 
  AlertCircle, DollarSign, TrendingDown, Percent, Plus
} from 'lucide-react';
import api from '@/shared/lib/api';
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';

const PRIMARY = '#122a4c';

const isConfigurableProduct = (product: { modo_compra?: string | null }) => product.modo_compra === 'configuravel';

type PromotionTarget = {
  id: string;
  name: string;
  price: string;
  promoPrice: string;
  configurable: boolean;
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

  const fetchProducts = async (searchTerm = search) => {
    try {
      setLoading(true);
      const response = await api.get('/produtos_loja', {
        params: {
          busca: searchTerm.trim() || undefined,
          promocao_ativa: true,
          per_page: 1000,
        },
      });
      const data = response.data.data;
      const all = Array.isArray(data) ? data : data?.data || [];
      
      // Filtra apenas produtos que têm preço promocional
      const promoProducts = all.filter((p: any) => p.preco_promocional !== null && p.preco_promocional !== undefined);
      setProducts(promoProducts);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProducts = async (searchTerm = addPromoSearch) => {
    try {
      setSearchingAvailableProducts(true);
      const response = await api.get('/produtos_loja', {
        params: {
          busca: searchTerm.trim() || undefined,
          ativo: true,
          per_page: 1000,
        },
      });
      const data = response.data.data;
      setAllStoreProducts(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error('Error fetching available products:', error);
      showSystemNotice('Erro ao buscar produtos da loja');
    } finally {
      setSearchingAvailableProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts('');
  }, []);

  useEffect(() => {
    if (!showAddPromo) return;

    setAddPromoSearch('');
    setAddPromoSearchInput('');
    fetchAvailableProducts('');
  }, [showAddPromo]);

  const handlePromotionSearch = () => {
    const term = searchInput.trim();
    setSearch(term);
    fetchProducts(term);
  };

  const handleAvailableProductSearch = () => {
    const term = addPromoSearchInput.trim();
    setAddPromoSearch(term);
    fetchAvailableProducts(term);
  };

  const handleUpdatePrice = async (id: string, price: string) => {
    try {
      setSaving(true);
      const val = parseFloat(price.toString().replace(',', '.'));
      
      if (isNaN(val)) {
        showSystemNotice('Preço inválido');
        return;
      }

      await api.patch(`/produtos_loja/${id}`, { 
        preco_promocional: val 
      });
      
      fetchProducts(search); // Refresh
      if (showAddPromo) fetchAvailableProducts(addPromoSearch);
      setEditingPrice(null);
      setShowAddPromo(false);
    } catch (error) {
      console.error('Error updating promotion price:', error);
      showSystemNotice('Erro ao atualizar preço promocional');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePromotion = async (id: string) => {
    if (!window.confirm('Deseja remover a promoção deste produto?')) return;
    
    try {
      await api.patch(`/produtos_loja/${id}`, { 
        preco_promocional: null 
      });
      fetchProducts(search);
    } catch (error) {
      console.error('Error removing promotion:', error);
      showSystemNotice('Erro ao remover promoção');
    }
  };

  const filtered = products;

  const availableProducts = allStoreProducts.filter((p) => {
    const hasPromotion = p.preco_promocional !== null && p.preco_promocional !== undefined;
    if (hasPromotion) return false;

    return true;
  });

  const calculateDiscount = (price: number, promoPrice: number) => {
    if (!price || !promoPrice) return 0;
    return Math.round(((price - promoPrice) / price) * 100);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header / Stats */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Tag className="w-6 h-6 text-primary" style={{ color: PRIMARY }} />
              Produtos em Promoção
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie todos os itens que possuem preços promocionais ativos na sua loja.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <button
               onClick={() => setShowAddPromo(true)}
               className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
               style={{ backgroundColor: PRIMARY }}
             >
                <Plus className="w-4 h-4" />
                <span>Nova Promoção</span>
             </button>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handlePromotionSearch();
              }}
              placeholder="Buscar nos produtos em promoção..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={handlePromotionSearch}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
          >
            <Search className="w-4 h-4" />
            <span>Buscar</span>
          </button>
          <div className="ml-auto flex items-center gap-4">
             <div className="text-right hidden sm:block">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total em Promoção</div>
                <div className="text-sm font-bold text-gray-700">{products.length} itens</div>
             </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-gray-100 border-t-primary rounded-full animate-spin" style={{ borderTopColor: PRIMARY }}></div>
            <span className="text-sm text-gray-400 font-medium">Carregando promoções...</span>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(product => {
              const price = parseFloat(product.preco || 0);
              const promoPrice = parseFloat(product.preco_promocional || 0);
              const discount = calculateDiscount(price, promoPrice);

              return (
                <div key={product.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-100">
                        {product.imagem_url ? (
                          <img src={product.imagem_url} alt={product.nome} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <Package className="w-8 h-8 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                           <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-bold border border-red-100">
                              -{discount}%
                           </span>
                           {product.destaque && (
                             <span className="w-2 h-2 rounded-full bg-amber-400" />
                           )}
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm truncate">{product.nome}</h3>
                        {isConfigurableProduct(product) && (
                          <span className="mt-1 inline-flex rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">Configurável</span>
                        )}
                        <p className="text-xs text-gray-400 truncate">{product.marca || 'Sem marca'}</p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
                       <div>
                          <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">De</div>
                          <div className="text-xs text-gray-500 line-through">R$ {price.toFixed(2).replace('.', ',')}</div>
                       </div>
                       <div className="text-right">
                          <div className="text-[10px] text-green-600 uppercase font-bold tracking-wider">Por</div>
                          <div className="text-lg font-black text-green-700">R$ {promoPrice.toFixed(2).replace('.', ',')}</div>
                       </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => setEditingPrice({ 
                           id: product.id, 
                           name: product.nome, 
                           price: price.toFixed(2), 
                           promoPrice: promoPrice.toFixed(2),
                           configurable: isConfigurableProduct(product),
                        })}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-primary hover:border-primary/30 transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Alterar Preço
                      </button>
                      <button
                        onClick={() => handleRemovePromotion(product.id)}
                        className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all"
                        title="Remover promoção"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Tag className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-gray-900 font-bold text-lg mb-1">Nenhuma promoção encontrada</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              {search 
                ? `Não encontramos nenhum produto em promoção com o nome "${search}".`
                : 'Não há produtos com preço promocional ativo no momento.'}
            </p>
            {!search && (
               <button
                  onClick={() => setShowAddPromo(true)}
                  className="mt-6 px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
                  style={{ backgroundColor: PRIMARY }}
               >
                  Começar uma promoção
               </button>
            )}
          </div>
        )}
      </div>

      {/* Add Promotion Modal */}
      {showAddPromo && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                 <div>
                    <h3 className="font-bold text-gray-900">Selecionar Produto para Promoção</h3>
                    <p className="text-[11px] text-gray-500">Escolha um produto da sua loja para aplicar o desconto</p>
                 </div>
                 <button onClick={() => setShowAddPromo(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="p-4 bg-gray-50/50 border-b border-gray-100">
                 <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      autoFocus
                      placeholder="Buscar em todos os produtos..."
                      value={addPromoSearchInput}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                      onChange={e => setAddPromoSearchInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAvailableProductSearch();
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAvailableProductSearch}
                    disabled={searchingAvailableProducts}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                    style={{ backgroundColor: PRIMARY }}
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
                          configurable: isConfigurableProduct(p),
                       })}
                       className="w-full flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-gray-50 border border-transparent hover:border-gray-100 group"
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
                       <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 text-gray-400 group-hover:bg-primary group-hover:text-white transition-all">
                          <Plus className="w-4 h-4" />
                       </div>
                    </button>
                 ))}
                 {!searchingAvailableProducts && availableProducts.length === 0 && (
                   <div className="py-8 text-center text-sm text-gray-500">
                     {addPromoSearch
                       ? `Nenhum produto disponível encontrado para "${addPromoSearch}".`
                       : 'Nenhum produto disponível encontrado.'}
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Edit Modal (used for both Edit and Add Promo after selection) */}
      {editingPrice && (
        <div className="fixed inset-0 bg-black/40 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                 <h3 className="font-bold text-gray-900">Configurar Promoção</h3>
                 <button onClick={() => setEditingPrice(null)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="p-6 space-y-4">
                 <div className="p-3 bg-gray-50 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-white flex items-center justify-center border border-gray-100 flex-shrink-0">
                       <Tag className="w-5 h-5 text-primary" style={{ color: PRIMARY }} />
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
                       <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-wider">Preço Atual (R$)</label>
                       <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          {editingPrice.price.replace('.', ',')}
                       </div>
                    </div>
                    
                    <div>
                       <label className="block text-[10px] font-bold text-primary uppercase mb-1.5 tracking-wider" style={{ color: PRIMARY }}>Novo Preço Promocional (R$)</label>
                       <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            autoFocus
                            value={editingPrice.promoPrice}
                            onChange={e => setEditingPrice(prev => prev ? { ...prev, promoPrice: e.target.value } : null)}
                            className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-lg font-bold bg-white focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
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
                 </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 flex gap-3">
                 <button 
                   onClick={() => setEditingPrice(null)}
                   className="flex-1 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                 >
                    Cancelar
                 </button>
                 <button
                    onClick={() => handleUpdatePrice(editingPrice.id, editingPrice.promoPrice)}
                    disabled={saving || !editingPrice.promoPrice}
                    className="flex-1 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                    style={{ backgroundColor: PRIMARY }}
                 >
                    {saving ? 'Processando...' : 'Ativar Promoção'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
