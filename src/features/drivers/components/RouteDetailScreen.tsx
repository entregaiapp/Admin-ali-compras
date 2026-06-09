import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertTriangle, ArrowLeft, Check, CheckCircle2, Clock, FileText, Loader2,
  MapPin, Navigation, Package, Phone, Sparkles, Trophy, X,
} from 'lucide-react';
import api from '@/shared/lib/api';
import { DriverRoute, DriverStop, getDeliveryLabel } from './MyDeliveriesScreen';

const PRIMARY = '#122a4c';

const PROBLEM_REASONS = [
  'Cliente ausente',
  'Endereço não encontrado',
  'Cliente recusou',
  'Produto divergente',
  'Outro motivo',
];

const statusStyles: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#f3f4f6', color: '#374151' },
  delivered: { bg: '#dcfce7', color: '#166534' },
  failed: { bg: '#fee2e2', color: '#991b1b' },
};

const getRouteBadgeStyle = (route: DriverRoute) => {
  const label = getDeliveryLabel(route);
  if (label === 'Concluída') return { bg: '#dcfce7', color: '#166534' };
  if (label === 'Aguardando rota') return { bg: '#fef3c7', color: '#92400e' };
  if (label === 'Em andamento') return { bg: '#e0e7ff', color: '#3730a3' };
  return { bg: '#dbeafe', color: '#1e40af' };
};

const getApiErrorMessage = (error: any, fallback: string) => {
  const payload = error?.response?.data;
  const candidates = [
    payload?.message,
    payload?.error?.message,
    payload?.error,
    error?.message,
  ];

  const message = candidates.find((value) => typeof value === 'string' && value.trim());
  return message || fallback;
};

const getCurrentPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('Seu navegador não permite obter a localização atual.'));
    return;
  }

  navigator.geolocation.getCurrentPosition(resolve, (error) => {
    if (error.code === error.PERMISSION_DENIED) {
      reject(new Error('Permita o acesso à localização para gerar a rota a partir da sua posição atual.'));
      return;
    }

    reject(new Error('Não foi possível obter sua localização atual. Tente novamente.'));
  }, {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 60000,
  });
});

