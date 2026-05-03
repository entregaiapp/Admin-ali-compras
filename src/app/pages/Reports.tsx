import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, ShoppingCart, Users, XCircle, DollarSign, BarChart3, Calendar } from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router';

const PRIMARY = '#122a4c';
const COLORS = [PRIMARY, '#2563eb', '#7c3aed', '#16a34a', '#d97706', '#ea580c'];

export function Reports() {
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

  const faturamentoTotal = parseFloat(metrics?.faturamentoDiario?.total || '0');
  const ticketMedio = parseFloat(metrics?.ticketMedio || '0');
  const pedidosTotal = metrics?.pedidosHoje?.total || 0;
  const cancelados = metrics?.pedidosCancelados || 0;
  const taxaCancelamento = pedidosTotal ? ((cancelados / pedidosTotal) * 100).toFixed(1) : '0.0';

  const salesData = metrics?.vendasSemana || [];
  const categoryRevenueData = metrics?.categoryRevenueData || [];
  const topProducts = metrics?.topProdutos || [];
  const hourlyData = metrics?.hourlyData || [];

  return (
    <div className="p-5 space-y-5 overflow-y-auto flex-1 h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-gray-900 font-semibold text-xl">Relatórios e Análises</h2>
          <p className="text-gray-500 text-sm mt-0.5">Desempenho operacional</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm">
          <Calendar className="w-4 h-4 ml-2 mr-1 text-gray-500" />
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border-none text-sm text-gray-700 outline-none cursor-pointer bg-transparent"
          />
          <span className="text-gray-400 px-1 text-sm">até</span>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border-none text-sm text-gray-700 outline-none cursor-pointer bg-transparent"
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Faturamento', value: `R$ ${faturamentoTotal.toFixed(2)}`, sub: 'No período', color: PRIMARY, icon: DollarSign },
          { label: 'Pedidos', value: pedidosTotal.toString(), sub: 'No período', color: '#2563eb', icon: ShoppingCart },
          { label: 'Ticket Médio', value: `R$ ${ticketMedio.toFixed(2)}`, sub: 'Por pedido', color: '#7c3aed', icon: TrendingUp },
          { label: 'Novos Clientes', value: metrics?.novosClientes?.toString() || '0', sub: 'No período', color: '#16a34a', icon: Users },
          { label: 'Cancelamentos', value: `${taxaCancelamento}%`, sub: 'Taxa no período', color: '#d97706', icon: XCircle },
          { label: 'Receita Líq.', value: `R$ ${(faturamentoTotal * 0.95).toFixed(2)}`, sub: 'Est. (-5%)', color: '#ea580c', icon: BarChart3 },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <kpi.icon className="w-5 h-5 mb-3" style={{ color: kpi.color }} />
            <div className="font-semibold text-gray-800 text-lg leading-tight">{kpi.value}</div>
            <div className="text-sm text-gray-500 mt-1">{kpi.label}</div>
            <div className="text-xs font-medium mt-1.5 text-gray-400">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">Faturamento por Dia</h3>
              <p className="text-xs text-gray-400 mt-0.5">Evolução no período selecionado</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={salesData.length ? salesData : [{ day: 'Sem dados', vendas: 0 }]} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Faturamento']} />
              <Area type="monotone" dataKey="vendas" stroke={PRIMARY} strokeWidth={3} fill="url(#repGrad)" activeDot={{ r: 6, fill: PRIMARY }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Categories pie */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-1">Vendas por Categoria</h3>
          <p className="text-xs text-gray-400 mb-4">Participação no faturamento</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={categoryRevenueData.length ? categoryRevenueData : [{ name: 'Sem dados', value: 100 }]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                {(categoryRevenueData.length ? categoryRevenueData : [{ name: 'Sem dados', value: 100 }]).map((entry: any, i: number) => (
                  <Cell key={`category-pie-${entry.name}-${i}`} fill={categoryRevenueData.length ? COLORS[i % COLORS.length] : '#f3f4f6'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4 max-h-[100px] overflow-y-auto pr-2">
            {categoryRevenueData.map((c: any, i: number) => (
              <div key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-gray-600 truncate max-w-[120px]">{c.name}</span>
                </div>
                <span className="text-xs font-medium text-gray-700">R$ {parseFloat(c.value).toLocaleString('pt-BR')}</span>
              </div>
            ))}
            {categoryRevenueData.length === 0 && <div className="text-center text-xs text-gray-400">Nenhum dado disponível</div>}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hourly pedidos */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-1">Horários de Maior Movimento</h3>
          <p className="text-xs text-gray-400 mb-5">Pedidos por hora – no período</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyData.length ? hourlyData : [{ hour: '00h', pedidos: 0 }]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="pedidos" fill={PRIMARY} radius={[4, 4, 0, 0]} name="Pedidos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top products table */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-1">Produtos Mais Vendidos</h3>
          <p className="text-xs text-gray-400 mb-5">Ranking do período</p>
          <div className="space-y-4">
            {topProducts.length > 0 ? topProducts.map((p: any, i: number) => (
              <div key={p.name} className="flex items-center gap-3 group">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7c2f' : '#f3f4f6' }}
                >
                  <span style={{ color: i >= 3 ? '#6b7280' : 'white' }}>{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 font-medium truncate group-hover:text-primary transition-colors">{p.name}</div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(p.qty / topProducts[0].qty) * 100}%`, backgroundColor: PRIMARY }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-gray-800">{p.qty} un.</div>
                  <div className="text-[11px] text-gray-500 font-medium mt-0.5">R$ {parseFloat(p.revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            )) : (
              <div className="text-center text-sm text-gray-500 py-8">Nenhum produto vendido no período.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}