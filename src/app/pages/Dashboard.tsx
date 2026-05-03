import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  ShoppingCart, TrendingUp, Truck, XCircle, DollarSign, Users,
  Package, AlertTriangle, ArrowRight, Clock, CheckCircle2, Activity, Calendar
} from 'lucide-react';
import api from '../services/api';

const PRIMARY = '#122a4c';

const statusColor: Record<string, string> = {
  'Recebido': '#d97706',
  'Confirmado': '#2563eb',
  'Em Separação': '#7c3aed',
  'Pronto': '#0891b2',
  'Saiu para Entrega': '#ea580c',
  'Entregue': '#16a34a',
  'Cancelado': '#dc2626',
};

export function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filtro de data, padrão: hoje
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/metricas?dataInicio=${startDate}&dataFim=${endDate}`);
        setMetrics(response.data.data);
      } catch (error) {
        console.error('Error fetching metrics', error);
        // Navigate to login if unauthorized
        if ((error as any).response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [navigate, startDate, endDate]);

  if (loading && !metrics) {
    return (
      <div className="p-5 flex-1 h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }}></div>
      </div>
    );
  }

  // Fallbacks if data is not present
  const statCards = [
    { label: 'Pedidos', value: metrics?.pedidosHoje?.total || '0', sub: 'No período', icon: ShoppingCart, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Em Andamento', value: metrics?.pedidosAndamento || '0', sub: 'Atuais', icon: Activity, color: '#d97706', bg: '#fffbeb' },
    { label: 'Entregues', value: metrics?.pedidosEntregues || '0', sub: 'Concluídos', icon: CheckCircle2, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Cancelados', value: metrics?.pedidosCancelados || '0', sub: 'Cancelados', icon: XCircle, color: '#dc2626', bg: '#fef2f2' },
    { label: 'Faturamento', value: `R$ ${parseFloat(metrics?.faturamentoDiario?.total || '0').toFixed(2)}`, sub: 'No período', icon: DollarSign, color: PRIMARY, bg: '#eef2f9' },
    { label: 'Ticket Médio', value: `R$ ${parseFloat(metrics?.ticketMedio || '0').toFixed(2)}`, sub: 'Por pedido', icon: TrendingUp, color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Clientes Novos', value: metrics?.novosClientes || '0', sub: 'No período', icon: Users, color: '#0891b2', bg: '#ecfeff' },
    { label: 'Em Rota', value: metrics?.pedidosEmRota || '0', sub: 'Atuais', icon: Truck, color: '#ea580c', bg: '#fff7ed' },
  ];

  const salesData = metrics?.vendasSemana || [];
  const statusData = metrics?.statusData || [];
  const orders = metrics?.pedidosRecentes || [];
  const topProducts = metrics?.topProdutos || [];
  const alerts = metrics?.alertas || [];

  return (
    <div className="p-5 max-w-screen-xl mx-auto overflow-y-auto flex-1 h-full m-[0px]">
      {/* Welcome bar */}
      <div
        className="rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between text-white gap-4"
        style={{ backgroundColor: PRIMARY }}
      >
        <div>
          <div className="text-white/70 text-xs mb-0.5">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <h2 className="text-white font-semibold">Bom dia, Admin! Aqui está o resumo da sua operação.</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/10 rounded-lg p-1 text-sm">
            <Calendar className="w-4 h-4 ml-2 mr-1 text-white/70" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-white outline-none cursor-pointer p-1 [&::-webkit-calendar-picker-indicator]:filter-[invert(1)]"
            />
            <span className="text-white/50 px-1">até</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-white outline-none cursor-pointer p-1 [&::-webkit-calendar-picker-indicator]:filter-[invert(1)]"
            />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.bg }}>
                <card.icon className="w-4.5 h-4.5" style={{ color: card.color }} />
              </div>
            </div>
            <div className="text-gray-900 font-semibold text-xl leading-tight">{card.value}</div>
            <div className="text-gray-500 text-xs mt-0.5">{card.label}</div>
            <div className="text-gray-400 text-[11px] mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Sales chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-gray-800 font-semibold">Vendas da Semana</h3>
              <p className="text-gray-400 text-xs mt-0.5">Faturamento diário em R$</p>
            </div>
            <select className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white">
              <option>Esta semana</option>
              <option>Semana anterior</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={salesData.length ? salesData : [{ day: 'Seg', vendas: 0 }]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Vendas']}
              />
              <Area type="monotone" dataKey="vendas" stroke={PRIMARY} strokeWidth={2} fill="url(#salesGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="mb-4">
            <h3 className="text-gray-800 font-semibold">Status dos Pedidos</h3>
            <p className="text-gray-400 text-xs mt-0.5">Distribuição hoje</p>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={statusData.length ? statusData : [{ name: 'Sem dados', value: 100, color: '#ccc' }]} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                {(statusData.length ? statusData : [{ name: 'Sem dados', value: 100, color: '#ccc' }]).map((entry: any, i: number) => (
                  <Cell key={`status-pie-${entry.name}-${i}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {statusData.map((s: any) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-gray-600">{s.name}</span>
                </div>
                <span className="text-xs font-medium text-gray-700">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="text-gray-800 font-semibold">Pedidos Recentes</h3>
            <button
              onClick={() => navigate('/orders')}
              className="flex items-center gap-1 text-xs font-medium hover:underline"
              style={{ color: PRIMARY }}
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {orders.length > 0 ? orders.slice(0, 5).map((order: any) => (
              <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{order.numero_pedido} · {order.cliente?.nome}</div>
                    <div className="text-xs text-gray-400">{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {order.tipo_entrega} · {order.pagamento?.metodo}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">R$ {parseFloat(order.valor_total).toFixed(2).replace('.', ',')}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: (statusColor[order.status] || '#9ca3af') + '18',
                      color: statusColor[order.status] || '#9ca3af',
                    }}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            )) : (
              <div className="p-4 text-center text-sm text-gray-500">Nenhum pedido recente.</div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Top products */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-gray-800 font-semibold mb-3">Mais Vendidos Hoje</h3>
            <div className="space-y-3">
              {topProducts.length > 0 ? topProducts.map((p: any, i: number) => (
                <div key={p.name} className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7c2f' : PRIMARY }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-700 truncate">{p.name}</div>
                    <div className="text-[11px] text-gray-400">{p.qty} un. · R$ {parseFloat(p.revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
              )) : (
                 <div className="text-sm text-gray-500 text-center">Nenhum produto vendido hoje.</div>
              )}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-800 font-semibold">Alertas</h3>
              <button onClick={() => navigate('/notifications')} className="text-xs hover:underline" style={{ color: PRIMARY }}>Ver todos</button>
            </div>
            <div className="space-y-2">
              {alerts.length > 0 ? alerts.map((alert: any, i: number) => {
                 let Icon = AlertTriangle;
                 if (alert.type === 'stock') Icon = Package;
                 if (alert.type === 'delivery') Icon = Truck;
                 
                 return (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg" style={{ backgroundColor: alert.bg || '#fffbeb' }}>
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: alert.color || '#d97706' }} />
                    <span className="text-xs font-medium" style={{ color: alert.color || '#d97706' }}>{alert.text}</span>
                  </div>
                 );
              }) : (
                 <div className="text-sm text-gray-500 text-center">Nenhum alerta.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}