export function RouteDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [route, setRoute] = useState<DriverRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [problemFor, setProblemFor] = useState<DriverStop | null>(null);
  const [receiptKeyFor, setReceiptKeyFor] = useState<DriverStop | null>(null);
  const [receiptKey, setReceiptKey] = useState('');
  const [receiptKeyError, setReceiptKeyError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/delivery-routes/${decodeURIComponent(id)}`);
      setRoute({
        ...response.data.route,
        stops: response.data.stops || [],
      });
    } catch (err) {
      console.error('Erro ao buscar entrega:', err);
      setError('Não foi possível carregar esta entrega.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoute();
  }, [id]);

  const stats = useMemo(() => {
    const stops = route?.stops || [];
    const done = stops.filter(stop => stop.status === 'delivered').length;
    const problems = stops.filter(stop => stop.status === 'failed').length;
    return {
      total: stops.length,
      done,
      problems,
      pending: stops.length - done - problems,
    };
  }, [route]);

  const generateRoute = async () => {
    if (!route) return;
    try {
      setGenerating(true);
      setError(null);
      const position = await getCurrentPosition();
      const response = await api.patch(`/delivery-routes/${route.id}/generate-optimized`, {
        currentLatitude: position.coords.latitude,
        currentLongitude: position.coords.longitude,
      });
      setRoute({
        ...response.data.route,
        stops: response.data.stops || [],
      });
    } catch (err) {
      console.error('Erro ao gerar rota otimizada:', err);
      setError(getApiErrorMessage(err, 'Não foi possível gerar a rota otimizada.'));
    } finally {
      setGenerating(false);
    }
  };

  const updateStop = async (
    stop: DriverStop,
    status: 'delivered' | 'failed',
    reason?: string,
    chaveRecebimento?: string,
  ) => {
    try {
      setUpdating(stop.id);
      setError(null);
      setReceiptKeyError(null);
      await api.patch(`/delivery-route-stops/${stop.id}/check`, {
        status,
        reason,
        chave_recebimento: chaveRecebimento,
      });
      await fetchRoute();
      setProblemFor(null);
      setReceiptKeyFor(null);
      setReceiptKey('');
    } catch (err) {
      console.error('Erro ao atualizar parada:', err);
      const message = getApiErrorMessage(err, 'Não foi possível atualizar o pedido.');
      if (status === 'delivered') {
        setReceiptKeyError(message);
      } else {
        setError(message);
      }
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 text-[#122a4c] animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Carregando detalhes da entrega...</p>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-gray-600">{error || 'Entrega não encontrada.'}</p>
        <button onClick={() => navigate('/driver')} className="mt-4 text-sm font-medium" style={{ color: PRIMARY }}>
          Voltar
        </button>
      </div>
    );
  }

  const hasRoute = route.optimized;
  const allFinished = route.status === 'completed';
  const badge = getRouteBadgeStyle(route);
  const routeLabel = getDeliveryLabel(route);

  return (
    <div className="pb-28">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex items-center gap-3 px-3 py-3">
        <button onClick={() => navigate('/driver')} className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500">Entrega</div>
          <div className="font-semibold text-gray-900 truncate">{route.routeName || `Entrega ${route.id.slice(0, 8)}`}</div>
        </div>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
          style={{ backgroundColor: badge.bg, color: badge.color }}
        >
          {routeLabel}
        </span>
      </div>

      <div className="px-4 py-4 max-w-3xl mx-auto space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Stat label="Pedidos" value={stats.total} />
            <Stat label="Concluídos" value={stats.done} accent="#16a34a" />
            <Stat label="Pendentes" value={stats.pending} accent="#d97706" />
          </div>
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-xs">
            <Mini icon={<MapPin className="w-3.5 h-3.5" />} label="Bairros" value={route.neighborhoods?.join(', ') || 'Sem bairro'} />
            <Mini icon={<Navigation className="w-3.5 h-3.5" />} label="Distância" value={route.totalDistanceKm ? `${route.totalDistanceKm.toString().replace('.', ',')} km` : '-'} />
            <Mini icon={<Clock className="w-3.5 h-3.5" />} label="Tempo" value={route.totalDurationText || '-'} />
          </div>
        </div>

        {allFinished && (
          <div className="rounded-2xl border-2 p-4 text-center" style={{ borderColor: '#16a34a', backgroundColor: '#f0fdf4' }}>
            <Trophy className="w-8 h-8 mx-auto mb-2 text-green-700" />
            <div className="font-semibold text-green-900">Entrega finalizada</div>
            <div className="text-xs text-green-800 mt-0.5">
              {stats.done} entregues · {stats.problems} com problema
            </div>
          </div>
        )}

        {!hasRoute && (
          <button
            onClick={generateRoute}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-white font-semibold shadow-sm disabled:opacity-80"
            style={{ backgroundColor: PRIMARY }}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando rota...
              </>
            ) : (
              <>
                <Sparkles className="w-4.5 h-4.5" />
                Gerar rota otimizada
              </>
            )}
          </button>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              {hasRoute ? 'Sequência de entregas' : 'Pedidos da entrega'}
            </h3>
          </div>

          {(route.stops || []).map((stop, index) => (
            <StopCard
              key={stop.id}
              index={index + 1}
              stop={stop}
              hasRoute={hasRoute}
              disabled={!!updating || allFinished}
              updating={updating === stop.id}
              onDelivered={() => {
                setReceiptKeyFor(stop);
                setReceiptKey('');
                setReceiptKeyError(null);
              }}
              onProblem={() => setProblemFor(stop)}
            />
          ))}
        </div>
      </div>

      {hasRoute && route.googleMapsUrl && !allFinished && (
        <div className="fixed left-0 right-0 bottom-[60px] sm:bottom-[64px] px-4 pb-3 pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <a
              href={route.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-white font-semibold shadow-lg"
              style={{ backgroundColor: PRIMARY }}
            >
              <Navigation className="w-5 h-5" />
              Ir para o Google Maps
            </a>
          </div>
        </div>
      )}

      {problemFor && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50" onClick={() => setProblemFor(null)}>
          <div
            className="max-h-[calc(100dvh-1rem)] overflow-y-auto bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <h4 className="font-semibold text-gray-900">Problema na entrega</h4>
              </div>
              <button onClick={() => setProblemFor(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3">Selecione o motivo:</p>
            <div className="space-y-2">
              {PROBLEM_REASONS.map(reason => (
                <button
                  key={reason}
                  onClick={() => updateStop(problemFor, 'failed', reason)}
                  className="w-full text-left px-3 py-3 rounded-lg border border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-sm text-gray-800 font-medium"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {receiptKeyFor && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50" onClick={() => setReceiptKeyFor(null)}>
          <div
            className="max-h-[calc(100dvh-1rem)] overflow-y-auto bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-700" />
                <h4 className="font-semibold text-gray-900">Confirmar entrega</h4>
              </div>
              <button onClick={() => setReceiptKeyFor(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Solicite ao cliente a chave de recebimento de 4 dígitos.
            </p>
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={receiptKey}
              onChange={(event) => {
                setReceiptKey(event.target.value.replace(/\D/g, '').slice(0, 4));
                setReceiptKeyError(null);
              }}
              className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-2xl font-semibold tracking-[0.5em] outline-none focus:border-[#122a4c]"
              placeholder="0000"
              aria-label="Chave de recebimento"
            />
            {receiptKeyError && (
              <p className="mt-2 text-sm font-medium text-red-700">{receiptKeyError}</p>
            )}
            <button
              onClick={() => updateStop(receiptKeyFor, 'delivered', undefined, receiptKey)}
              disabled={receiptKey.length !== 4 || updating === receiptKeyFor.id}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-white font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {updating === receiptKeyFor.id && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar entrega
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold text-lg" style={{ color: accent ?? '#111827' }}>{value}</div>
    </div>
  );
}

function Mini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-gray-400 inline-flex items-center gap-1">{icon} {label}</div>
      <div className="text-gray-800 font-medium truncate">{value}</div>
    </div>
  );
}

function StopCard({
  index, stop, hasRoute, disabled, updating, onDelivered, onProblem,
}: {
  index: number;
  stop: DriverStop;
  hasRoute: boolean;
  disabled: boolean;
  updating: boolean;
  onDelivered: () => void;
  onProblem: () => void;
}) {
  const delivered = stop.status === 'delivered';
  const problem = stop.status === 'failed';
  const finished = delivered || problem;
  const style = statusStyles[stop.status] || statusStyles.pending;

  return (
    <div
      className="bg-white rounded-2xl border p-4 transition-colors"
      style={{
        borderColor: delivered ? '#bbf7d0' : problem ? '#fecaca' : '#e5e7eb',
        backgroundColor: delivered ? '#f0fdf4' : problem ? '#fef2f2' : 'white',
        opacity: delivered ? 0.85 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
          style={{
            backgroundColor: delivered ? '#16a34a' : problem ? '#dc2626' : PRIMARY,
            color: 'white',
          }}
        >
          {delivered ? <Check className="w-4 h-4" /> : problem ? <AlertTriangle className="w-4 h-4" /> : (hasRoute ? index : <Package className="w-4 h-4" />)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 truncate">{stop.customerName}</div>
              <div className="text-xs text-gray-500">Pedido {stop.orderNumber || String(stop.orderId).slice(0, 8)}</div>
            </div>
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ backgroundColor: style.bg, color: style.color }}
            >
              {stop.status === 'pending' ? 'Pendente' : stop.status === 'delivered' ? 'Entregue' : 'Problema'}
            </span>
          </div>

          <div className="mt-2 text-sm text-gray-700 flex items-start gap-1.5">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <span>{stop.address} - {stop.neighborhood}</span>
          </div>
          {stop.customerPhone && (
            <div className="mt-1 text-sm text-gray-600 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <a href={`tel:${stop.customerPhone.replace(/\D/g, '')}`} className="hover:underline">{stop.customerPhone}</a>
            </div>
          )}
          {stop.note && (
            <div className="mt-2 text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
              <span className="font-medium text-amber-800">Obs.: </span>{stop.note}
            </div>
          )}
          {problem && stop.failedReason && (
            <div className="mt-2 text-xs text-red-700 bg-red-100 rounded-md px-2 py-1.5">
              Motivo: {stop.failedReason}
            </div>
          )}
          {finished && stop.checkedAt && (
            <div className="mt-1.5 text-xs text-gray-500 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Confirmado
            </div>
          )}
        </div>
      </div>

      {!finished && hasRoute && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={onDelivered}
            disabled={disabled}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-white font-semibold text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Entregue
          </button>
          <button
            onClick={onProblem}
            disabled={disabled}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-semibold text-sm border-2 text-red-700 border-red-200 hover:bg-red-50 disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4" />
            Problema
          </button>
        </div>
      )}
    </div>
  );
}
