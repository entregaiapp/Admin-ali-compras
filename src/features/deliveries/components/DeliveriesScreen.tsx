import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Clock, Loader2, MapPin, Package, RefreshCw, Route, Truck, User } from 'lucide-react';
import api from '@/shared/lib/api';
import { dateInputInBrasilia, formatBrasiliaDate } from '@/shared/lib/dateTime';
import { showSystemNotice } from '@/shared/components/SystemToast';

const PRIMARY = '#122a4c';
const API_ROUTES_PER_PAGE = 100;

const tabs = ['Todos', 'Aguardando rota', 'Rota gerada', 'Em andamento', 'Concluída'];
const periodTabs = [
  { value: 'today', label: 'Entregas de hoje' },
  { value: 'other', label: 'Outras entregas' },
] as const;

type PeriodTab = typeof periodTabs[number]['value'];

const getApiList = (payload: any): any[] => {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const getApiTotalPages = (payload: any) => {
  const totalPages = payload?.total_pages ?? payload?.totalPages ?? payload?.data?.total_pages ?? payload?.data?.totalPages;
  const parsed = Number(totalPages || 1);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const getRouteLabel = (route: any) => {
  if (route.status === 'completed') return 'Concluída';
  if (route.status === 'canceled') return 'Cancelada';
  if (!route.optimized) return 'Aguardando rota';
  if (route.status === 'in_progress') return 'Em andamento';
  return 'Rota gerada';
};

const getRouteStyle = (label: string) => {
  if (label === 'Aguardando rota') return { bg: '#fef3c7', text: '#92400e', icon: Package };
  if (label === 'Rota gerada') return { bg: '#eff6ff', text: '#2563eb', icon: Route };
  if (label === 'Em andamento') return { bg: '#fff7ed', text: '#ea580c', icon: Truck };
  if (label === 'Concluída') return { bg: '#f0fdf4', text: '#16a34a', icon: CheckCircle2 };
  return { bg: '#fef2f2', text: '#dc2626', icon: AlertTriangle };
};

const getRouteName = (route: any) => (
  route.routeName || route.route_name || `Entrega ${String(route.id || '').slice(0, 8)}`
);

const getNeighborhoods = (route: any) => {
  if (Array.isArray(route.neighborhoods) && route.neighborhoods.length > 0) {
    return route.neighborhoods.join(', ');
  }

  return route.neighborhood_group || 'Sem bairro informado';
};

const getStopsCount = (route: any) => (
  Number(route.totalStops ?? route.stops_count ?? route.stops?.length ?? 0) || 0
);

const getPendingCount = (route: any) => (
  Number(route.pendingCount ?? route.stops?.filter((stop: any) => stop.status === 'pending').length ?? 0) || 0
);

const getDeliveredCount = (route: any) => (
  Number(route.deliveredCount ?? route.stops?.filter((stop: any) => stop.status === 'delivered').length ?? 0) || 0
);

const getRouteDate = (route: any) => (
  route.createdAt || route.created_at || route.startedAt || route.started_at || null
);

const getRouteDateInput = (route: any) => {
  const routeDate = getRouteDate(route);
  if (!routeDate) return '';

  try {
    return dateInputInBrasilia(routeDate);
  } catch (error) {
    return '';
  }
};

const getRelativeDateInput = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateInputInBrasilia(date);
};

const getStops = (route: any) => (
  Array.isArray(route.stops) ? route.stops : []
);

const getStopStatusLabel = (status: string) => {
  if (status === 'delivered') return 'Entregue';
  if (status === 'failed') return 'Falhou';
  return 'Pendente';
};

const getStopStatusStyle = (status: string) => {
  if (status === 'delivered') return { bg: '#f0fdf4', text: '#16a34a' };
  if (status === 'failed') return { bg: '#fef2f2', text: '#dc2626' };
  return { bg: '#fffbeb', text: '#d97706' };
};

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return `rgba(18, 42, 76, ${alpha})`;

  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function DeliveriesScreen() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [periodTab, setPeriodTab] = useState<PeriodTab>('today');
  const [tab, setTab] = useState('Todos');
  const [startDate, setStartDate] = useState(() => getRelativeDateInput(-7));
  const [endDate, setEndDate] = useState(() => getRelativeDateInput(-1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRouteId, setUpdatingRouteId] = useState<string | null>(null);
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});
  const [loadingRouteDetails, setLoadingRouteDetails] = useState<Record<string, boolean>>({});
  const [primaryColor, setPrimaryColor] = useState(PRIMARY);

  const user = (() => {
    try {
      const userJson = localStorage.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
      return null;
    }
  })();

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);
      const firstResponse = await api.get('/delivery-routes', {
        params: { page: 1, perPage: API_ROUTES_PER_PAGE },
      });
      const totalPages = getApiTotalPages(firstResponse.data);
      const remainingResponses = totalPages > 1
        ? await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) => (
            api.get('/delivery-routes', {
              params: { page: index + 2, perPage: API_ROUTES_PER_PAGE },
            })
          ))
        )
        : [];

      setRoutes([
        ...getApiList(firstResponse.data),
        ...remainingResponses.flatMap(response => getApiList(response.data)),
      ]);
    } catch (err) {
      console.error('Error fetching delivery routes:', err);
      setError('Não foi possível carregar as entregas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  useEffect(() => {
    if (!user?.loja_id) return;

    api.get(`/lojas/${user.loja_id}/configuracoes`)
      .then((res) => {
        const config = res.data?.data || res.data;
        if (config?.cor_primaria) setPrimaryColor(config.cor_primaria);
      })
      .catch(() => setPrimaryColor(PRIMARY));
  }, [user?.loja_id]);

  const todayInput = dateInputInBrasilia();
  const todayRoutes = useMemo(() => routes.filter((route) => (
    getRouteDateInput(route) === todayInput
  )), [routes, todayInput]);

  const otherRoutes = useMemo(() => routes.filter((route) => {
    const routeDateInput = getRouteDateInput(route);
    if (!routeDateInput) return false;

    const isOutsideToday = routeDateInput !== todayInput;
    const isAfterStart = !startDate || routeDateInput >= startDate;
    const isBeforeEnd = !endDate || routeDateInput <= endDate;
    return isOutsideToday && isAfterStart && isBeforeEnd;
  }), [routes, todayInput, startDate, endDate]);

  const periodFilteredRoutes = periodTab === 'today' ? todayRoutes : otherRoutes;

  const filtered = tab === 'Todos'
    ? periodFilteredRoutes
    : periodFilteredRoutes.filter(route => getRouteLabel(route) === tab);

  const stats = useMemo(() => ({
    waiting: periodFilteredRoutes.filter(route => getRouteLabel(route) === 'Aguardando rota').length,
    planned: periodFilteredRoutes.filter(route => getRouteLabel(route) === 'Rota gerada').length,
    running: periodFilteredRoutes.filter(route => getRouteLabel(route) === 'Em andamento').length,
    done: periodFilteredRoutes.filter(route => getRouteLabel(route) === 'Concluída').length,
  }), [periodFilteredRoutes]);

  const generateRoute = async (routeId: string) => {
    try {
      setUpdatingRouteId(routeId);
      await api.patch(`/delivery-routes/${routeId}/generate-optimized`);
      await fetchDeliveries();
    } catch (err) {
      console.error('Error generating route:', err);
      showSystemNotice('Não foi possível gerar a rota. Verifique se a loja e os endereços possuem coordenadas.');
    } finally {
      setUpdatingRouteId(null);
    }
  };

  const startRoute = async (routeId: string) => {
    try {
      setUpdatingRouteId(routeId);
      await api.patch(`/delivery-routes/${routeId}/start`);
      await fetchDeliveries();
    } catch (err) {
      console.error('Error starting route:', err);
      showSystemNotice('Não foi possível iniciar a entrega.');
    } finally {
      setUpdatingRouteId(null);
    }
  };

  const fetchRouteDetails = async (routeId: string) => {
    try {
      setLoadingRouteDetails((current) => ({ ...current, [routeId]: true }));
      const response = await api.get(`/delivery-routes/${routeId}`);
      const detail = response.data?.data || response.data;
      const routeDetail = detail?.route ? { ...detail.route, stops: detail.stops || [] } : detail;

      setRoutes((current) => current.map((route) => (
        route.id === routeId
          ? { ...route, ...routeDetail, stops: routeDetail?.stops || detail?.stops || [] }
          : route
      )));
    } catch (err) {
      console.error('Error fetching route details:', err);
      showSystemNotice('Não foi possível carregar os pedidos desta entrega.');
    } finally {
      setLoadingRouteDetails((current) => ({ ...current, [routeId]: false }));
    }
  };

  const toggleRoute = (route: any) => {
    const routeId = route.id;
    const willExpand = !expandedRoutes[routeId];

    setExpandedRoutes((current) => ({
      ...current,
      [routeId]: willExpand,
    }));

    if (willExpand && getStops(route).length === 0 && !loadingRouteDetails[routeId]) {
      fetchRouteDetails(routeId);
    }
  };

  return (
    <div className="p-5 space-y-5 overflow-y-auto flex-1 h-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }}></div>
        </div>
      )}

      <div className="-mx-5 -mt-5 border-b border-gray-200 bg-white px-5">
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Período das entregas">
          {periodTabs.map((period) => {
            const active = periodTab === period.value;
            const count = period.value === 'today'
              ? todayRoutes.length
              : otherRoutes.length;

            return (
              <button
                key={period.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setPeriodTab(period.value);
                  setTab('Todos');
                }}
                className={`relative isolate inline-flex min-w-36 items-center justify-center gap-2 overflow-hidden border-b-2 px-4 py-3 text-sm font-semibold transition-all duration-200 ${active ? 'text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                style={active ? { borderBottomColor: primaryColor, color: primaryColor } : undefined}
              >
                {active && (
                  <>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-7"
                      style={{
                        background: `linear-gradient(to top, ${hexToRgba(primaryColor, 0.13)} 0%, ${hexToRgba(primaryColor, 0.055)} 38%, ${hexToRgba(primaryColor, 0)} 100%)`,
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-3 bottom-0 h-1 blur-md"
                      style={{ backgroundColor: hexToRgba(primaryColor, 0.22) }}
                    />
                  </>
                )}
                <span className="relative z-10">{period.label}</span>
                {count > 0 && (
                  <span
                    className="relative z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-gray-900 font-semibold">Entregas</h2>
          <p className="text-sm text-gray-500 mt-0.5">Acompanhe as entregas criadas a partir dos pedidos.</p>
        </div>
        <button
          onClick={fetchDeliveries}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {periodTab === 'other' && (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <CalendarDays className="w-4 h-4" style={{ color: primaryColor }} />
              Período das outras entregas
            </div>
            <p className="text-xs text-gray-500 mt-1">Selecione o intervalo de datas que deseja consultar.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="text-xs font-medium text-gray-500">
              Data inicial
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-1 block h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-1"
              />
            </label>
            <label className="text-xs font-medium text-gray-500">
              Data final
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 block h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-1"
              />
            </label>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Aguardando rota', value: stats.waiting, color: '#92400e', bg: '#fef3c7' },
          { label: 'Rota gerada', value: stats.planned, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Em andamento', value: stats.running, color: '#ea580c', bg: '#fff7ed' },
          { label: 'Concluídas', value: stats.done, color: '#16a34a', bg: '#f0fdf4' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-2xl font-semibold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
            style={tab === t ? { backgroundColor: PRIMARY, color: 'white' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(route => {
          const label = getRouteLabel(route);
          const sc = getRouteStyle(label);
          const StatusIcon = sc.icon;
          const routeDate = getRouteDate(route);
          const googleMapsUrl = route.googleMapsUrl || route.google_maps_url;
          const routeId = route.id;
          const isUpdating = updatingRouteId === routeId;
          const isExpanded = Boolean(expandedRoutes[routeId]);
          const stops = getStops(route);
          const expandedStyle = isExpanded
            ? {
                borderColor: hexToRgba(primaryColor, 0.42),
                backgroundColor: hexToRgba(primaryColor, 0.06),
                boxShadow: `inset 4px 0 0 ${primaryColor}`,
              }
            : undefined;

          return (
            <div
              key={routeId}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow"
              style={expandedStyle}
            >
              <div
                className="flex items-start justify-between gap-3 p-4 cursor-pointer select-none"
                style={isExpanded ? { backgroundColor: hexToRgba(primaryColor, 0.10) } : undefined}
                onClick={() => toggleRoute(route)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleRoute(route);
                  }
                }}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: sc.bg }}>
                    <StatusIcon className="w-5 h-5" style={{ color: sc.text }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold" style={isExpanded ? { color: primaryColor } : { color: '#1f2937' }}>{getRouteName(route)}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: sc.bg, color: sc.text }}>
                        {label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5" />{getNeighborhoods(route)}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Package className="w-3.5 h-3.5" />{getStopsCount(route)} pedido{getStopsCount(route) !== 1 ? 's' : ''}
                      </div>
                      {(route.entregador_nome || route.driverName) && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <User className="w-3.5 h-3.5" />{route.entregador_nome || route.driverName}
                        </div>
                      )}
                      {routeDate && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          {formatBrasiliaDate(routeDate, { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-gray-500">
                      {isExpanded ? (
                        <>
                          <span>{getPendingCount(route)} pendentes</span>
                          <span>{getDeliveredCount(route)} concluídos</span>
                        </>
                      ) : (
                        <span>Clique para ver detalhes dos pedidos.</span>
                      )}
                      {(route.totalDistanceKm || route.total_distance_km) && <span>{String(route.totalDistanceKm || route.total_distance_km).replace('.', ',')} km</span>}
                      {(route.totalDurationText || route.total_duration_text) && <span>{route.totalDurationText || route.total_duration_text}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <div className="flex justify-end text-gray-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  {googleMapsUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 text-center"
                    >
                      Abrir Maps
                    </a>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  {loadingRouteDetails[routeId] ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando pedidos...
                    </div>
                  ) : stops.length === 0 ? (
                    <div className="text-sm text-gray-500 py-2">Nenhum pedido encontrado nesta entrega.</div>
                  ) : (
                    <div className="space-y-2">
                      {stops.map((stop: any, index: number) => {
                        const stopStyle = getStopStatusStyle(stop.status);
                        return (
                          <div
                            key={stop.id || stop.orderId || stop.pedido_id || index}
                            className="bg-white border rounded-lg px-3 py-2"
                            style={{ borderColor: hexToRgba(primaryColor, 0.16) }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-gray-400">#{stop.sequence || index + 1}</span>
                                  <span className="text-sm font-semibold text-gray-800">
                                    Pedido {stop.orderNumber || stop.order_number || stop.orderId || stop.pedido_id || ''}
                                  </span>
                                  <span
                                    className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                                    style={{ backgroundColor: stopStyle.bg, color: stopStyle.text }}
                                  >
                                    {getStopStatusLabel(stop.status)}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">{stop.customerName || stop.customer_name || 'Cliente não informado'}</div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span className="truncate">{stop.address || stop.address_snapshot || 'Endereço não informado'}</span>
                                </div>
                                {(stop.neighborhood || stop.bairro) && (
                                  <div className="text-[11px] text-gray-400 mt-0.5">{stop.neighborhood || stop.bairro}</div>
                                )}
                              </div>
                              {(stop.customerPhone || stop.customer_phone) && (
                                <div className="text-[11px] text-gray-500 whitespace-nowrap">{stop.customerPhone || stop.customer_phone}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Truck className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">
              {periodTab === 'today' ? 'Nenhuma entrega de hoje neste status' : 'Nenhuma entrega neste período e status'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
