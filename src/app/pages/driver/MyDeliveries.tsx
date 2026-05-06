import { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Package, CheckCircle2, Clock, Inbox,
  Loader2, AlertTriangle, RotateCcw, Navigation, ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DriverStop = {
  id: string;
  orderId: string;
  routeId?: string;
  sequence: number;
  customerName: string;
  customerPhone: string;
  address: string;
  neighborhood: string;
  latitude: number | null;
  longitude: number | null;
  status: 'pending' | 'delivered' | 'failed';
  failedReason?: string;
  checkedAt?: string;
  problemReason?: string;
  finishedAt?: string;
};

export type DriverRoute = {
  id: string;
  real_id?: string;
  routeName: string;
  status: string;
  createdAt: string;
  stopCount: number;
  is_route: boolean;
  googleMapsUrl?: string;
  stops?: DriverStop[];
  totalDistanceKm?: string;
  totalDurationText?: string;
};

export type NeighborhoodGroup = {
  neighborhood: string;
  routeId: string;
  routeName: string;
  routeStatus: string;
  totalStops: number;
  pendingCount: number;
  deliveredCount: number;
  googleMapsUrl: string | null;
  stops: DriverStop[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pendente',   className: 'bg-amber-100 text-amber-700',  icon: <Clock className="w-3.5 h-3.5" /> },
  delivered: { label: 'Entregue',   className: 'bg-green-100 text-green-700',  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  failed:    { label: 'Falhou',     className: 'bg-red-100 text-red-700',      icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

// ─── Stop Card ────────────────────────────────────────────────────────────────

function StopCard({ stop }: { stop: DriverStop }) {
  const s = statusConfig[stop.status] ?? statusConfig.pending;
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-800 truncate">{stop.customerName}</p>
          <p className="text-xs text-gray-500 truncate">{stop.address}</p>
        </div>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full shrink-0 uppercase tracking-tight ${s.className}`}>
          {s.icon} {s.label}
        </span>
      </div>
      {stop.customerPhone && (
        <a
          href={`tel:${stop.customerPhone}`}
          className="text-xs text-[#122a4c] font-semibold underline"
          onClick={(e) => e.stopPropagation()}
        >
          {stop.customerPhone}
        </a>
      )}
    </div>
  );
}

// ─── Neighborhood Card ────────────────────────────────────────────────────────

function NeighborhoodCard({ group }: { group: NeighborhoodGroup }) {
  const [expanded, setExpanded] = useState(false);
  const allDone = group.pendingCount === 0;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${allDone ? 'border-green-200' : 'border-gray-200'}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${allDone ? 'bg-green-100' : 'bg-[#e8eef5]'}`}>
              <MapPin className={`w-5 h-5 ${allDone ? 'text-green-600' : 'text-[#122a4c]'}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Bairro</p>
              <h2 className="text-base font-bold text-gray-800 truncate leading-tight">
                {group.neighborhood}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {allDone ? (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 uppercase tracking-tight">
                Concluído
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 uppercase tracking-tight">
                {group.pendingCount} pendente{group.pendingCount !== 1 ? 's' : ''}
              </span>
            )}
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
          <div className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5" />
            <span>{group.totalStops} entrega{group.totalStops !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{group.deliveredCount} entregue{group.deliveredCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </button>

      {/* Expandable stops list */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {group.stops.map((stop) => (
            <StopCard key={stop.id} stop={stop} />
          ))}
        </div>
      )}

      {/* CTA footer */}
      <div className={`px-4 py-3 flex items-center justify-between gap-2 ${allDone ? 'bg-green-600' : 'bg-[#122a4c]'}`}>
        <span className="text-white font-bold text-sm">
          {allDone ? 'Bairro concluído ✓' : 'Traçar rota no Maps'}
        </span>
        {!allDone && group.googleMapsUrl ? (
          <a
            href={group.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 bg-white text-[#122a4c] text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
          >
            <Navigation className="w-3.5 h-3.5" />
            Abrir Maps
          </a>
        ) : !allDone ? (
          <span className="text-white/60 text-xs">Sem coordenadas</span>
        ) : null}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MyDeliveries() {
  const [groups, setGroups] = useState<NeighborhoodGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();

  const fetchNeighborhoods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Optionally include GPS coords so Maps URLs use the driver's live position
      let params: Record<string, string> = {};
      if (navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              params.lat = pos.coords.latitude.toString();
              params.lng = pos.coords.longitude.toString();
              resolve();
            },
            () => resolve(), // geolocation denied – continue without coords
            { timeout: 4000 }
          );
        });
      }

      const res = await api.get('/delivery-routes/my-neighborhoods', { params });
      const data: NeighborhoodGroup[] = res.data?.data ?? [];
      setGroups(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Erro ao buscar entregas por bairro:', err);
      setError('Não foi possível carregar suas entregas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNeighborhoods();
  }, [fetchNeighborhoods]);

  const totalPending = groups.reduce((acc, g) => acc + g.pendingCount, 0);
  const totalDelivered = groups.reduce((acc, g) => acc + g.deliveredCount, 0);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 text-[#122a4c] animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Carregando suas entregas...</p>
      </div>
    );
  }

  // ── Page ─────────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-6 pb-24 sm:pb-8">

      {/* Greeting */}
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold text-gray-800">
          Olá, <span className="text-[#122a4c]">{user?.nome?.split(' ')[0] || 'Entregador'}</span>.
        </h1>
        <p className="text-gray-500 font-medium italic">Boas vindas!</p>
      </div>

      {/* Summary stats */}
      {groups.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-1">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Pendentes</p>
            <p className="text-3xl font-black text-amber-700">{totalPending}</p>
            <p className="text-xs text-amber-600">entrega{totalPending !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 space-y-1">
            <p className="text-xs font-bold text-green-600 uppercase tracking-wide">Entregues</p>
            <p className="text-3xl font-black text-green-700">{totalDelivered}</p>
            <p className="text-xs text-green-600">entrega{totalDelivered !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <h2 className="text-lg font-bold text-gray-700">Entregas por Bairro</h2>
        <button
          onClick={fetchNeighborhoods}
          className="flex items-center gap-1.5 text-xs text-[#122a4c] font-bold hover:underline"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Empty state */}
      {groups.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
            <Inbox className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-gray-800">Nenhuma entrega atribuída</h3>
            <p className="text-sm text-gray-500 max-w-[220px]">
              Quando o mercado atribuir entregas para você, elas aparecerão agrupadas por bairro.
            </p>
          </div>
        </div>
      )}

      {/* Neighborhood groups */}
      {groups.length > 0 && (
        <div className="grid gap-4">
          {groups.map((group) => (
            <NeighborhoodCard key={group.neighborhood} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
