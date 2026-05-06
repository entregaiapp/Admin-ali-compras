import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { 
  ArrowLeft, MapPin, Package, Clock, Navigation, 
  Sparkles, RotateCcw, Check, AlertTriangle, 
  Phone, CheckCircle2, Trophy, FileText, X,
  ChevronRight, Loader2
} from 'lucide-react';
import api from '../../services/api';
import { DriverRoute, DriverStop } from './MyDeliveries';

const statusStyles: Record<string, string> = {
  'planned': 'bg-amber-100 text-amber-800',
  'in_progress': 'bg-indigo-100 text-indigo-800',
  'completed': 'bg-green-100 text-green-800',
  'canceled': 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  'planned': 'Aguardando rota',
  'in_progress': 'Em andamento',
  'completed': 'Concluída',
  'canceled': 'Cancelada',
};

const stopStatusStyles: Record<string, string> = {
  'pending': 'bg-gray-100 text-gray-700',
  'delivered': 'bg-green-100 text-green-800',
  'failed': 'bg-red-100 text-red-800',
};

export function RouteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [route, setRoute] = useState<DriverRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [problemStop, setProblemStop] = useState<DriverStop | null>(null);

  useEffect(() => {
    fetchRouteDetails();
  }, [id]);

  const fetchRouteDetails = async () => {
    try {
      setLoading(true);
      
      if (id?.startsWith('delivery-')) {
        const realId = id.replace('delivery-', '');
        const response = await api.get(`/entregas/${realId}`);
        const d = response.data.data || response.data;
        
        // Map individual delivery to route format
        setRoute({
          id: `delivery-${d.id}`,
          real_id: d.id,
          routeName: `Pedido #${d.numero_pedido || d.id.slice(0, 8)}`,
          status: d.status === 'atribuida' ? 'planned' : (d.status === 'saiu_para_entrega' ? 'in_progress' : (d.status === 'entregue' ? 'completed' : 'canceled')),
          createdAt: d.criado_em,
          stopCount: 1,
          is_route: false,
          googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${d.endereco_latitude},${d.endereco_longitude}`,
          stops: [{
            id: d.id,
            orderId: d.numero_pedido || d.id,
            customerName: d.cliente_nome || 'Cliente',
            customerPhone: d.cliente_telefone || '',
            address: `${d.endereco_logradouro}, ${d.endereco_numero}`,
            neighborhood: d.endereco_bairro || '',
            latitude: parseFloat(d.endereco_latitude) || 0,
            longitude: parseFloat(d.endereco_longitude) || 0,
            status: d.status === 'entregue' ? 'delivered' : (d.status === 'falhou' ? 'failed' : 'pending'),
            sequence: 1,
            problemReason: d.observacoes
          }]
        });
      } else {
        const response = await api.get(`/delivery-routes/${id}`);
        // Backend returns: { route: {...}, stops: [...] }
        setRoute({
          ...response.data.route,
          stops: response.data.stops,
          stopCount: response.data.stops?.length || 0,
          is_route: true
        });
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes da rota:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRoute = async () => {
    try {
      setUpdating('start');
      if (id?.startsWith('delivery-')) {
        const realId = id.replace('delivery-', '');
        await api.patch(`/entregas/${realId}/sair-para-entrega`);
      } else {
        await api.patch(`/delivery-routes/${id}/start`);
      }
      setRoute(prev => prev ? { ...prev, status: 'in_progress' } : null);
    } catch (err) {
      console.error('Erro ao iniciar rota:', err);
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateStatus = async (stopId: string, status: 'delivered' | 'failed', reason?: string) => {
    try {
      setUpdating(stopId);
      
      if (id?.startsWith('delivery-')) {
        const realId = id.replace('delivery-', '');
        const endpoint = status === 'delivered' ? 'entregar' : 'falhar';
        await api.patch(`/entregas/${realId}/${endpoint}`, { observacoes: reason });
      } else {
        await api.patch(`/delivery-route-stops/${stopId}/check`, {
          status,
          reason
        });
      }
      
      // Update local state
      setRoute(prev => {
        if (!prev || !prev.stops) return prev;
        const newStops = prev.stops.map(s => {
          if (s.id === stopId) {
            return {
              ...s,
              status,
              problemReason: reason,
              finishedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
          }
          return s;
        });

        // Check if all finished
        const allFinished = newStops.every(s => s.status !== 'pending');
        return {
          ...prev,
          status: allFinished ? 'completed' : prev.status,
          stops: newStops
        };
      });
      
      setProblemStop(null);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 text-[#122a4c] animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Carregando detalhes da rota...</p>
      </div>
    );
  }

  if (!route) return null;

  const allFinished = route.status === 'completed';
  const doneCount = route.stops?.filter(s => s.status === 'delivered').length || 0;
  const pendingCount = route.stops?.filter(s => s.status === 'pending').length || 0;
  const problemCount = route.stops?.filter(s => s.status === 'failed').length || 0;

  return (
    <div className="pb-32 min-h-full bg-gray-50 overflow-y-auto">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-30 px-3 py-3 flex items-center gap-3">
        <button 
          onClick={() => navigate('/driver')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 leading-none">
            {route.is_route ? 'Rota' : 'Entrega'}
          </span>
          <h1 className="font-bold text-gray-800 -mt-0.5 truncate max-w-[150px]">
            {route.routeName || `Entrega #${route.id.slice(0, 4)}`}
          </h1>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusStyles[route.status]}`}>
          {statusLabels[route.status]}
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Resumo Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Entregas</span>
              <p className="text-lg font-bold text-gray-800">{route.stops?.length}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Concluídas</span>
              <p className="text-lg font-bold text-green-600">{doneCount}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Pendentes</span>
              <p className="text-lg font-bold text-amber-600">{pendingCount}</p>
            </div>
          </div>

          {(route.totalDistanceKm && route.totalDistanceKm !== '--') || (route.totalDurationText && route.totalDurationText !== '--') ? (
            <div className="pt-4 border-t border-gray-100 flex justify-between text-[11px] font-medium text-gray-500">
              <div className="flex items-center gap-4 shrink-0">
                {route.totalDistanceKm && route.totalDistanceKm !== '--' && (
                  <div className="flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-gray-300" />
                    <span>{route.totalDistanceKm} km</span>
                  </div>
                )}
                {route.totalDurationText && route.totalDurationText !== '--' && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-300" />
                    <span>{route.totalDurationText}</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Banner Rota Finalizada */}
        {allFinished && (
          <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-5 text-center space-y-2">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-1">
              <Trophy className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-green-800">Rota finalizada!</h2>
            <p className="text-sm text-green-700 font-medium">
              {doneCount} entregues · {problemCount} com problema
            </p>
          </div>
        )}

        {/* Iniciar Rota Button */}
        {route.status === 'planned' && (
          <button 
            onClick={handleStartRoute}
            disabled={updating === 'start'}
            className="w-full bg-[#122a4c] hover:bg-[#1a3b6a] disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all"
          >
            {updating === 'start' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>{route.is_route ? 'Iniciar Rota' : 'Sair para Entrega'}</span>
              </>
            )}
          </button>
        )}

        {/* Paradas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-gray-700">Sequência de entregas</h3>
          </div>

          <div className="space-y-4">
            {route.stops?.map((stop, index) => (
              <div 
                key={stop.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm space-y-4 transition-all ${
                  stop.status === 'delivered' ? 'border-green-200 bg-green-50/30 opacity-75' :
                  stop.status === 'failed' ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                    stop.status === 'delivered' ? 'bg-green-600 text-white' :
                    stop.status === 'failed' ? 'bg-red-600 text-white' :
                    'bg-[#122a4c] text-white'
                  }`}>
                    {stop.status === 'delivered' ? <Check className="w-4 h-4" /> :
                     stop.status === 'failed' ? <AlertTriangle className="w-4 h-4" /> :
                     stop.sequence}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-gray-800 truncate">{stop.customerName}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight ${stopStatusStyles[stop.status]}`}>
                        {stop.status === 'pending' ? 'Pendente' : stop.status === 'delivered' ? 'Entregue' : 'Problema'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pedido {stop.orderId.slice(0, 8)}</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                    <span>{stop.address} — {stop.neighborhood}</span>
                  </div>
                  
                  <a href={`tel:${stop.customerPhone}`} className="flex items-center gap-2.5 text-sm text-blue-600 font-bold w-fit">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>{stop.customerPhone}</span>
                  </a>

                  {stop.problemReason && (
                    <div className="p-3 rounded-xl bg-red-100 border border-red-200 text-xs text-red-800 font-bold">
                      Motivo: {stop.problemReason}
                    </div>
                  )}

                  {stop.status !== 'pending' && stop.finishedAt && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Finalizado às {stop.finishedAt}
                    </div>
                  )}
                </div>

                {stop.status === 'pending' && route.status === 'in_progress' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                      onClick={() => handleUpdateStatus(stop.id, 'delivered')}
                      disabled={!!updating}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-50"
                    >
                      {updating === stop.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Entregue</span>
                    </button>
                    <button 
                      onClick={() => setProblemStop(stop)}
                      disabled={!!updating}
                      className="border-2 border-red-200 text-red-700 hover:bg-red-50 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-50"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Problema</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Google Maps Fixed Button */}
      {route.status === 'in_progress' && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
          <div className="max-w-3xl mx-auto">
            <a 
              href={route.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#122a4c] hover:bg-[#1a3b6a] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all no-underline"
            >
              <Navigation className="w-5 h-5" />
              <span>Ir para o Google Maps</span>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </a>
          </div>
        </div>
      )}

      {/* Bottom Sheet Problema */}
      {problemStop && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Problema na entrega</h3>
              </div>
              <button 
                onClick={() => setProblemStop(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-500 font-medium">Selecione o motivo para <span className="text-gray-800 font-bold">{problemStop.customerName}</span>:</p>
              
              <div className="grid gap-2">
                {[
                  'Cliente ausente',
                  'Endereço não encontrado',
                  'Cliente recusou',
                  'Produto divergente',
                  'Outro motivo'
                ].map(reason => (
                  <button
                    key={reason}
                    onClick={() => handleUpdateStatus(problemStop.id, 'failed', reason)}
                    className="w-full text-left px-4 py-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-bold text-gray-700 transition-all active:bg-gray-100"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
