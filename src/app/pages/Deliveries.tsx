import { useState, useEffect } from 'react';
import { Truck, MapPin, Clock, User, CheckCircle2, AlertTriangle, Package, RefreshCw } from 'lucide-react';
import api from '../services/api';

const PRIMARY = '#122a4c';

const statusStyle: Record<string, { bg: string; text: string; icon: typeof Truck }> = {
  'Em Rota': { bg: '#fff7ed', text: '#ea580c', icon: Truck },
  'Pronto para Saída': { bg: '#eff6ff', text: '#2563eb', icon: Package },
  'Em Preparo': { bg: '#f5f3ff', text: '#7c3aed', icon: RefreshCw },
  'Entregue': { bg: '#f0fdf4', text: '#16a34a', icon: CheckCircle2 },
  'Atrasado': { bg: '#fef2f2', text: '#dc2626', icon: AlertTriangle },
  'Falhou': { bg: '#fef2f2', text: '#dc2626', icon: AlertTriangle },
};

const tabs = ['Todos', 'Em Preparo', 'Pronto para Saída', 'Em Rota', 'Entregue'];

export function Deliveries() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [tab, setTab] = useState('Todos');
  const [assigning, setAssigning] = useState<string | null>(null);
  const [courierName, setCourierName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      // Fetch deliveries, orders, couriers
      const [delRes, pedRes, entRes, cliRes] = await Promise.all([
        api.get('/entregas'),
        api.get('/pedidos'),
        api.get('/entregadores'),
        api.get('/clientes')
      ]);

      const entregasRaw = delRes.data.data;
      const entregas = Array.isArray(entregasRaw) ? entregasRaw : entregasRaw?.data || [];
      
      const pedidosRaw = pedRes.data.data;
      const pedidos = Array.isArray(pedidosRaw) ? pedidosRaw : pedidosRaw?.data || [];
      
      const entregadoresRaw = entRes.data.data;
      const entregadores = Array.isArray(entregadoresRaw) ? entregadoresRaw : entregadoresRaw?.data || [];
      
      const clientesRaw = cliRes.data.data;
      const clientes = Array.isArray(clientesRaw) ? clientesRaw : clientesRaw?.data || [];

      const mapped = entregas.map((d: any) => {
        const pedido = pedidos.find((p: any) => p.id === d.pedido_id);
        const cliente = pedido ? clientes.find((c: any) => c.id === pedido.cliente_id) : null;
        const entregador = entregadores.find((e: any) => e.id === d.entregador_id);
        
        let status = 'Em Preparo';
        if (d.status === 'aguardando') status = 'Pronto para Saída';
        if (d.status === 'atribuida' || d.status === 'saiu_para_entrega') status = 'Em Rota';
        if (d.status === 'entregue') status = 'Entregue';
        if (d.status === 'falhou') status = 'Falhou';

        return {
          id: d.id,
          pedido_id: d.pedido_id,
          displayId: d.pedido_id ? d.pedido_id.split('-')[0] : d.id.split('-')[0],
          status,
          rawStatus: d.status,
          customer: cliente ? cliente.nome : 'Cliente Desconhecido',
          address: 'Endereço vinculado ao pedido', // Simplificado
          courier: entregador ? entregador.nome : '—',
          time: d.saiu_para_entrega_em ? new Date(d.saiu_para_entrega_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—',
          eta: '—'
        };
      });

      setDeliveries(mapped);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const filtered = tab === 'Todos' ? deliveries : deliveries.filter(d => d.status === tab);

  const assignCourier = async (id: string) => {
    if (!courierName.trim()) return;
    try {
      // In a real scenario we'd look up the courier ID or create it, 
      // but the backend requires an UUID for entregador_id.
      // We will skip actual backend update for assigning via name directly, just close it or mock success.
      alert('Selecione um entregador válido pela lista (em desenvolvimento).');
      setAssigning(null);
      setCourierName('');
    } catch (err) {
      console.error(err);
    }
  };

  const advance = async (id: string, currentStatus: string) => {
    try {
      let nextAction = '';
      if (currentStatus === 'aguardando') {
        // Need to assign courier first
        alert('Atribua um entregador primeiro!');
        return;
      }
      if (currentStatus === 'atribuida') nextAction = `/entregas/${id}/sair-para-entrega`;
      if (currentStatus === 'saiu_para_entrega') nextAction = `/entregas/${id}/entregar`;
      
      if (nextAction) {
        await api.post(nextAction, {});
        fetchDeliveries();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-5 space-y-5 overflow-y-auto flex-1 h-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }}></div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Em Preparo', value: deliveries.filter(d => d.status === 'Em Preparo').length, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Pronto para Saída', value: deliveries.filter(d => d.status === 'Pronto para Saída').length, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Em Rota', value: deliveries.filter(d => d.status === 'Em Rota').length, color: '#ea580c', bg: '#fff7ed' },
          { label: 'Entregues Hoje', value: deliveries.filter(d => d.status === 'Entregue').length, color: '#16a34a', bg: '#f0fdf4' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-2xl font-semibold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
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

      {/* Delivery cards */}
      <div className="space-y-3">
        {filtered.map(delivery => {
          const sc = statusStyle[delivery.status] ?? statusStyle['Em Preparo'];
          const StatusIcon = sc.icon;
          return (
            <div key={delivery.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: sc.bg }}>
                    <StatusIcon className="w-5 h-5" style={{ color: sc.text }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">Pedido #{delivery.displayId}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: sc.bg, color: sc.text }}>
                        {delivery.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">{delivery.customer}</div>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5" />{delivery.address}
                      </div>
                      {delivery.courier !== '—' && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <User className="w-3.5 h-3.5" />{delivery.courier}
                        </div>
                      )}
                      {delivery.time !== '—' && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5" />Saída: {delivery.time}
                          {delivery.eta !== '—' && <span className="text-amber-600"> · ETA: {delivery.eta}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {delivery.status !== 'Entregue' && delivery.status !== 'Falhou' && (
                    <button
                      onClick={() => delivery.courier === '—' ? setAssigning(delivery.id) : advance(delivery.id, delivery.rawStatus)}
                      className="px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-opacity hover:opacity-90"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      {delivery.courier === '—' ? 'Atribuir Entregador' : 'Avançar Status'}
                    </button>
                  )}
                  {delivery.status === 'Entregue' && (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
                    </span>
                  )}
                </div>
              </div>

              {/* Assign form */}
              {assigning === delivery.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                  <input
                    value={courierName}
                    onChange={e => setCourierName(e.target.value)}
                    placeholder="Nome do entregador"
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1"
                    onKeyDown={e => e.key === 'Enter' && assignCourier(delivery.id)}
                  />
                  <button
                    onClick={() => assignCourier(delivery.id)}
                    className="px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                    style={{ backgroundColor: '#16a34a' }}
                  >
                    Confirmar
                  </button>
                  <button onClick={() => setAssigning(null)} className="px-3 py-1.5 rounded-lg text-gray-500 text-xs border border-gray-200 hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Truck className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Nenhuma entrega neste status</p>
          </div>
        )}
      </div>
    </div>
  );
}