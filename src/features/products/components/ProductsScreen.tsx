import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  AlertCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Copy, Edit2,
  Eye, FileUp, Filter, Grid2X2, List, Package, Plus, Power, Search, Star, Tag,
  ImagePlus, Trash2, UtensilsCrossed, X, Zap
} from 'lucide-react';
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';
import api from '@/shared/lib/api';
import { useProducts } from '../hooks/useProducts';
import { productsService } from '../services/productsService';
import { parseMoney, parseQuantity, parseStock } from '../utils/formatProductData';
import { ConfigurableProductEditor } from './ConfigurableProductEditor';

const PRIMARY = '#122a4c';

// Categorias agora são carregadas do banco de dados
const sortCategories = (items: any[]) =>
  [...items].sort((a, b) => (a.ordem_exibicao ?? 0) - (b.ordem_exibicao ?? 0) || (a.nome || '').localeCompare(b.nome || ''));

const getRootCategories = (items: any[]) => {
  const ids = new Set(items.map((item) => item.id));
  return sortCategories(items.filter((item) => !item.categoria_pai_id || !ids.has(item.categoria_pai_id)));
};

function getCategoryPath(categories: any[], categoryId?: string | null) {
  if (!categoryId) return [];

  const byId = new Map(categories.map((category) => [category.id, category]));
  const path: any[] = [];
  let current = byId.get(categoryId);

  while (current) {
    path.unshift(current);
    current = current.categoria_pai_id ? byId.get(current.categoria_pai_id) : null;
  }

  return path;
}

function getPaginationPages(page: number, totalPages: number) {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);

  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

