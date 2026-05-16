import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, GripVertical, X, Image, Calendar, Power, Loader2, UploadCloud, ArrowUp, ArrowDown } from 'lucide-react';
import { bannersService } from '../services/bannersService';
import type { Banner, BannerDisplayType, BannerPageKey, BannerPayload, BannerPlacementKey, BannerSegmentRules } from '../types/banner';
import { productsService } from '@/features/products';

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
  placement_key: 'home_top',
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
  return value.slice(0, 10);
}

function listToText(value?: string[]) {
  return (value || []).join(', ');
}

function textToList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function bannerToPayload(banner?: Banner | null): BannerPayload {
  if (!banner) return emptyPayload;
  return {
    titulo: banner.titulo || '',
    subtitulo: banner.subtitulo || '',
    cta_text: banner.cta_text || 'Ver ofertas',
    imagem_url: banner.imagem_url || '',
    imagem_path: banner.imagem_path || '',
    display_type: banner.display_type,
    page_key: banner.page_key,
    placement_key: banner.placement_key,
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

function BannerForm({
  banner,
  products,
  categories,
  onClose,
  onSaved,
}: {
  banner?: Banner | null;
  products: any[];
  categories: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<BannerPayload>(() => bannerToPayload(banner));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const allowedPlacements = useMemo(
    () => placementOptions.filter((option) => option.pages.includes(form.page_key)),
    [form.page_key],
  );

  useEffect(() => {
    if (!allowedPlacements.some((option) => option.value === form.placement_key)) {
      setForm((current) => ({ ...current, placement_key: allowedPlacements[0]?.value || 'home_top' }));
    }
  }, [allowedPlacements, form.placement_key]);

  const update = <K extends keyof BannerPayload>(key: K, value: BannerPayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
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

  const toggleProduct = (productId: string) => {
    setForm((current) => ({
      ...current,
      produto_loja_ids: current.produto_loja_ids.includes(productId)
        ? current.produto_loja_ids.filter((id) => id !== productId)
        : [...current.produto_loja_ids, productId],
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
      setError(error?.response?.data?.message || error?.message || 'Erro ao enviar imagem.');
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
      inicia_em: form.inicia_em || null,
      expira_em: form.expira_em || null,
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
      setError(error?.response?.data?.message || error?.message || 'Erro ao salvar banner.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Tipo</label>
                <select value={form.display_type} onChange={(event) => update('display_type', event.target.value as BannerDisplayType)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
                  {displayOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Tela</label>
                <select value={form.page_key} onChange={(event) => update('page_key', event.target.value as BannerPageKey)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
                  {pageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Posição</label>
              <select value={form.placement_key} onChange={(event) => update('placement_key', event.target.value as BannerPlacementKey)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
                {allowedPlacements.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
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
              <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 p-2">
                {products.map((product) => (
                  <label key={product.id} className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700">
                    <input type="checkbox" checked={form.produto_loja_ids.includes(product.id)} onChange={() => toggleProduct(product.id)} />
                    <span className="truncate">{product.nome}</span>
                  </label>
                ))}
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
                  <div className="max-h-28 overflow-y-auto rounded-lg border border-gray-200 p-2">
                    {products.slice(0, 80).map((product) => (
                      <label key={product.id} className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700">
                        <input type="checkbox" checked={(form.segment_rules.purchased_product_ids || []).includes(product.id)} onChange={() => togglePurchasedProduct(product.id)} />
                        <span className="truncate">{product.nome}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Já comprou categorias</label>
                  <div className="max-h-28 overflow-y-auto rounded-lg border border-gray-200 p-2">
                    {categories.map((category) => (
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
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editing, setEditing] = useState<Banner | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [bannerList, productList, categoryList] = await Promise.all([
        bannersService.getBanners(),
        productsService.getStoreProducts(),
        productsService.getActiveCategories(),
      ]);
      setBanners(bannerList);
      setProducts(productList);
      setCategories(categoryList);
    } catch (error: any) {
      setError(error?.response?.data?.message || error?.message || 'Erro ao carregar banners.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
          products={products}
          categories={categories}
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
                    {banner.display_type} · {banner.placement_key}
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
