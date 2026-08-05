import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Bell,
  CheckCheck,
  ChevronRight,
  Inbox,
  Loader2,
  Megaphone,
  Package,
  RefreshCw,
  Search,
  Send,
  Smartphone,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  createCampaign,
  enableAdminPush,
  fetchCampaigns,
  fetchNotifications,
  readAllNotifications,
  readNotification,
  type CampaignAudience,
  type InternalNotification,
  type PushCampaign,
} from '../services/notificationsService';
import { bannersService } from '@/features/banners';
import type { Banner, BannerPageKey } from '@/features/banners/types/banner';
import { productsService } from '@/features/products';
import { formatBrasiliaDate, monthInBrasilia } from '@/shared/lib/dateTime';
import api from '@/shared/lib/api';
import { ADMIN_STORE_THEME_UPDATED_EVENT } from '@/shared/constants/uiEvents';

const PRIMARY = '#122a4c';
const BANNER_DEEP_LINK_OPTION = '__banner__';
const PRODUCT_DEEP_LINK_OPTION = '__product__';
const getApiData = (payload: any) => payload?.data?.data ?? payload?.data ?? payload;

type ScreenTab = 'history' | 'campaigns';
type HistoryFilter = 'all' | 'unread' | 'read';
type FeedbackTone = 'success' | 'error' | 'neutral';

const fieldClassName = 'mt-1.5 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition-colors focus:border-gray-400 disabled:bg-gray-50 disabled:text-gray-400';

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((character) => character + character).join('')
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(value)) return `rgba(18, 42, 76, ${alpha})`;

  const number = Number.parseInt(value, 16);
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
};

