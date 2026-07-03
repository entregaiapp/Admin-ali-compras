import { type TouchEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, CloudUpload, Inbox, Loader2, MapPin, Package, RefreshCw, WifiOff } from 'lucide-react';
import api from '@/shared/lib/api';
import {
  getCachedAssignedDeliveries,
  getPendingStopSync,
  isDriverOnline,
  synchronizePendingStops,
} from '../driverOfflineSync';

const PRIMARY = '#122a4c';
const DELIVERIES_PER_PAGE = 5;
const PULL_REFRESH_THRESHOLD = 52;

type DeliveryCategory = 'pending' | 'completed';

export type DriverStop = {
  id: string;
  orderId: string;
  orderNumber?: string;
  sequence: number;
  customerName: string;
  customerPhone: string;
  address: string;
  neighborhood: string;
  latitude: number | null;
  longitude: number | null;
  status: 'pending' | 'delivered' | 'failed';
  requiresReceiptKey?: boolean;
  note?: string;
  failedReason?: string;
  checkedAt?: string;
  finishedAt?: string;
};

export type DriverRoute = {
  id: string;
  status: 'planned' | 'in_progress' | 'completed' | 'canceled';
  routeName: string;
  optimized: boolean;
  requiresReceiptKey?: boolean;
  neighborhoods: string[];
  totalStops: number;
  pendingCount: number;
  deliveredCount: number;
  failedCount?: number;
  totalDistanceKm?: string | null;
  totalDurationText?: string | null;
  googleMapsUrl?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  stops: DriverStop[];
};

