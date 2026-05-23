import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  ShoppingCart, TrendingUp, Truck, XCircle, DollarSign, Users,
  Package, AlertTriangle, ArrowRight, Clock, CheckCircle2, Activity, Calendar
} from 'lucide-react';
import api from '@/shared/lib/api';

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

const MINUTES_PER_DAY = 24 * 60;
const salesIntervalOptions = [15, 30, 60, 120];

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date: string) => date.split('-').reverse().join('/');

const formatTimeLabel = (totalMinutes: number) => {
  const normalizedMinutes = Math.min(totalMinutes, MINUTES_PER_DAY - 1);
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const parseTimeToMinutes = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value <= 23 ? value * 60 : value;
  }

  if (typeof value !== 'string') return null;

  const match = value.match(/(\d{1,2})(?::|h)?(\d{2})?/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const total = hours * 60 + minutes;
  return total >= 0 && total < MINUTES_PER_DAY ? total : null;
};

const applyTimeToDate = (date: Date, timeValue: unknown) => {
  const minutes = parseTimeToMinutes(timeValue);
  if (minutes === null) return date;

  const next = new Date(date);
  next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return next;
};

const getSalesPointDate = (point: any, fallbackDate?: string) => {
  const value = point?.date || point?.data || point?.dia || point?.created_at || point?.createdAt || point?.timestamp || point?.periodo;
  const timeValue = point?.hora ?? point?.hour ?? point?.time ?? point?.horario;

  if (value && typeof value === 'string') {
    const date = value.includes('T') ? new Date(value) : applyTimeToDate(parseLocalDate(value.slice(0, 10)), timeValue);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (fallbackDate && timeValue !== undefined) {
    const date = applyTimeToDate(parseLocalDate(fallbackDate), timeValue);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

const getSalesPointValue = (point: any) => {
  const value = point?.vendas ?? point?.valor ?? point?.total ?? point?.revenue ?? 0;
  const number = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : 0;
};

const isSameLocalDay = (date: Date, day: string) => {
  const selected = parseLocalDate(day);
  return date.getFullYear() === selected.getFullYear()
    && date.getMonth() === selected.getMonth()
    && date.getDate() === selected.getDate();
};

const getMinutesSinceStartOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();

const normalizeIntervalMinutes = (value: number) => {
  return salesIntervalOptions.includes(value) ? value : 60;
};

const buildSalesChartData = (rawData: any[], selectedDate: string, intervalMinutes: number) => {
  const safeInterval = normalizeIntervalMinutes(intervalMinutes);
  const bucketCount = Math.ceil(MINUTES_PER_DAY / safeInterval);

  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const startMinutes = index * safeInterval;
    const endMinutes = Math.min(MINUTES_PER_DAY, startMinutes + safeInterval);
    const label = safeInterval === 60
      ? formatTimeLabel(startMinutes)
      : `${formatTimeLabel(startMinutes)}-${formatTimeLabel(endMinutes - 1)}`;

    return {
      hour: label,
      vendas: 0,
      start: formatTimeLabel(startMinutes),
      end: formatTimeLabel(endMinutes - 1),
    };
  });

  const dataWithDates = rawData.filter(point => getSalesPointDate(point, selectedDate));

  if (dataWithDates.length > 0) {
    dataWithDates.forEach((point) => {
      const pointDate = getSalesPointDate(point, selectedDate);
      if (!pointDate || !isSameLocalDay(pointDate, selectedDate)) return;

      const bucketIndex = Math.min(
        bucketCount - 1,
        Math.floor(getMinutesSinceStartOfDay(pointDate) / safeInterval)
      );
      buckets[bucketIndex].vendas += getSalesPointValue(point);
    });
    return buckets;
  }

  if (rawData.length === bucketCount) {
    return buckets.map((bucket, index) => ({ ...bucket, vendas: getSalesPointValue(rawData[index]) }));
  }

  return buckets;
};

const todayDateInput = () => {
  return formatDateInput(new Date());
};

export function DashboardScreen() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [storeConfig, setStoreConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(todayDateInput);
  const [salesIntervalMinutes, setSalesIntervalMinutes] = useState(60);

  const user = (() => {
    try {
      const userJson = localStorage.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
      return null;
    }
  })();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [metricsRes, configRes] = await Promise.allSettled([
          api.get(`/metricas?dataInicio=${selectedDate}&dataFim=${selectedDate}`),
          user?.loja_id ? api.get(`/lojas/${user.loja_id}/configuracoes`) : Promise.resolve(null)
        ]);

        if (metricsRes.status === 'fulfilled') {
          setMetrics(metricsRes.value.data.data);
        } else {
          throw metricsRes.reason;
        }

        if (configRes.status === 'fulfilled' && configRes.value) {
          setStoreConfig(configRes.value.data?.data || configRes.value.data || null);
        }
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

    fetchDashboardData();
  }, [navigate, selectedDate, user?.loja_id]);

  if (loading && !metrics) {
    return (
      <div className="p-5 flex-1 h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }}></div>
      </div>
    );
  }

  // Fallbacks if data is not present
  const statCards = [
    { label: 'Pedidos', value: metrics?.pedidosHoje?.total || '0', sub: 'No dia', icon: ShoppingCart, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Em Andamento', value: metrics?.pedidosAndamento || '0', sub: 'Atuais', icon: Activity, color: '#d97706', bg: '#fffbeb' },
    { label: 'Entregues', value: metrics?.pedidosEntregues || '0', sub: 'Concluídos', icon: CheckCircle2, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Cancelados', value: metrics?.pedidosCancelados || '0', sub: 'Cancelados', icon: XCircle, color: '#dc2626', bg: '#fef2f2' },
    { label: 'Faturamento', value: `R$ ${parseFloat(metrics?.faturamentoDiario?.total || '0').toFixed(2)}`, sub: 'No dia', icon: DollarSign, color: PRIMARY, bg: '#eef2f9' },
    { label: 'Ticket Médio', value: `R$ ${parseFloat(metrics?.ticketMedio || '0').toFixed(2)}`, sub: 'Por pedido', icon: TrendingUp, color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Clientes Novos', value: metrics?.novosClientes || '0', sub: 'No dia', icon: Users, color: '#0891b2', bg: '#ecfeff' },
    { label: 'Em Rota', value: metrics?.pedidosEmRota || '0', sub: 'Atuais', icon: Truck, color: '#ea580c', bg: '#fff7ed' },
  ];

  const rawSalesData = Array.isArray(metrics?.vendasSemana) ? metrics.vendasSemana : [];
  const salesData = buildSalesChartData(rawSalesData, selectedDate, salesIntervalMinutes);
  const salesIntervalLabel = `${formatDisplayDate(selectedDate)} · ${salesIntervalMinutes} min`;
  const statusData = metrics?.statusData || [];
  const orders = metrics?.pedidosRecentes || [];
  const topProducts = metrics?.topProdutos || [];
  const alerts = metrics?.alertas || [];

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  const primaryColor = storeConfig?.cor_primaria || PRIMARY;
  const secondaryColor = storeConfig?.cor_secundaria || '#16a34a';
  const slogan = storeConfig?.slogan;

  return (
    <div className="w-full max-w-none p-4 sm:p-5 lg:p-6 overflow-y-auto flex-1 h-full">
      {/* Welcome bar */}
      <div
        className="rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between text-white gap-4"
        style={{ backgroundColor: primaryColor }}
      >
        <div>
          <div className="text-white/70 text-xs mb-0.5">
            {parseLocalDate(selectedDate).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <h2 className="text-white font-semibold">
            {greeting}, {user?.nome?.split(' ')[0] || 'Administrador'}. Boas vindas!
          </h2>
          {slogan && (
            <div className="text-white/80 text-sm mt-1 flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
              {slogan}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 bg-white/10 rounded-lg p-1 text-sm">
            <Calendar className="w-4 h-4 ml-2 mr-1 text-white/70" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-white outline-none cursor-pointer p-1 [&::-webkit-calendar-picker-indicator]:filter-[invert(1)]"
            />
            <select
              value={salesIntervalMinutes}
              onChange={(e) => setSalesIntervalMinutes(Number(e.target.value))}
              className="bg-white/10 border border-white/10 rounded-md text-white outline-none cursor-pointer px-2 py-1"
            >
              {salesIntervalOptions.map((minutes) => (
                <option key={minutes} value={minutes} className="text-gray-900">
                  {minutes} min
                </option>
              ))}
            </select>
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
              <h3 className="text-gray-800 font-semibold">Vendas por Hora</h3>
              <p className="text-gray-400 text-xs mt-0.5">Faturamento por intervalo de minutos em R$</p>
            </div>
            <div className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white">
              {salesIntervalLabel}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={salesData.length ? salesData : [{ hour: '00:00', vendas: 0 }]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Vendas']}
              />
              <Line type="monotone" dataKey="vendas" stroke={PRIMARY} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="mb-4">
            <h3 className="text-gray-800 font-semibold">Status dos Pedidos</h3>
            <p className="text-gray-400 text-xs mt-0.5">Distribuição no dia</p>
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
            <h3 className="text-gray-800 font-semibold mb-3">Mais Vendidos no Dia</h3>
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
                 <div className="text-sm text-gray-500 text-center">Nenhum produto vendido neste dia.</div>
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
                  if (!alert) return null;
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