function GlobalProductSelector({ existingProductIds, onSelect, onClose }: { existingProductIds: string[]; onSelect: (product: any) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const PER_PAGE = 50;

  const fetchGlobalProducts = async (pageNum = 1, reset = false) => {
    try {
      setLoading(true);
      const { products: results, totalPages } = await productsService.searchGlobalProducts({
        search,
        page: pageNum,
        perPage: PER_PAGE,
      });
      
      // Filter out products already in the store
      const filtered = results.filter((p: any) => !existingProductIds.includes(p.id));
      
      if (reset) {
        setProducts(filtered);
      } else {
        setProducts(prev => [...prev, ...filtered]);
      }
      
      setHasMore(pageNum < totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching global products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Carregamento imediato se a busca estiver vazia (estado inicial)
    if (search === '') {
      setProducts([]);
      setPage(1);
      fetchGlobalProducts(1, true);
      return;
    }

    // Se tiver menos de 3 letras, não busca nada e limpa resultados anteriores
    if (search.length < 3) {
      setProducts([]);
      setPage(1);
      return;
    }

    const timer = setTimeout(() => {
      setProducts([]);
      setPage(1);
      fetchGlobalProducts(1, true);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">Vincular Produto</h2>
            <p className="text-xs text-gray-500">Escolha um produto da base global para sua loja</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 bg-gray-50/50">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, marca ou código de barras..."
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {loading && page === 1 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
               <div className="w-8 h-8 border-3 border-gray-100 border-t-primary rounded-full animate-spin" style={{ borderTopColor: PRIMARY }}></div>
               <span className="text-sm text-gray-400 font-medium">Buscando produtos...</span>
            </div>
          ) : products.length > 0 ? (
            <div className="flex flex-col gap-1.5 pb-4">
               {products.map(p => (
                 <button
                   key={p.id}
                   onClick={() => onSelect(p)}
                   className="flex items-center gap-4 p-3.5 rounded-xl transition-all text-left group border border-transparent hover:bg-gray-50 hover:border-gray-100"
                 >
                   <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-100">
                     {p.imagem_url ? (
                       <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                     ) : (
                       <Package className="w-7 h-7 text-gray-300" />
                     )}
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">{p.nome}</div>
                     <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                       <span className="font-medium px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{p.marca || 'Sem marca'}</span>
                       {p.codigo_barras && (
                         <>
                           <span className="w-1 h-1 rounded-full bg-gray-300" />
                           <span className="font-mono">{p.codigo_barras}</span>
                         </>
                       )}
                     </div>
                   </div>
                   <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 text-gray-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                     <Plus className="w-5 h-5" />
                   </div>
                 </button>
               ))}

               {hasMore && (
                 <button
                   onClick={() => fetchGlobalProducts(page + 1)}
                   disabled={loading}
                   className="mt-4 w-full py-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 text-sm font-semibold hover:border-primary/30 hover:bg-gray-50 hover:text-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                   {loading ? (
                     <>
                       <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                       Carregando...
                     </>
                   ) : (
                     'Carregar mais produtos'
                   )}
                 </button>
               )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="w-24 h-24 rounded-full bg-blue-50/50 flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 rounded-full border-2 border-blue-100/50 animate-ping opacity-20" />
                <Package className="w-12 h-12 text-blue-300" />
              </div>
              <h3 className="text-gray-900 font-bold text-xl mb-2">Ops! Produto não encontrado</h3>
              <p className="text-sm text-gray-500 max-w-[340px] leading-relaxed mb-8">
                {search.length > 0 && search.length < 3
                  ? <>Digite pelo menos <span className="font-semibold text-gray-900">3 letras</span> para realizar a busca global.</>
                  : search 
                    ? <>Não encontramos resultados para <span className="font-semibold text-gray-900">"{search}"</span> na nossa base global. Tente simplificar a busca ou buscar pelo código de barras.</> 
                    : 'Digite o que você procura para buscar na nossa base global de produtos.'}
              </p>
              
              {search && (
                <div className="flex flex-col gap-4 w-full max-w-sm">
                  <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100/50 text-left relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Tag className="w-16 h-16 rotate-12" />
                    </div>
                    <div className="flex items-start gap-3 relative z-10">
                      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-amber-900 text-[14px] mb-1">Deseja cadastrar este produto?</h4>
                        <p className="text-amber-800/80 text-[12px] leading-normal">
                          Para manter o padrão de qualidade, novos produtos são cadastrados pela nossa equipe de catálogo.
                        </p>
                        <button 
                          onClick={() => showSystemNotice('Sua solicitação para o produto "' + search + '" foi enviada para nossa equipe de catálogo. Retornaremos em breve!')}
                          className="mt-4 px-4 py-2 bg-amber-500 text-white text-[11px] font-bold rounded-lg uppercase tracking-wider hover:bg-amber-600 transition-colors shadow-sm active:scale-95"
                        >
                          Solicitar Cadastro
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setSearch('')}
                    className="text-xs font-semibold text-gray-400 hover:text-primary transition-colors flex items-center justify-center gap-1.5"
                  >
                    <X className="w-3 h-3" />
                    Limpar busca
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductForm({ product, isNew, categories, canManageImages, onClose, onSuccess }: { product: any; isNew: boolean; categories: any[]; canManageImages: boolean; onClose: () => void; onSuccess: () => void }) {
  const initialSaleType = product?.tipo_venda || (product?.vendavel_por_peso ? 'peso' : 'unidade');
  const [form, setForm] = useState({
    preco: product?.preco?.toString() ?? '',
    preco_promocional: product?.preco_promocional?.toString() ?? '',
    estoque: product?.estoque?.toString() ?? '',
    ativo: isNew ? true : (product?.ativo_na_loja ?? true),
    destaque: product?.destaque ?? false,
    consumo_imediato: product?.consumo_imediato ?? false,
    codigo_interno: product?.codigo_interno ?? '',
    categoria_id: product?.categoria_id ?? product?.produto_categoria_id ?? '',
    tipo_venda: initialSaleType as 'unidade' | 'peso',
    quantidade_minima_compra: product?.quantidade_minima_compra?.toString() ?? (initialSaleType === 'peso' ? '0,100' : '1'),
    incremento_quantidade: product?.incremento_quantidade?.toString() ?? (initialSaleType === 'peso' ? '0,100' : '1'),
  });
  const initialPath = getCategoryPath(categories, product?.categoria_id ?? product?.categoria_final_id ?? product?.produto_categoria_id ?? '');
  const [departmentId, setDepartmentId] = useState(initialPath[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(initialPath[1]?.id ?? '');
  const [subcategoryId, setSubcategoryId] = useState(initialPath[2]?.id ?? '');
  
  const [variations, setVariations] = useState<any[]>([]);
  const [selectedVariations, setSelectedVariations] = useState<string[]>([]);
  const [variationsData, setVariationsData] = useState<Record<string, any>>({});
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const departments = getRootCategories(categories);
  const childCategories = sortCategories(categories.filter((cat: any) => cat.categoria_pai_id === departmentId));
  const subcategories = sortCategories(categories.filter((cat: any) => cat.categoria_pai_id === categoryId));
  const selectedCategoryId = subcategoryId || categoryId || departmentId || '';
  const selectedCategoryPath = getCategoryPath(categories, selectedCategoryId).map((cat: any) => cat.nome).join(' > ');
  const regularPrice = parseMoney(form.preco);
  const promotionalPrice = parseMoney(form.preco_promocional);
  const hasPromotionalPrice = regularPrice !== null &&
    promotionalPrice !== null &&
    promotionalPrice > 0 &&
    promotionalPrice < regularPrice;
  const isWeightSale = form.tipo_venda === 'peso';

  const setSaleType = (saleType: 'unidade' | 'peso') => {
    setForm(prev => ({
      ...prev,
      tipo_venda: saleType,
      quantidade_minima_compra: saleType === 'peso' ? '0,100' : '1',
      incremento_quantidade: saleType === 'peso' ? '0,100' : '1',
    }));
  };

  useEffect(() => {
    const fetchVariations = async () => {
      const productId = isNew ? product.id : product.produto_id;
      if (!productId) return;
      
      try {
        setLoadingVariations(true);
        const list = await productsService.getProductVariations(productId);
        setVariations(list);
        
        // Inicializa dados das variações
        const initialData: Record<string, any> = {};
        list.forEach((v: any) => {
          initialData[v.id] = {
            preco: form.preco || '',
            preco_promocional: form.preco_promocional || '',
            ativa: true
          };
        });
        setVariationsData(initialData);

        if (isNew) {
          setSelectedVariations(list.filter((v: any) => v.ativa).map((v: any) => v.id));
        }
      } catch (err) {
        console.error('Error fetching variations', err);
      } finally {
        setLoadingVariations(false);
      }
    };

    fetchVariations();
  }, [product.id, product.produto_id, isNew]);

  // Atualiza preços das variações se o preço principal mudar e a variação ainda não tiver preço manual?
  // Ou melhor deixar manual mesmo para evitar confusão.

  const toggleVariation = (id: string) => {
    setSelectedVariations(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const updateVariationData = (id: string, field: string, value: any) => {
    setVariationsData(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleSubmit = async () => {
    const preco = parseMoney(form.preco);
    const precoPromocional = parseMoney(form.preco_promocional);
    const canUseImmediateConsumption = preco !== null &&
      precoPromocional !== null &&
      precoPromocional > 0 &&
      precoPromocional < preco;

    if (form.consumo_imediato && !canUseImmediateConsumption) {
      showSystemNotice('Produtos para consumo imediato precisam de preço promocional menor que o preço normal.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        preco,
        preco_promocional: precoPromocional,
        estoque: parseStock(form.estoque),
        produto_id: isNew ? product.id : product.produto_id,
        categoria_id: selectedCategoryId || null,
        ativo_na_loja: form.ativo,
        destaque: form.destaque,
        consumo_imediato: form.consumo_imediato,
        codigo_interno: form.codigo_interno,
        tipo_venda: form.tipo_venda,
        quantidade_minima_compra: parseQuantity(form.quantidade_minima_compra) ?? (isWeightSale ? 0.1 : 1),
        incremento_quantidade: parseQuantity(form.incremento_quantidade) ?? (isWeightSale ? 0.1 : 1),
      };

      let produtoLojaId = product.id;
      let productId = isNew ? product.id : product.produto_id;

      if (isNew) {
        const createdProduct = await productsService.createStoreProduct(payload);
        produtoLojaId = createdProduct.id;
        productId = createdProduct.produto_id;

        // Vincula variações selecionadas com seus dados individuais
        if (selectedVariations.length > 0) {
          await Promise.all(selectedVariations.map(varId => {
            const vData = variationsData[varId];
            return productsService.createStoreProductVariation({
              variacao_produto_id: varId,
              produto_loja_id: produtoLojaId,
              preco: parseMoney(vData.preco) ?? payload.preco,
              preco_promocional: parseMoney(vData.preco_promocional),
              ativa: vData.ativa ?? true
            });
          }));
        }
      } else {
        await productsService.updateStoreProduct(product.id, payload);
      }

      if (imageFile && productId) {
        await productsService.uploadProductImage(productId, imageFile, true);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving product association', error);
      showSystemNotice(error.response?.data?.message || 'Não foi possível salvar o produto na loja.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-end">
      <div className="w-full max-w-lg h-full bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{isNew ? 'Vincular à Minha Loja' : 'Editar Produto na Loja'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Section: Basic (Read Only) */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex gap-4">
            <div className="w-20 h-20 rounded-lg bg-white overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200">
               {product.imagem_url ? (
                 <img src={product.imagem_url} alt={product.nome} className="w-full h-full object-cover" />
               ) : (
                 <Package className="w-8 h-8 text-gray-300" />
               )}
            </div>
            <div className="flex-1 min-w-0">
               <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Informações do Produto</div>
               <div className="text-sm font-semibold text-gray-900 truncate">{product.nome}</div>
               <div className="text-xs text-gray-500 mt-1">
                  <span className="font-medium">{product.marca || 'Sem marca'}</span>
                  <span className="mx-1.5 opacity-30">•</span>
                  <span>{product.unidade_medida || 'un'}</span>
                  {(product.vendavel_por_peso || isWeightSale) && (
                    <>
                      <span className="mx-1.5 opacity-30">•</span>
                      <span>vendido por peso</span>
                    </>
                  )}
               </div>
               <div className="text-[10px] text-gray-400 mt-2 line-clamp-2 italic">
                  {product.descricao || 'Sem descrição cadastrada'}
               </div>
            </div>
          </div>

          {canManageImages && (
            <label className="block rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
              <span className="flex items-center gap-2 text-xs font-bold text-gray-700">
                <ImagePlus className="w-4 h-4" /> Alterar imagem deste produto
              </span>
              <span className="mt-1 block text-[11px] text-gray-500">JPEG, PNG, WebP ou GIF (até 8 MB). A imagem é redimensionada e otimizada automaticamente.</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="mt-2 block w-full text-xs text-gray-600"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  if (file && file.size > 8 * 1024 * 1024) {
                    showSystemNotice('A imagem deve ter no máximo 8 MB.');
                    event.target.value = '';
                    return;
                  }
                  setImageFile(file);
                }}
              />
              {imageFile && <span className="mt-1 block truncate text-[11px] text-gray-600">Selecionada: {imageFile.name}</span>}
            </label>
          )}

          {/* Section: Variations (New) */}
          {variations.length > 0 && isNew && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Variações Disponíveis</div>
                <div className="px-1.5 py-0.5 rounded-md bg-blue-50 text-[10px] font-bold text-blue-600 border border-blue-100">
                  {variations.length} Opções
                </div>
              </div>
              <div className="space-y-3">
                {variations.map((v: any) => {
                  const isSelected = selectedVariations.includes(v.id);
                  const vData = variationsData[v.id] || {};
                  return (
                    <div
                      key={v.id}
                      className={`rounded-xl border transition-all overflow-hidden ${
                        isSelected 
                          ? 'border-blue-200 bg-blue-50/30 shadow-sm' 
                          : 'border-gray-100 bg-white'
                      }`}
                    >
                      <div 
                        className={`flex items-center justify-between p-3 cursor-pointer ${isSelected ? '' : 'hover:bg-gray-50'}`}
                        onClick={() => toggleVariation(v.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                            <Grid2X2 className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <div className={`text-sm font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>{v.nome}</div>
                            <div className="text-[10px] text-gray-400">SKU: {v.sku || '-'} • EAN: {v.codigo_barras || '-'}</div>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200'
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="px-3 pb-3 pt-1 border-t border-blue-100/50">
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <div>
                              <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Preço (R$)</label>
                              <input
                                value={vData.preco}
                                onClick={e => e.stopPropagation()}
                                onChange={e => updateVariationData(v.id, 'preco', e.target.value)}
                                className="w-full px-2 py-1.5 border border-blue-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                                placeholder="0,00"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Promoção (R$)</label>
                              <input
                                value={vData.preco_promocional}
                                onClick={e => e.stopPropagation()}
                                onChange={e => updateVariationData(v.id, 'preco_promocional', e.target.value)}
                                className="w-full px-2 py-1.5 border border-blue-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                                placeholder="Opcional"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 mt-2 leading-relaxed italic">
                Defina preços específicos para cada variação selecionada. Se deixado em branco, usará o preço base do produto.
              </p>
            </div>
          )}

          {variations.length > 0 && isNew && <div className="h-px bg-gray-100" />}

          {/* Section: Store Details */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Configurações da Loja</div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1 font-medium">Código Interno (SKU)</label>
                <input
                  value={form.codigo_interno}
                  onChange={e => setForm(p => ({ ...p, codigo_interno: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder="Ex: PROD-001"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1 font-medium">Categoria na Loja</label>
                <div className="space-y-2">
                  <select
                    value={departmentId}
                    onChange={e => {
                      setDepartmentId(e.target.value);
                      setCategoryId('');
                      setSubcategoryId('');
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  >
                    <option value="">Usar categoria global</option>
                    {departments.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.emoji || '📁'} {cat.nome}</option>
                    ))}
                  </select>

                  {departmentId && childCategories.length > 0 && (
                    <select
                      value={categoryId}
                      onChange={e => {
                        setCategoryId(e.target.value);
                        setSubcategoryId('');
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                    >
                      <option value="">Selecionar categoria</option>
                      {childCategories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.emoji || '📁'} {cat.nome}</option>
                      ))}
                    </select>
                  )}

                  {categoryId && subcategories.length > 0 && (
                    <select
                      value={subcategoryId}
                      onChange={e => setSubcategoryId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                    >
                      <option value="">Selecionar subcategoria</option>
                      {subcategories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.emoji || '📁'} {cat.nome}</option>
                      ))}
                    </select>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Categoria final: {selectedCategoryPath || 'categoria global do produto'}.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Pricing */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Preço e Estoque</div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{isWeightSale ? 'Preço por kg (R$) *' : 'Preço normal (R$) *'}</label>
                  <input
                    value={form.preco}
                    onChange={e => setForm(p => ({ ...p, preco: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{isWeightSale ? 'Promoção por kg (R$)' : 'Preço promocional (R$)'}</label>
                  <input
                    value={form.preco_promocional}
                    onChange={e => setForm(p => ({ ...p, preco_promocional: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Estoque{isWeightSale ? ' (kg)' : ''}</label>
                <input
                  value={form.estoque}
                  onChange={e => setForm(p => ({ ...p, estoque: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Section: Sale Mode */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Modo de venda</div>
            <div className="rounded-xl border border-gray-200 p-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSaleType('unidade')}
                  className="rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                  style={form.tipo_venda === 'unidade' ? { backgroundColor: PRIMARY, color: 'white' } : { backgroundColor: '#f3f4f6', color: '#4b5563' }}
                >
                  Unidade
                </button>
                <button
                  type="button"
                  onClick={() => setSaleType('peso')}
                  className="rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                  style={form.tipo_venda === 'peso' ? { backgroundColor: PRIMARY, color: 'white' } : { backgroundColor: '#f3f4f6', color: '#4b5563' }}
                >
                  Peso (kg)
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{isWeightSale ? 'Peso mínimo (kg)' : 'Quantidade mínima'}</label>
                  <input
                    value={form.quantidade_minima_compra}
                    onChange={e => setForm(p => ({ ...p, quantidade_minima_compra: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
                    placeholder={isWeightSale ? '0,100' : '1'}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{isWeightSale ? 'Incremento (kg)' : 'Incremento'}</label>
                  <input
                    value={form.incremento_quantidade}
                    onChange={e => setForm(p => ({ ...p, incremento_quantidade: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
                    placeholder={isWeightSale ? '0,100' : '1'}
                  />
                </div>
              </div>
              <p className="mt-2 text-[10px] text-gray-400">
                {isWeightSale ? 'O preço será cobrado por kg. Exemplo: 0,500 kg usa metade do preço por kg.' : 'Produtos por unidade exigem quantidades inteiras.'}
              </p>
            </div>
          </div>

          {/* Section: Options */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Configurações</div>
            <div className="space-y-2.5">
              {[
                { key: 'ativo', label: 'Produto ativo na loja', desc: 'Visível no app dos clientes' },
                { key: 'destaque', label: 'Produto em destaque', desc: 'Aparece em seção especial na loja' },
                {
                  key: 'consumo_imediato',
                  label: 'Consumo imediato',
                  desc: hasPromotionalPrice
                    ? 'Aparece na seção de consumo imediato'
                    : 'Exige preço promocional menor que o preço normal',
                },
              ].map(opt => (
                <div key={opt.key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-700">{opt.label}</div>
                    <div className="text-xs text-gray-400">{opt.desc}</div>
                  </div>
                  <button
                    onClick={() => {
                      if (opt.key === 'consumo_imediato' && !form.consumo_imediato && !hasPromotionalPrice) {
                        showSystemNotice('Informe um preço promocional menor que o preço normal antes de marcar consumo imediato.');
                        return;
                      }

                      setForm(p => ({ ...p, [opt.key]: !p[opt.key as keyof typeof form] }));
                    }}
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${opt.key === 'consumo_imediato' && !hasPromotionalPrice && !form.consumo_imediato ? 'opacity-60' : ''}`}
                    style={{ backgroundColor: form[opt.key as keyof typeof form] ? PRIMARY : '#d1d5db' }}
                  >
                    <span
                      className="inline-block w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5"
                      style={{ transform: `translateX(${form[opt.key as keyof typeof form] ? 18 : 2}px)` }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: PRIMARY }}
          >
            {loading ? 'Processando...' : (isNew ? 'Confirmar Vínculo' : 'Salvar Alterações')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductsScreen() {
  const navigate = useNavigate();
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [configurableEditor, setConfigurableEditor] = useState<{ product?: any; duplicate?: boolean } | null>(null);
  const [canManageImages, setCanManageImages] = useState(false);
  const [departmentId, setDepartmentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const {
    categories: dbCategories,
    categoryFilter,
    fetchCategories,
    fetchProducts,
    filteredProducts: filtered,
    loading,
    page,
    perPage,
    products,
    search,
    setCategoryFilter,
    setPage,
    setSearch,
    setStatusFilter,
    statusFilter,
    total,
    totalPages,
    toggleHighlight,
    toggleStatus,
  } = useProducts();

  useEffect(() => {
    const lojaId = JSON.parse(localStorage.getItem('user') || '{}')?.loja_id;
    if (!lojaId) return;
    api.get(`/lojas/${lojaId}`)
      .then((response) => {
        const store = response.data?.data || response.data;
        setCanManageImages(['lanchonete', 'restaurante'].includes(store?.tipo_estabelecimento));
      })
      .catch(() => setCanManageImages(false));
  }, []);
  const departments = getRootCategories(dbCategories);
  const categories = sortCategories(dbCategories.filter((category: any) => category.categoria_pai_id === departmentId));
  const subcategories = sortCategories(dbCategories.filter((category: any) => category.categoria_pai_id === categoryId));
  const selectedDepartment = departments.find((category: any) => category.id === departmentId);
  const selectedCategory = categories.find((category: any) => category.id === categoryId);
  const visiblePages = getPaginationPages(page, totalPages);

  const removeProductFromStore = async (product: any) => {
    const isLocalProduct = product.escopo_catalogo === 'loja';
    const action = isLocalProduct ? 'excluir este produto criado pela loja' : 'desvincular este produto global da loja';
    const historyNote = isLocalProduct
      ? 'O produto deixará de aparecer no catálogo, mas o histórico dos pedidos será preservado.'
      : 'O produto continuará disponível no catálogo global e o histórico dos pedidos será preservado.';

    if (!window.confirm(`Deseja ${action}?\n\n${historyNote}`)) return;

    try {
      await productsService.removeStoreProduct(product.id);
      await Promise.all([
        fetchProducts({ forceRefresh: true }),
        fetchCategories({ forceRefresh: true }),
      ]);
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || 'Não foi possível remover o produto da loja.');
    }
  };

  const selectAllCategories = () => {
    setDepartmentId('');
    setCategoryId('');
    setSubcategoryId('');
    setCategoryFilter('Todas');
  };

  const selectDepartment = (id: string) => {
    setDepartmentId(id);
    setCategoryId('');
    setSubcategoryId('');
    setCategoryFilter(id);
  };

  const selectCategory = (id: string) => {
    setCategoryId(id);
    setSubcategoryId('');
    setCategoryFilter(id);
  };

  const selectSubcategory = (id: string) => {
    setSubcategoryId(id);
    setCategoryFilter(id);
  };

  return (
    <div className="h-full flex flex-col relative">
      {isSearchingGlobal && (
        <GlobalProductSelector
          existingProductIds={products.map(p => p.produto_id)}
          onSelect={(globalProduct) => {
            setIsSearchingGlobal(false);
            setEditingProduct({ ...globalProduct, isNew: true });
          }}
          onClose={() => setIsSearchingGlobal(false)}
        />
      )}

      {editingProduct && (
        <ProductForm 
          product={editingProduct} 
          isNew={!!editingProduct.isNew}
          categories={dbCategories}
          canManageImages={canManageImages}
          onClose={() => setEditingProduct(null)} 
          onSuccess={() => {
            fetchProducts({ forceRefresh: true });
            fetchCategories({ forceRefresh: true });
          }}
        />
      )}

      {configurableEditor && (
        <ConfigurableProductEditor
          product={configurableEditor.product}
          duplicate={configurableEditor.duplicate}
          categories={dbCategories}
          canManageImages={canManageImages}
          onClose={() => setConfigurableEditor(null)}
          onSuccess={() => {
            fetchProducts({ forceRefresh: true });
            fetchCategories({ forceRefresh: true });
          }}
        />
      )}

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar produto ou marca..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1"
            />
          </div>
          <button
            onClick={() => setIsSearchingGlobal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90 active:scale-95 flex-shrink-0"
            style={{ backgroundColor: PRIMARY }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Vincular produto global</span>
          </button>
          <button
            onClick={() => setConfigurableEditor({})}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium transition-all hover:bg-gray-50 active:scale-95 flex-shrink-0"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span className="hidden sm:inline">Criar item do cardápio</span>
          </button>
          <button
            onClick={() => navigate('/products/import')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium transition-all hover:bg-gray-50 active:scale-95 flex-shrink-0"
          >
            <FileUp className="w-4 h-4" />
            <span className="hidden sm:inline">Importar CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={selectAllCategories}
            className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
            style={categoryFilter === 'Todas' ? { backgroundColor: PRIMARY, color: 'white' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
          >
            Todas
          </button>
          {departments.map(c => (
            <button
              key={c.id}
              onClick={() => selectDepartment(c.id)}
              className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors flex items-center gap-1.5"
              style={departmentId === c.id ? { backgroundColor: PRIMARY, color: 'white' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
            >
              <span>{c.emoji || '📁'}</span>
              {c.nome}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-200 flex-shrink-0 mx-1" />
          {['Todos', 'Ativo', 'Inativo'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
              style={statusFilter === s ? { backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
            >
              {s}
            </button>
          ))}
        </div>
        {departmentId && categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-2 mt-2 border-t border-gray-100">
            <span className="text-[11px] font-semibold text-gray-400 uppercase whitespace-nowrap">
              {selectedDepartment?.nome}:
            </span>
            <button
              onClick={() => selectDepartment(departmentId)}
              className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
              style={!categoryId ? { backgroundColor: PRIMARY, color: 'white' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
            >
              Todas
            </button>
            {categories.map((category: any) => (
              <button
                key={category.id}
                onClick={() => selectCategory(category.id)}
                className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
                style={categoryId === category.id ? { backgroundColor: PRIMARY, color: 'white' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
              >
                {category.emoji || '📁'} {category.nome}
              </button>
            ))}
          </div>
        )}
        {categoryId && subcategories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-2 mt-2 border-t border-gray-100">
            <span className="text-[11px] font-semibold text-gray-400 uppercase whitespace-nowrap">
              {selectedCategory?.nome}:
            </span>
            <button
              onClick={() => selectCategory(categoryId)}
              className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
              style={!subcategoryId ? { backgroundColor: PRIMARY, color: 'white' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
            >
              Todas
            </button>
            {subcategories.map((subcategory: any) => (
              <button
                key={subcategory.id}
                onClick={() => selectSubcategory(subcategory.id)}
                className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
                style={subcategoryId === subcategory.id ? { backgroundColor: PRIMARY, color: 'white' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
              >
                {subcategory.emoji || '📁'} {subcategory.nome}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Count */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-500">
          {total} produto{total !== 1 ? 's' : ''}
          {total > 0 && ` · exibindo ${(page - 1) * perPage + 1}-${Math.min(page * perPage, total)}`}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }}></div>
          </div>
        )}
        {(!loading || products.length > 0) && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Produto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Categoria</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Preço</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Preço do app</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Estoque</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.map(product => {
                const isActive = product.ativo_na_loja;
                const stock = product.estoque || 0;
                const isVirtualOptionProduct = product.produto_virtual_opcao === true;
                
                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {product.imagem_url ? (
                            <img src={product.imagem_url} alt={product.nome} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800 text-sm">{product.nome}</div>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                            <span>{product.marca || 'Sem marca'}</span>
                            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                              {product.escopo_catalogo === 'loja' ? 'Criado pela loja' : 'Catálogo global'}
                            </span>
                            {product.modo_compra === 'configuravel' && (
                              <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">Configurável</span>
                            )}
                            {product.consumo_imediato && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                                <Zap className="w-3 h-3" />
                                Consumo imediato
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 flex items-center gap-1">
                        <span>{product.categoria_emoji || '📁'}</span>
                        {product.categoria_caminho || product.categoria_nome || 'Sem categoria'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-semibold text-gray-800">R$ {parseFloat(product.preco || 0).toFixed(2).replace('.', ',')}</div>
                      {product.tipo_venda === 'peso' && (
                        <div className="text-[11px] text-gray-400">por kg</div>
                      )}
                      {product.preco_promocional && (
                        <div className="text-xs text-green-600 font-medium">R$ {parseFloat(product.preco_promocional).toFixed(2).replace('.', ',')}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {product.preco_app_taxa_ativa ? (
                        <>
                          <div className="font-semibold text-gray-800">R$ {parseFloat(product.preco_app ?? product.preco ?? 0).toFixed(2).replace('.', ',')}</div>
                          {product.tipo_venda === 'peso' && (
                            <div className="text-[11px] text-gray-400">por kg</div>
                          )}
                          {product.preco_promocional_app && (
                            <div className="text-xs text-green-600 font-medium">R$ {parseFloat(product.preco_promocional_app).toFixed(2).replace('.', ',')}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs font-medium text-gray-400">Sem taxa</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <div className="flex items-center justify-end gap-1">
                        {stock === 0 && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                        <span className={`text-sm font-medium ${stock === 0 ? 'text-red-500' : stock < 20 ? 'text-amber-500' : 'text-gray-700'}`}>
                          {stock}
                          {product.tipo_venda === 'peso' ? ' kg' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={isActive
                          ? { backgroundColor: '#f0fdf4', color: '#16a34a' }
                          : { backgroundColor: '#fef2f2', color: '#dc2626' }}
                      >
                        {isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => product.modo_compra === 'configuravel'
                            ? setConfigurableEditor({ product: isVirtualOptionProduct ? { ...product, id: product.produto_loja_id_origem } : product })
                            : setEditingProduct(product)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                          title={isVirtualOptionProduct ? 'Editar cardápio de origem' : 'Editar'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {product.modo_compra === 'configuravel' && !isVirtualOptionProduct && (
                          <button
                            onClick={() => setConfigurableEditor({ product, duplicate: true })}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                            title="Duplicar item configurável"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!isVirtualOptionProduct && (
                          <button
                            onClick={() => toggleStatus(product.id, isActive)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                            title={isActive ? 'Desativar' : 'Ativar'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!isVirtualOptionProduct && (
                          <button
                            onClick={() => toggleHighlight(product.id, product.destaque)}
                            className={`p-1.5 rounded-lg transition-colors ${product.destaque ? 'bg-amber-50 text-amber-600' : 'hover:bg-amber-50 text-gray-500 hover:text-amber-600'}`}
                            title={product.destaque ? 'Remover Destaque' : 'Destacar'}
                          >
                            <Star className={`w-3.5 h-3.5 ${product.destaque ? 'fill-amber-600' : ''}`} />
                          </button>
                        )}
                        {!isVirtualOptionProduct && (
                          <button
                            onClick={() => removeProductFromStore(product)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                            title={product.escopo_catalogo === 'loja' ? 'Excluir produto da loja' : 'Desvincular produto da loja'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Tag className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Nenhum produto encontrado</p>
          </div>
        )}
      </div>
      {totalPages > 1 && (
        <div className="border-t border-gray-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-gray-500">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1 || loading}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Anterior
            </button>
            {visiblePages.map((pageNumber) => (
              <button
                type="button"
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                disabled={loading}
                className="h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition-colors disabled:opacity-50"
                style={pageNumber === page
                  ? { backgroundColor: PRIMARY, color: 'white' }
                  : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || loading}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