function formatDate(value: string) {
  return formatBrasiliaDate(value, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  sending: 'Enviando',
  sent: 'Enviada',
  failed: 'Falhou',
  scheduled: 'Agendada',
};

const statusStyles: Record<string, { backgroundColor: string; color: string }> = {
  draft: { backgroundColor: '#f1f5f9', color: '#64748b' },
  sending: { backgroundColor: '#eff6ff', color: '#2563eb' },
  sent: { backgroundColor: '#f0fdf4', color: '#15803d' },
  failed: { backgroundColor: '#fef2f2', color: '#dc2626' },
  scheduled: { backgroundColor: '#fff7ed', color: '#c2410c' },
};

const audienceOptions: Array<{ value: CampaignAudience; label: string; help: string }> = [
  { value: 'all_customers', label: 'Todos os clientes', help: 'Clientes que permitiram campanhas push.' },
  { value: 'recent_customers', label: 'Compraram nos últimos 30 dias', help: 'Clientes com compra recente não cancelada.' },
  { value: 'inactive_customers', label: 'Sem comprar há 60 dias', help: 'Clientes que já compraram, mas estão inativos.' },
  { value: 'loyal_customers', label: 'Clientes fiéis', help: 'Quantidade mínima de pedidos escolhida abaixo.' },
  { value: 'high_value_customers', label: 'Clientes de alto valor', help: 'Total mínimo gasto escolhido abaixo.' },
  { value: 'birthday_month', label: 'Aniversariantes do mês', help: 'Clientes com aniversário no mês escolhido.' },
];

const audienceLabel = (audience: CampaignAudience) => (
  audienceOptions.find((option) => option.value === audience)?.label || audience
);

const deepLinkOptions = [
  { value: '/', label: 'Entrar no app' },
  { value: PRODUCT_DEEP_LINK_OPTION, label: 'Produto específico' },
  { value: BANNER_DEEP_LINK_OPTION, label: 'Banner específico' },
  { value: '/promocoes', label: 'Promoções' },
  { value: '/ofertas', label: 'Ofertas' },
  { value: '/categories', label: 'Categorias' },
  { value: '/carrinho', label: 'Carrinho' },
  { value: '/orders', label: 'Meus pedidos' },
  { value: '/notifications', label: 'Notificações' },
  { value: '/profile', label: 'Perfil' },
  { value: '/support', label: 'Suporte' },
];

const bannerPageLabels: Record<BannerPageKey, string> = {
  home: 'Início',
  products: 'Produtos',
  categories: 'Categorias',
  cart: 'Carrinho',
  checkout: 'Checkout',
  payment: 'Pagamento',
  order_confirmed: 'Pedido confirmado',
  profile: 'Perfil',
  notifications: 'Notificações',
  support: 'Suporte',
};

const bannerDeepLink = (bannerId: string) => `/produtos?banner=${encodeURIComponent(bannerId)}`;
const productDeepLink = (productStoreId: string) => `/product/${encodeURIComponent(productStoreId)}`;

function isBannerAvailable(banner: Banner) {
  if (!banner.ativo) return false;

  const now = Date.now();
  const startsAt = banner.inicia_em ? new Date(banner.inicia_em).getTime() : null;
  const expiresAt = banner.expira_em ? new Date(banner.expira_em).getTime() : null;

  return (!startsAt || startsAt <= now) && (!expiresAt || expiresAt >= now);
}

export function NotificationsScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ScreenTab>('history');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);
  const [campaigns, setCampaigns] = useState<PushCampaign[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [productOptions, setProductOptions] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearchError, setProductSearchError] = useState('');
  const [primaryColor, setPrimaryColor] = useState(PRIMARY);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [bannersLoaded, setBannersLoaded] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: FeedbackTone } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    body: '',
    image_url: '',
    deep_link: '/',
    banner_id: '',
    product_id: '',
    audience: 'all_customers' as CampaignAudience,
    min_orders: '3',
    min_total: '300',
    month: monthInBrasilia(),
  });

  const user = useMemo(() => {
    try {
      const userJson = localStorage.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  }, []);

  const showFeedback = (message: string, tone: FeedbackTone = 'neutral') => {
    setFeedback({ message, tone });
  };

  const setNotificationItems = (items: InternalNotification[]) => {
    setNotifications(items);
    window.dispatchEvent(new CustomEvent('admin-notification-count-updated', {
      detail: items.filter((item) => !item.read_at).length,
    }));
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      setNotificationItems(await fetchNotifications());
    } catch (error: any) {
      showFeedback(error?.response?.data?.message || 'Não foi possível carregar as notificações.', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      setCampaigns(await fetchCampaigns());
      setCampaignsLoaded(true);
    } catch (error: any) {
      showFeedback(error?.response?.data?.message || 'Não foi possível carregar as campanhas.', 'error');
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const loadBanners = async () => {
    setLoadingBanners(true);
    try {
      setBanners(await bannersService.getBanners());
      setBannersLoaded(true);
    } catch (error: any) {
      showFeedback(error?.response?.data?.message || 'Não foi possível carregar os banners.', 'error');
    } finally {
      setLoadingBanners(false);
    }
  };

  useEffect(() => {
    void loadHistory();
    const refresh = () => void loadHistory();
    window.addEventListener('notification-received', refresh);
    return () => window.removeEventListener('notification-received', refresh);
  }, []);

  useEffect(() => {
    if (tab === 'campaigns' && !campaignsLoaded && !loadingCampaigns) void loadCampaigns();
    if (tab === 'campaigns' && !bannersLoaded && !loadingBanners) void loadBanners();
  }, [tab, campaignsLoaded, loadingCampaigns, bannersLoaded, loadingBanners]);

  useEffect(() => {
    if (form.deep_link !== PRODUCT_DEEP_LINK_OPTION) return;

    let ignore = false;
    const timer = window.setTimeout(async () => {
      try {
        setLoadingProducts(true);
        setProductSearchError('');
        const search = productQuery.trim() || undefined;
        const [simpleResult, configurableResult] = await Promise.all([
          productsService.getStoreProductsPage({
            search,
            page: 1,
            perPage: 50,
            activeOnly: true,
            purchaseMode: 'simples',
            includeOptionProducts: false,
          }),
          productsService.getStoreProductsPage({
            search,
            page: 1,
            perPage: 100,
            activeOnly: true,
            purchaseMode: 'configuravel',
            includeOptionProducts: false,
          }),
        ]);

        const productsById = new Map<string, any>();
        [...simpleResult.products, ...configurableResult.products]
          .filter((product) => !product.produto_virtual_opcao && !String(product.id || '').includes(':'))
          .forEach((product) => productsById.set(product.id, product));
        const products = Array.from(productsById.values()).sort((first, second) => (
          String(first.nome || '').localeCompare(String(second.nome || ''), 'pt-BR', { sensitivity: 'base' })
        ));

        if (!ignore) setProductOptions(products);
      } catch (error: any) {
        if (!ignore) {
          setProductOptions([]);
          setProductSearchError(error?.response?.data?.message || 'Não foi possível buscar os produtos.');
        }
      } finally {
        if (!ignore) setLoadingProducts(false);
      }
    }, 300);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [form.deep_link, productQuery]);

  useEffect(() => {
    if (!user?.loja_id) return;

    api.get(`/lojas/${user.loja_id}/configuracoes`)
      .then((response) => {
        const rawConfig = getApiData(response);
        const config = Array.isArray(rawConfig) ? rawConfig[0] || {} : rawConfig || {};
        setPrimaryColor(config.cor_primaria || PRIMARY);
      })
      .catch((error) => console.error('Erro ao carregar a configuração visual da loja:', error));
  }, [user?.loja_id]);

  useEffect(() => {
    const handleStoreThemeUpdated = (event: Event) => {
      const nextPrimaryColor = (event as CustomEvent<{ primaryColor?: string }>).detail?.primaryColor;
      if (nextPrimaryColor) setPrimaryColor(nextPrimaryColor);
    };

    window.addEventListener(ADMIN_STORE_THEME_UPDATED_EVENT, handleStoreThemeUpdated);
    return () => window.removeEventListener(ADMIN_STORE_THEME_UPDATED_EVENT, handleStoreThemeUpdated);
  }, []);

  const unread = useMemo(() => notifications.filter((item) => !item.read_at).length, [notifications]);
  const availableBanners = useMemo(
    () => banners.filter(isBannerAvailable).sort((a, b) => a.prioridade - b.prioridade || a.titulo.localeCompare(b.titulo)),
    [banners],
  );
  const filteredNotifications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');
    return notifications.filter((item) => {
      const matchesStatus = historyFilter === 'all'
        || (historyFilter === 'unread' && !item.read_at)
        || (historyFilter === 'read' && Boolean(item.read_at));
      const searchableText = `${item.title} ${item.body}`.toLocaleLowerCase('pt-BR');
      return matchesStatus && (!normalizedSearch || searchableText.includes(normalizedSearch));
    });
  }, [historyFilter, notifications, searchTerm]);

  const markRead = async (notification: InternalNotification) => {
    try {
      if (!notification.read_at) {
        const updated = await readNotification(notification.id);
        setNotificationItems(notifications.map((item) => item.id === updated.id ? updated : item));
      }
      if (notification.data?.route) navigate(notification.data.route);
    } catch (error: any) {
      showFeedback(error?.response?.data?.message || 'Não foi possível abrir a notificação.', 'error');
    }
  };

  const markAllRead = async () => {
    if (markingAllRead) return;
    setMarkingAllRead(true);
    try {
      const updates = await readAllNotifications();
      const updatedById = new Map(updates.map((item) => [item.id, item]));
      setNotificationItems(notifications.map((item) => updatedById.get(item.id) || item));
      showFeedback('Todas as notificações foram marcadas como lidas.', 'success');
    } catch (error: any) {
      showFeedback(error?.response?.data?.message || 'Não foi possível marcar as notificações como lidas.', 'error');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const activatePush = async () => {
    try {
      await enableAdminPush();
      showFeedback('Alertas administrativos ativados neste dispositivo.', 'success');
    } catch (error: any) {
      showFeedback(error?.message || 'Não foi possível ativar as notificações.', 'error');
    }
  };

  const submitCampaign = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const audienceConfig = form.audience === 'loyal_customers'
        ? { min_orders: Number(form.min_orders) }
        : form.audience === 'high_value_customers'
          ? { min_total: Number(form.min_total) }
          : form.audience === 'birthday_month'
            ? { month: Number(form.month) }
            : {};
      const usesBannerDeepLink = form.deep_link === BANNER_DEEP_LINK_OPTION;
      const usesProductDeepLink = form.deep_link === PRODUCT_DEEP_LINK_OPTION;
      const selectedBanner = usesBannerDeepLink && form.banner_id
        ? availableBanners.find((banner) => banner.id === form.banner_id)
        : null;

      if (usesBannerDeepLink && !selectedBanner) {
        showFeedback('Selecione um banner disponível para vincular à campanha.', 'error');
        return;
      }

      if (usesProductDeepLink && !form.product_id) {
        showFeedback('Selecione um produto ativo para vincular à campanha.', 'error');
        return;
      }

      const campaign = await createCampaign({
        title: form.title,
        body: form.body,
        image_url: form.image_url || null,
        deep_link: selectedBanner
          ? bannerDeepLink(selectedBanner.id)
          : usesProductDeepLink
            ? productDeepLink(form.product_id)
            : form.deep_link,
        audience: form.audience,
        audience_config: audienceConfig,
      });
      setForm({
        title: '',
        body: '',
        image_url: '',
        deep_link: '/',
        banner_id: '',
        product_id: '',
        audience: 'all_customers',
        min_orders: '3',
        min_total: '300',
        month: monthInBrasilia(),
      });
      setSelectedProduct(null);
      setProductQuery('');
      if (campaign.total_devices === 0) {
        showFeedback('O histórico foi criado, mas nenhum cliente ativou notificações push.', 'neutral');
      } else if (campaign.total_sent === 0) {
        showFeedback('Nenhuma notificação foi entregue. Verifique a configuração FCM do backend.', 'error');
      } else {
        showFeedback('Campanha enviada por push.', 'success');
      }
      setCampaigns((items) => [campaign, ...items.filter((item) => item.id !== campaign.id)]);
      setCampaignsLoaded(true);
      setTab('campaigns');
    } catch (error: any) {
      showFeedback(error?.response?.data?.message || error?.message || 'Não foi possível enviar a campanha.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const tabItems: Array<{ value: ScreenTab; label: string; count: number }> = [
    { value: 'history', label: 'Histórico', count: unread },
    { value: 'campaigns', label: 'Campanhas push', count: campaigns.length },
  ];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-50/70">
      <div className="flex min-h-[56px] items-end justify-between gap-3 border-b border-gray-200 bg-white px-4">
        <div className="flex h-full min-w-0 items-end overflow-x-auto" role="tablist" aria-label="Seções de notificações">
          {tabItems.map((item) => {
            const selected = tab === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(item.value)}
                className="relative flex h-full min-h-[56px] shrink-0 items-center gap-2 px-4 text-sm font-semibold transition-colors"
                style={{ color: selected ? primaryColor : '#64748b' }}
              >
                {item.label}
                {item.count > 0 && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{
                      backgroundColor: selected ? hexToRgba(primaryColor, 0.1) : '#f1f5f9',
                      color: selected ? primaryColor : '#64748b',
                    }}
                  >
                    {item.count}
                  </span>
                )}
                {selected && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t-full" style={{ backgroundColor: primaryColor }} />}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => void activatePush()}
          title="Receber alertas administrativos, como novos pedidos"
          className="mb-2.5 inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          <Smartphone className="h-4 w-4" />
          <span className="hidden sm:inline">Ativar alertas</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {feedback && (
          <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
            feedback.tone === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : feedback.tone === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-600'
          }`}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{feedback.message}</span>
            <button type="button" onClick={() => setFeedback(null)} className="text-xs font-semibold opacity-70 hover:opacity-100">Fechar</button>
          </div>
        )}

        {tab === 'history' && (
          <section className="space-y-3">
            <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar notificações"
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:bg-white"
                />
              </div>
              <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-lg bg-gray-50 p-1">
                {([
                  ['all', 'Todas', notifications.length],
                  ['unread', 'Não lidas', unread],
                  ['read', 'Lidas', notifications.length - unread],
                ] as [HistoryFilter, string, number][]).map(([value, label, count]) => {
                  const selected = historyFilter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setHistoryFilter(value)}
                      className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors"
                      style={selected ? { backgroundColor: 'white', color: primaryColor, boxShadow: '0 1px 2px rgb(15 23 42 / 0.08)' } : { color: '#64748b' }}
                    >
                      {label} <span className="ml-1 opacity-70">{count}</span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => void loadHistory()}
                disabled={loadingHistory}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                title="Atualizar notificações"
              >
                <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                <span className="sm:hidden lg:inline">Atualizar</span>
              </button>
            </div>

            {unread > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  disabled={markingAllRead}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
                  style={{ color: primaryColor }}
                >
                  {markingAllRead ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                  Marcar todas como lidas
                </button>
              </div>
            )}

            {loadingHistory && notifications.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: primaryColor }} />
                Carregando notificações...
              </div>
            ) : filteredNotifications.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="divide-y divide-gray-100">
                  {filteredNotifications.map((item) => {
                    const isUnread = !item.read_at;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void markRead(item)}
                        className="relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50/80"
                        style={isUnread ? { backgroundColor: hexToRgba(primaryColor, 0.035) } : undefined}
                      >
                        {isUnread && <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full" style={{ backgroundColor: primaryColor }} />}
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: isUnread ? hexToRgba(primaryColor, 0.1) : '#f1f5f9', color: isUnread ? primaryColor : '#94a3b8' }}
                        >
                          <Bell className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <span className={`text-sm text-gray-900 ${isUnread ? 'font-semibold' : 'font-medium'}`}>{item.title}</span>
                            <span className="shrink-0 text-[11px] text-gray-400">{formatDate(item.created_at)}</span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{item.body}</p>
                        </div>
                        {item.data?.route && <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-gray-300" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-300"><Inbox className="h-7 w-7" /></div>
                <h3 className="text-base font-semibold text-gray-800">Nenhuma notificação encontrada</h3>
                <p className="mt-1 max-w-sm text-sm text-gray-500">Altere a busca ou o filtro para visualizar outras notificações.</p>
              </div>
            )}
          </section>
        )}

        {tab === 'campaigns' && (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
            <form onSubmit={submitCampaign} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="flex items-start gap-3 border-b border-gray-100 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: hexToRgba(primaryColor, 0.1), color: primaryColor }}>
                  <Megaphone className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Nova campanha</h3>
                  <p className="mt-0.5 text-xs text-gray-500">Envie uma mensagem aos clientes que aceitaram notificações.</p>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <label className="block text-xs font-semibold text-gray-600">
                  Título
                  <input required maxLength={120} placeholder="Ex.: Oferta especial de hoje" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={fieldClassName} />
                </label>
                <label className="block text-xs font-semibold text-gray-600">
                  Mensagem
                  <textarea required maxLength={500} rows={4} placeholder="Escreva uma mensagem curta e objetiva" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} className={`${fieldClassName} h-auto min-h-24 resize-y py-2.5`} />
                  <span className="mt-1 block text-right text-[10px] font-normal text-gray-400">{form.body.length}/500</span>
                </label>
                <label className="block text-xs font-semibold text-gray-600">
                  URL da imagem <span className="font-normal text-gray-400">(opcional)</span>
                  <input type="url" placeholder="https://..." value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} className={fieldClassName} />
                </label>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <label className="block text-xs font-semibold text-gray-600">
                    Ao tocar, abrir
                    <select
                      value={form.deep_link}
                      onChange={(event) => setForm({
                        ...form,
                        deep_link: event.target.value,
                        banner_id: event.target.value === BANNER_DEEP_LINK_OPTION ? form.banner_id : '',
                        product_id: event.target.value === PRODUCT_DEEP_LINK_OPTION ? form.product_id : '',
                      })}
                      className={fieldClassName}
                    >
                      {deepLinkOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-gray-600">
                    Público
                    <select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value as CampaignAudience })} className={fieldClassName}>
                      {audienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>

                {form.deep_link === PRODUCT_DEEP_LINK_OPTION && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-700">
                      <Package className="h-4 w-4" style={{ color: primaryColor }} />
                      Produto de destino
                    </div>
                    <label className="block text-[11px] font-medium text-gray-500">
                      Buscar no catálogo da loja
                      <div className="relative mt-1.5">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="search"
                          value={productQuery}
                          onChange={(event) => setProductQuery(event.target.value)}
                          placeholder="Digite o nome do produto"
                          className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-sm text-gray-700 outline-none transition-colors focus:border-gray-400"
                        />
                        {loadingProducts && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />}
                      </div>
                    </label>
                    <label className="mt-2 block text-[11px] font-medium text-gray-500">
                      Produto específico
                      <select
                        required
                        value={form.product_id}
                        onChange={(event) => {
                          const product = productOptions.find((item) => item.id === event.target.value) || null;
                          setSelectedProduct(product);
                          setForm({ ...form, product_id: event.target.value });
                        }}
                        disabled={loadingProducts && productOptions.length === 0}
                        className={fieldClassName}
                      >
                        <option value="">{loadingProducts && productOptions.length === 0 ? 'Carregando produtos...' : 'Selecione um produto'}</option>
                        {selectedProduct && !productOptions.some((product) => product.id === selectedProduct.id) && (
                          <option value={selectedProduct.id}>{selectedProduct.nome || 'Produto selecionado'}</option>
                        )}
                        {productOptions.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.nome || product.produto_nome || 'Produto sem nome'}{product.modo_compra === 'configuravel' ? ' (Configurável)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    {productSearchError && <p className="mt-2 text-[11px] text-red-600">{productSearchError}</p>}
                    {!productSearchError && !loadingProducts && productOptions.length === 0 && (
                      <p className="mt-2 text-[11px] text-gray-400">Nenhum produto ativo encontrado para esta busca.</p>
                    )}
                    <p className="mt-2 text-[11px] leading-relaxed text-gray-400">Ao tocar na notificação, o cliente abrirá diretamente os detalhes deste produto.</p>
                  </div>
                )}

                {form.deep_link === BANNER_DEEP_LINK_OPTION && (
                  <label className="block text-xs font-semibold text-gray-600">
                    Banner específico
                    <select
                      value={form.banner_id}
                      onChange={(event) => setForm({ ...form, banner_id: event.target.value })}
                      disabled={loadingBanners || availableBanners.length === 0}
                      required
                      className={fieldClassName}
                    >
                      <option value="">{loadingBanners ? 'Carregando banners...' : 'Selecione um banner'}</option>
                      {availableBanners.map((banner) => (
                        <option key={banner.id} value={banner.id}>{banner.titulo} · {bannerPageLabels[banner.page_key] || banner.page_key}</option>
                      ))}
                    </select>
                    <span className="mt-1 block text-[11px] font-normal text-gray-400">Abre a coleção de produtos do banner no aplicativo.</span>
                  </label>
                )}

                {form.audience === 'loyal_customers' && (
                  <label className="block text-xs font-semibold text-gray-600">
                    Mínimo de pedidos
                    <input required type="number" min={2} max={1000} value={form.min_orders} onChange={(event) => setForm({ ...form, min_orders: event.target.value })} className={fieldClassName} />
                  </label>
                )}
                {form.audience === 'high_value_customers' && (
                  <label className="block text-xs font-semibold text-gray-600">
                    Total mínimo gasto (R$)
                    <input required type="number" min={1} step="0.01" value={form.min_total} onChange={(event) => setForm({ ...form, min_total: event.target.value })} className={fieldClassName} />
                  </label>
                )}
                {form.audience === 'birthday_month' && (
                  <label className="block text-xs font-semibold text-gray-600">
                    Mês de aniversário
                    <select value={form.month} onChange={(event) => setForm({ ...form, month: event.target.value })} className={fieldClassName}>
                      {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((month, index) => (
                        <option key={month} value={index + 1}>{month}</option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-gray-500">
                  {audienceOptions.find((option) => option.value === form.audience)?.help} Somente clientes que aceitaram campanhas recebem a notificação.
                </div>
              </div>

              <div className="border-t border-gray-100 bg-gray-50 p-3">
                <button disabled={submitting} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60" style={{ backgroundColor: primaryColor }}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? 'Enviando...' : 'Enviar campanha agora'}
                </button>
              </div>
            </form>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Campanhas enviadas</h3>
                  <p className="mt-0.5 text-xs text-gray-500">Acompanhe o resultado dos últimos envios.</p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadCampaigns()}
                  disabled={loadingCampaigns}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  title="Atualizar campanhas"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingCampaigns ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>

              {loadingCampaigns && campaigns.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: primaryColor }} />
                  Carregando campanhas...
                </div>
              ) : campaigns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Campanha</th>
                        <th className="px-3 py-2.5 text-left">Status</th>
                        <th className="px-3 py-2.5 text-right">Dispositivos</th>
                        <th className="px-3 py-2.5 text-right">Enviadas</th>
                        <th className="px-4 py-2.5 text-right">Falhas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {campaigns.map((campaign) => (
                        <tr key={campaign.id} className="transition-colors hover:bg-gray-50/70">
                          <td className="px-4 py-3">
                            <div className="max-w-[260px] truncate font-semibold text-gray-800">{campaign.title}</div>
                            <div className="mt-0.5 text-[11px] text-gray-400">{formatDate(campaign.created_at)} · {audienceLabel(campaign.audience)}</div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold" style={statusStyles[campaign.status] || statusStyles.draft}>
                              {statusLabels[campaign.status] || campaign.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-medium text-gray-600">{campaign.total_devices || 0}</td>
                          <td className="px-3 py-3 text-right font-semibold text-green-700">{campaign.total_sent || 0}</td>
                          <td className="px-4 py-3 text-right font-semibold text-red-600">{campaign.total_failed || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-300"><Megaphone className="h-6 w-6" /></div>
                  <h3 className="text-sm font-semibold text-gray-800">Nenhuma campanha enviada</h3>
                  <p className="mt-1 text-xs text-gray-500">Crie a primeira campanha usando o formulário ao lado.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