const getApiList = (payload: any): any[] => {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

export const getDeliveryLabel = (route: Pick<DriverRoute, 'status' | 'optimized'>) => {
  if (route.status === 'completed') return 'Concluída';
  if (route.status === 'canceled') return 'Cancelada';
  if (!route.optimized) return 'Aguardando rota';
  if (route.status === 'in_progress') return 'Em andamento';
  return 'Rota gerada';
};

const getStatusStyle = (route: DriverRoute) => {
  const label = getDeliveryLabel(route);
  if (label === 'Aguardando rota') return { bg: '#fef3c7', color: '#92400e' };
  if (label === 'Rota gerada') return { bg: '#dbeafe', color: '#1e40af' };
  if (label === 'Em andamento') return { bg: '#e0e7ff', color: '#3730a3' };
  if (label === 'Concluída') return { bg: '#dcfce7', color: '#166534' };
  return { bg: '#fee2e2', color: '#991b1b' };
};

const sortDeliveries = (routes: DriverRoute[]) => (
  [...routes].sort((a, b) => {
    const weight = (route: DriverRoute) => {
      if (route.status === 'completed') return 3;
      if (!route.optimized) return 1;
      return 2;
    };
    return weight(a) - weight(b) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  })
);

const getActionLabel = (route: DriverRoute) => {
  const label = getDeliveryLabel(route);
  if (label === 'Aguardando rota') return 'Abrir entregas';
  if (label === 'Concluída') return 'Ver resumo';
  if (label === 'Cancelada') return 'Ver detalhes';
  return 'Continuar rota';
};

export function MyDeliveriesScreen() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<DriverRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [activeCategory, setActiveCategory] = useState<DeliveryCategory>('pending');
  const [pages, setPages] = useState<Record<DeliveryCategory, number>>({ pending: 1, completed: 1 });
  const [totalPages, setTotalPages] = useState(1);
  const [totals, setTotals] = useState<Record<DeliveryCategory, number>>({ pending: 0, completed: 0 });
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(isDriverOnline());
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const touchStartYRef = useRef<number | null>(null);
  const activePage = pages[activeCategory];

  const fetchDeliveries = useCallback(async ({ refresh = false }: { refresh?: boolean } = {}) => {
    try {
      if (!isDriverOnline()) {
        const cachedRoutes = await getCachedAssignedDeliveries();
        const cachedRoutesForCategory = cachedRoutes.filter(route => (
          activeCategory === 'completed'
            ? route.status === 'completed'
            : route.status !== 'completed' && route.status !== 'canceled'
        ));
        setOnline(false);
        setError(null);
        setRoutes(sortDeliveries(cachedRoutesForCategory));
        setTotalPages(1);
        setTotals({
          pending: cachedRoutes.filter(route => route.status !== 'completed' && route.status !== 'canceled').length,
          completed: cachedRoutes.filter(route => route.status === 'completed').length,
        });
        return;
      }

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
        setRoutes([]);
      }
      setError(null);
      const syncResult = await synchronizePendingStops(api).catch(() => null);
      if (syncResult) setPendingSyncCount(syncResult.remaining);
      const response = await api.get('/delivery-routes/my-deliveries', {
        params: {
          category: activeCategory,
          page: activePage,
          per_page: DELIVERIES_PER_PAGE,
        },
      });
      const nextTotalPages = Math.max(1, Number(response.data?.total_pages) || 1);
      setRoutes(sortDeliveries(getApiList(response.data) as DriverRoute[]));
      setTotalPages(nextTotalPages);
      setTotals({
        pending: Number(response.data?.totals?.pending) || 0,
        completed: Number(response.data?.totals?.completed) || 0,
      });
      if (activePage > nextTotalPages) {
        setPages((current) => ({ ...current, [activeCategory]: nextTotalPages }));
      }
      setOnline(true);
    } catch (err) {
      console.error('Erro ao buscar entregas:', err);
      if (!err?.response) {
        const cachedRoutes = await getCachedAssignedDeliveries().catch(() => []);
        const cachedRoutesForCategory = cachedRoutes.filter(route => (
          activeCategory === 'completed'
            ? route.status === 'completed'
            : route.status !== 'completed' && route.status !== 'canceled'
        ));
        setOnline(false);
        setRoutes(sortDeliveries(cachedRoutesForCategory));
        setTotalPages(1);
        setTotals({
          pending: cachedRoutes.filter(route => route.status !== 'completed' && route.status !== 'canceled').length,
          completed: cachedRoutes.filter(route => route.status === 'completed').length,
        });
        setError(cachedRoutes.length ? null : 'Não foi possível carregar suas entregas e ainda não há entregas salvas offline.');
        return;
      }
      setError('Não foi possível carregar suas entregas. Tente novamente.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setHasLoaded(true);
    }
  }, [activeCategory, activePage]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  useEffect(() => {
    void getPendingStopSync()
      .then(items => setPendingSyncCount(items.length))
      .catch(() => setPendingSyncCount(0));

    const handleOffline = () => setOnline(false);
    const handleOnline = () => {
      setOnline(true);
      void fetchDeliveries({ refresh: true });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchDeliveries]);

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const scrollContainer = event.currentTarget.closest('main');
    if ((scrollContainer?.scrollTop || 0) > 0) {
      touchStartYRef.current = null;
      return;
    }

    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (isRefreshing || touchStartYRef.current === null) return;

    const scrollContainer = event.currentTarget.closest('main');
    const deltaY = (event.touches[0]?.clientY ?? 0) - touchStartYRef.current;
    const isAtTop = (scrollContainer?.scrollTop || 0) <= 0;

    if (!isAtTop || deltaY <= 0) {
      setPullDistance(0);
      return;
    }

    if (deltaY > 8) {
      event.preventDefault();
      setPullDistance(Math.min(deltaY * 0.45, 64));
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(() => {
    const shouldRefresh = pullDistance >= PULL_REFRESH_THRESHOLD;
    touchStartYRef.current = null;
    setPullDistance(0);

    if (shouldRefresh) {
      void fetchDeliveries({ refresh: true });
    }
  }, [fetchDeliveries, pullDistance]);

  const changePage = (nextPage: number) => {
    setPages((current) => ({
      ...current,
      [activeCategory]: Math.min(totalPages, Math.max(1, nextPage)),
    }));
  };

  if (loading && !hasLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 text-[#122a4c] animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Carregando suas entregas...</p>
      </div>
    );
  }

  return (
    <div
      className="px-4 py-4 space-y-4 max-w-2xl mx-auto pb-8"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{ overscrollBehaviorY: 'contain' }}
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-[height]"
          style={{ height: isRefreshing ? '36px' : `${pullDistance}px` }}
        >
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
            <RefreshCw className={isRefreshing ? 'animate-spin' : ''} size={15} color={PRIMARY} />
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold text-gray-900">Minhas Entregas</h2>
          <span className="text-[11px] font-medium text-gray-400">Puxe para baixo para atualizar</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              aria-pressed={activeCategory === 'pending'}
              onClick={() => setActiveCategory('pending')}
              className={`rounded-2xl border bg-amber-50 p-3 text-left transition-all ${
                activeCategory === 'pending' ? 'border-amber-400 shadow-sm ring-2 ring-amber-100' : 'border-amber-100'
              }`}
            >
              <div className="text-xs font-semibold uppercase text-amber-700">Pendentes</div>
              <div className="text-2xl font-bold text-amber-800">{totals.pending}</div>
            </button>
            <button
              type="button"
              aria-pressed={activeCategory === 'completed'}
              onClick={() => setActiveCategory('completed')}
              className={`rounded-2xl border bg-green-50 p-3 text-left transition-all ${
                activeCategory === 'completed' ? 'border-green-400 shadow-sm ring-2 ring-green-100' : 'border-green-100'
              }`}
            >
              <div className="text-xs font-semibold uppercase text-green-700">Concluídas</div>
              <div className="text-2xl font-bold text-green-800">{totals.completed}</div>
            </button>
        </div>
      </div>

      {!online && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl text-sm font-medium flex items-start gap-3">
          <WifiOff className="w-5 h-5 shrink-0 mt-0.5" />
          <p>Você está offline. As entregas já salvas continuam disponíveis e as confirmações serão sincronizadas automaticamente quando a conexão voltar.</p>
        </div>
      )}

      {online && pendingSyncCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-2xl text-sm font-medium flex items-start gap-3">
          <CloudUpload className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{pendingSyncCount} confirmação(ões) aguardando sincronização automática.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-medium text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#122a4c]" />
            Carregando entregas...
          </div>
        ) : routes.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Inbox className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-1 font-semibold text-gray-800">
              {activeCategory === 'pending' ? 'Nenhuma entrega pendente' : 'Nenhuma entrega concluída'}
            </h3>
            <p className="max-w-sm text-sm text-gray-500">
              {activeCategory === 'pending'
                ? 'Quando o mercado atribuir uma nova entrega, ela aparecerá aqui.'
                : 'As entregas finalizadas aparecerão aqui.'}
            </p>
          </div>
        ) : routes.map((route) => {
          const style = getStatusStyle(route);
          const label = getDeliveryLabel(route);
          const neighborhoods = route.neighborhoods?.length ? route.neighborhoods.join(', ') : 'Sem bairro';

          return (
            <button
              key={route.id}
              onClick={() => navigate(`/driver/route/${encodeURIComponent(route.id)}`)}
              className="w-full text-left bg-white rounded-2xl border border-gray-200 p-4 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">Entrega</div>
                  <div className="font-semibold text-gray-900 truncate">{route.routeName || `Entrega ${route.id.slice(0, 8)}`}</div>
                </div>
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
                  style={{ backgroundColor: style.bg, color: style.color }}
                >
                  {label}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{neighborhoods}</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 mb-3">
                <span className="inline-flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-gray-400" />
                  {route.totalStops} pedidos
                </span>
                <span className="text-amber-700">{route.pendingCount} pendentes</span>
                <span className="text-green-700">{route.deliveredCount} concluídos</span>
                {route.totalDistanceKm ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {route.totalDistanceKm.toString().replace('.', ',')} km
                  </span>
                ) : (
                  <span className="text-gray-400">Distância não calculada</span>
                )}
                {route.totalDurationText && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {route.totalDurationText}
                  </span>
                )}
              </div>

              <div
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: PRIMARY }}
              >
                <span>{getActionLabel(route)}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          );
        })}
      </div>

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-3">
          <button
            type="button"
            onClick={() => changePage(activePage - 1)}
            disabled={activePage <= 1}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-2 text-xs font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </button>
          <span className="text-xs font-medium text-gray-500">
            Página {activePage} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => changePage(activePage + 1)}
            disabled={activePage >= totalPages}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-2 text-xs font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próxima
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
