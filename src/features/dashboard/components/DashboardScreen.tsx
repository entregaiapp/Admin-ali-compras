import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  ShoppingCart, Truck, XCircle, DollarSign, Users,
  Package, AlertTriangle, ArrowRight, Clock, CheckCircle2, Activity, Calendar, CreditCard, Info, Armchair
} from 'lucide-react';
import api from '@/shared/lib/api';
import { dateInputInBrasilia, formatBrasiliaTime, hourInBrasilia } from '@/shared/lib/dateTime';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';

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

const formatCurrency = (value: unknown) => {
  const number = typeof value === 'number' ? value : Number(String(value ?? 0).replace(',', '.'));
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const toNumber = (value: unknown) => {
  const number = typeof value === 'number' ? value : Number(String(value ?? 0).replace(',', '.'));
  return Number.isFinite(number) ? number : 0;
};

const MetricInfo = ({ text }: { text: string }) => (
  <UiTooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Explicacao da metrica"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-xs bg-slate-950 text-white">
      {text}
    </TooltipContent>
  </UiTooltip>
);

const paymentMethodLabel = (value: unknown) => {
  const labels: Record<string, string> = {
    dinheiro: 'Dinheiro',
    cartao: 'Cartão',
    pix: 'PIX',
    cartao_credito: 'Cartão de crédito',
    cartao_debito: 'Cartão de débito',
    card: 'Cartão',
    cash: 'Dinheiro',
    credit_tab: 'Fiado',
    outros: 'Outros',
  };
  return labels[String(value || '').toLowerCase()] || String(value || 'Indefinido');
};

const paymentChannelLabel = (value: unknown) => {
  if (value === 'entrega') return 'Na entrega';
  if (value === 'app') return 'No app';
  if (value === 'salao') return 'Salão';
  if (value === 'ONLINE_GATEWAY') return 'Gateway online';
  if (value === 'EXTERNAL_OR_OFFLINE') return 'Externo ou offline';
  if (value === 'CREDIT_TAB') return 'Fiado';
  return String(value || 'Indefinido');
};

const financialStatusLabel = (value: unknown) => {
  const labels: Record<string, string> = {
    recebido: 'Recebido',
    previsto: 'Previsto',
    rejeitado: 'Rejeitado',
    cancelado: 'Cancelado',
    estornado: 'Estornado',
    indefinido: 'Indefinido',
  };
  return labels[String(value || '').toLowerCase()] || String(value || 'Indefinido');
};

const sourceLabel = (value: unknown) => {
  const labels: Record<string, string> = {
    CUSTOMER_APP: 'Cliente/app',
    ADMIN: 'Admin',
    SALON: 'Salão',
    UNKNOWN: 'Desconhecido',
  };
  return labels[String(value || '')] || String(value || 'Indefinido');
};

const fulfillmentLabel = (value: unknown) => {
  const labels: Record<string, string> = {
    DELIVERY: 'Entrega',
    PICKUP: 'Retirada',
    DINE_IN: 'Salão',
  };
  return labels[String(value || '')] || String(value || 'Indefinido');
};

const auditStatusLabel = (value: unknown) => {
  const labels: Record<string, string> = {
    CONCILIATED: 'Conciliado',
    PENDING_SETTLEMENT: 'Pendente',
    DIVERGENT: 'Divergente',
    INCOMPLETE: 'Incompleto',
  };
  return labels[String(value || '')] || String(value || 'Indefinido');
};

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
  const value = point?.pedidos ?? point?.quantidade ?? point?.orders ?? point?.vendas ?? point?.valor ?? point?.total ?? point?.revenue ?? 0;
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
      pedidos: 0,
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
      buckets[bucketIndex].pedidos += getSalesPointValue(point);
    });
    return buckets;
  }

  if (rawData.length === bucketCount) {
    return buckets.map((bucket, index) => ({ ...bucket, pedidos: getSalesPointValue(rawData[index]) }));
  }

  return buckets;
};

const todayDateInput = () => {
  return dateInputInBrasilia();
};

export function DashboardScreen() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [cashFinance, setCashFinance] = useState<any>(null);
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
    let active = true;

    const fetchDashboardData = async () => {
      setLoading(true);
      if (active) setCashFinance(null);
      try {
        const [metricsRes, financeRes, configRes] = await Promise.allSettled([
          api.get(`/metricas?dataInicio=${selectedDate}&dataFim=${selectedDate}`),
          api.get('/financeiro/admin/caixa-atual'),
          user?.loja_id ? api.get(`/lojas/${user.loja_id}/configuracoes`) : Promise.resolve(null)
        ]);

        if (metricsRes.status === 'fulfilled') {
          const nextMetrics = metricsRes.value.data.data;
          if (active) setMetrics(nextMetrics);
        } else {
          throw metricsRes.reason;
        }

        if (financeRes.status === 'fulfilled') {
          const nextFinance = financeRes.value.data?.data || null;
          if (active) setCashFinance(nextFinance);
        } else if (active) {
          setCashFinance({
            status: 'erro_financeiro',
            mensagem: 'Não foi possível carregar o resumo financeiro canônico.',
          });
        }

        if (configRes.status === 'fulfilled' && configRes.value) {
          const nextConfig = configRes.value.data?.data || configRes.value.data || null;
          if (active) setStoreConfig(nextConfig);
        }
      } catch (error) {
        console.error('Error fetching dashboard data', error);
        if ((error as any).response?.status === 401) {
          navigate('/login');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchDashboardData();

    return () => {
      active = false;
    };
  }, [navigate, selectedDate, user?.loja_id]);

  if (loading && !metrics) {
    return (
      <div className="p-5 flex-1 h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }}></div>
      </div>
    );
  }

  const canonicalFinance = cashFinance?.financeiro || cashFinance?.caixa?.financeiro || null;
  const cashIsOpen = cashFinance?.status === 'aberto';
  const financeUnavailable = cashFinance?.status === 'erro_financeiro';
  const hasCashFinanceResponse = cashFinance !== null && cashFinance !== undefined;
  const cashInfo = canonicalFinance?.caixa || cashFinance?.caixa || {};
  const financeSummary = canonicalFinance?.resumo_vendas || {};
  const reconciliation = canonicalFinance?.conciliacao || {};
  const salesByFulfillment = Array.isArray(canonicalFinance?.por_atendimento) ? canonicalFinance.por_atendimento : [];
  const salesBySource = Array.isArray(canonicalFinance?.por_origem) ? canonicalFinance.por_origem : [];
  const paymentsByMethod = Array.isArray(canonicalFinance?.pagamentos?.por_metodo) ? canonicalFinance.pagamentos.por_metodo : [];
  const paymentsByChannel = Array.isArray(canonicalFinance?.pagamentos?.por_canal) ? canonicalFinance.pagamentos.por_canal : [];
  const drilldownOrders = Array.isArray(canonicalFinance?.drilldown?.pedidos) ? canonicalFinance.drilldown.pedidos : [];
  const financialCards = [
    { label: 'Recebido no caixa', value: formatCurrency(reconciliation.total_recebido_no_caixa), sub: `${formatCurrency(reconciliation.recebido_de_vendas_do_caixa)} de vendas`, icon: DollarSign, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Pendente', value: formatCurrency(reconciliation.valores_pendentes), sub: 'Pagamentos ainda não recebidos', icon: Clock, color: '#d97706', bg: '#fffbeb' },
    { label: 'Fiado criado', value: formatCurrency(reconciliation.fiado_criado), sub: 'Vira recebimento futuro', icon: CreditCard, color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Fiado recebido', value: formatCurrency(reconciliation.fiado_recebido), sub: 'Baixas vinculadas ao caixa', icon: CheckCircle2, color: '#0891b2', bg: '#ecfeff' },
    { label: 'Cancelamentos', value: formatCurrency(reconciliation.cancelamentos), sub: `${formatCurrency(reconciliation.estornos)} estornado`, icon: XCircle, color: '#dc2626', bg: '#fef2f2' },
    { label: 'Divergência', value: formatCurrency(reconciliation.diferenca_conciliacao), sub: auditStatusLabel(reconciliation.status_auditoria), icon: AlertTriangle, color: toNumber(reconciliation.diferenca_conciliacao) === 0 ? '#16a34a' : '#dc2626', bg: toNumber(reconciliation.diferenca_conciliacao) === 0 ? '#f0fdf4' : '#fef2f2' },
  ];
  const operationalCards = [
    { label: 'Pedidos do dia', value: metrics?.pedidosHoje?.total || '0', sub: formatDisplayDate(selectedDate), icon: ShoppingCart, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Em andamento', value: metrics?.pedidosAndamento || '0', sub: 'Agora', icon: Activity, color: '#d97706', bg: '#fffbeb' },
    { label: 'Entregues', value: metrics?.pedidosEntregues || '0', sub: 'No dia', icon: CheckCircle2, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Em rota', value: metrics?.pedidosEmRota || '0', sub: 'Agora', icon: Truck, color: '#ea580c', bg: '#fff7ed' },
  ];

  const rawSalesData = Array.isArray(metrics?.hourlyData) && metrics.hourlyData.length
    ? metrics.hourlyData
    : Array.isArray(metrics?.vendasSemana)
      ? metrics.vendasSemana
      : [];
  const salesData = buildSalesChartData(rawSalesData, selectedDate, salesIntervalMinutes);
  const salesIntervalLabel = `${formatDisplayDate(selectedDate)} · ${salesIntervalMinutes} min`;
  const statusData = metrics?.statusData || [];
  const orders = metrics?.pedidosRecentes || [];
  const topProducts = metrics?.topProdutos || [];
  const alerts = metrics?.alertas || [];

  const greeting = (() => {
    const hour = hourInBrasilia();
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
            {cashIsOpen ? 'Caixa operacional aberto' : 'Resumo financeiro do caixa'}
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
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
            <Calendar className="h-4 w-4 text-white/70" />
            <span>{cashIsOpen ? 'Valores do caixa atual' : 'Sem caixa aberto'}</span>
          </div>
        </div>
      </div>

      {!cashIsOpen && hasCashFinanceResponse && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">{financeUnavailable ? 'Resumo financeiro indisponível' : 'Nenhum caixa aberto'}</div>
              <div className="mt-1 text-amber-800">
                {financeUnavailable
                  ? 'Os cards financeiros abaixo não usam somas antigas do dashboard. Verifique o endpoint financeiro canônico antes de auditar valores.'
                  : 'Os cards financeiros abaixo não usam pedidos do dia. Abra um caixa ou consulte um fechamento histórico para ver valores financeiros conciliados.'}
              </div>
            </div>
          </div>
        </div>
      )}

      <TooltipProvider delayDuration={150}>
        <div className="grid grid-cols-2 gap-3 mt-4 lg:grid-cols-6">
          {financialCards.map(card => (
            <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: card.bg }}>
                  <card.icon className="h-4 w-4" style={{ color: card.color }} />
                </div>
              </div>
              <div className="text-lg font-semibold text-gray-950">{card.value}</div>
              <div className="mt-1 text-xs font-medium text-gray-600">{card.label}</div>
              <div className="mt-1 text-[11px] text-gray-400">{card.sub}</div>
            </div>
          ))}
        </div>
      </TooltipProvider>

      <div className="grid grid-cols-1 gap-4 mt-4 xl:grid-cols-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-gray-900 font-semibold">Caixa atual</h3>
              <p className="text-xs text-gray-400">
                {cashInfo?.aberto_em ? `Aberto em ${formatBrasiliaTime(cashInfo.aberto_em)}` : 'Sem sessão aberta'}
              </p>
            </div>
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${cashIsOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {cashIsOpen ? 'Aberto' : 'Fechado'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-400">Pedidos</div>
              <div className="font-semibold text-gray-900">{financeSummary.pedidos_validos || 0} válidos</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Venda líquida</div>
              <div className="font-semibold text-gray-900">{formatCurrency(financeSummary.valor_liquido_vendido)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Descontos</div>
              <div className="font-semibold text-gray-900">{formatCurrency(financeSummary.descontos)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Operador</div>
              <div className="font-semibold text-gray-900">{cashInfo?.operador_nome || 'Não informado'}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 xl:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-gray-900 font-semibold">Conciliação</h3>
              <p className="text-xs text-gray-400">Venda líquida menos recebido, pendente e fiado criado</p>
            </div>
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${reconciliation.status_auditoria === 'CONCILIATED' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {auditStatusLabel(reconciliation.status_auditoria)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
            <div><div className="text-xs text-gray-400">Vendido</div><div className="font-semibold">{formatCurrency(reconciliation.total_vendido)}</div></div>
            <div><div className="text-xs text-gray-400">Recebido</div><div className="font-semibold">{formatCurrency(reconciliation.total_recebido_no_caixa)}</div></div>
            <div><div className="text-xs text-gray-400">Pendente</div><div className="font-semibold">{formatCurrency(reconciliation.valores_pendentes)}</div></div>
            <div><div className="text-xs text-gray-400">Fiado criado</div><div className="font-semibold">{formatCurrency(reconciliation.fiado_criado)}</div></div>
            <div><div className="text-xs text-gray-400">Diferença</div><div className="font-semibold">{formatCurrency(reconciliation.diferenca_conciliacao)}</div></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-4 xl:grid-cols-2">
        {[
          { title: 'Vendas por atendimento', rows: salesByFulfillment, label: fulfillmentLabel },
          { title: 'Vendas por origem', rows: salesBySource, label: sourceLabel },
        ].map(section => (
          <div key={section.title} className="bg-white rounded-lg border border-gray-200 p-4 overflow-x-auto">
            <h3 className="mb-3 text-gray-900 font-semibold">{section.title}</h3>
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-gray-400">
                  <th className="py-2">Tipo</th>
                  <th className="py-2 text-right">Pedidos</th>
                  <th className="py-2 text-right">Bruto</th>
                  <th className="py-2 text-right">Desconto</th>
                  <th className="py-2 text-right">Líquido</th>
                  <th className="py-2 text-right">Recebido</th>
                  <th className="py-2 text-right">Pendente</th>
                  <th className="py-2 text-right">Fiado</th>
                </tr>
              </thead>
              <tbody>
                {(section.rows.length ? section.rows : []).map((row: any) => (
                  <tr key={row.key || row.label} className="border-b last:border-0">
                    <td className="py-2 font-medium text-gray-800">{section.label(row.key) || row.label}</td>
                    <td className="py-2 text-right">{row.quantidade_pedidos || 0}</td>
                    <td className="py-2 text-right">{formatCurrency(row.valor_bruto)}</td>
                    <td className="py-2 text-right">{formatCurrency(row.descontos)}</td>
                    <td className="py-2 text-right font-semibold">{formatCurrency(row.valor_liquido)}</td>
                    <td className="py-2 text-right">{formatCurrency(row.valor_recebido)}</td>
                    <td className="py-2 text-right">{formatCurrency(row.valor_pendente)}</td>
                    <td className="py-2 text-right">{formatCurrency(row.valor_fiado)}</td>
                  </tr>
                ))}
                {section.rows.length === 0 && (
                  <tr><td colSpan={8} className="py-6 text-center text-gray-500">Nenhum dado financeiro no caixa atual.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 mt-4 xl:grid-cols-2">
        {[
          { title: 'Pagamentos por método', rows: paymentsByMethod, label: paymentMethodLabel },
          { title: 'Pagamentos por canal', rows: paymentsByChannel, label: paymentChannelLabel },
        ].map(section => (
          <div key={section.title} className="bg-white rounded-lg border border-gray-200 p-4 overflow-x-auto">
            <h3 className="mb-3 text-gray-900 font-semibold">{section.title}</h3>
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-gray-400">
                  <th className="py-2">Grupo</th>
                  <th className="py-2 text-right">Transações</th>
                  <th className="py-2 text-right">Recebido</th>
                  <th className="py-2 text-right">Pendente</th>
                  <th className="py-2 text-right">Fiado</th>
                  <th className="py-2 text-right">Estornos</th>
                </tr>
              </thead>
              <tbody>
                {(section.rows.length ? section.rows : []).map((row: any) => (
                  <tr key={row.key || row.label} className="border-b last:border-0">
                    <td className="py-2 font-medium text-gray-800">{section.label(row.key) || row.label}</td>
                    <td className="py-2 text-right">{row.quantidade_transacoes || 0}</td>
                    <td className="py-2 text-right font-semibold">{formatCurrency(row.valor_recebido)}</td>
                    <td className="py-2 text-right">{formatCurrency(row.valor_pendente)}</td>
                    <td className="py-2 text-right">{formatCurrency(row.valor_fiado)}</td>
                    <td className="py-2 text-right">{formatCurrency(row.estornos)}</td>
                  </tr>
                ))}
                {section.rows.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-gray-500">Nenhum pagamento no caixa atual.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div>
            <h3 className="text-gray-900 font-semibold">Drill-down do caixa</h3>
            <p className="text-xs text-gray-400">Pedidos e pagamentos que compõem os valores acima</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-2">Pedido</th>
                <th className="px-4 py-2">Origem</th>
                <th className="px-4 py-2">Atendimento</th>
                <th className="px-4 py-2 text-right">Líquido</th>
                <th className="px-4 py-2 text-right">Recebido</th>
                <th className="px-4 py-2 text-right">Pendente</th>
                <th className="px-4 py-2 text-right">Fiado</th>
                <th className="px-4 py-2 text-right">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {drilldownOrders.slice(0, 12).map((order: any) => (
                <tr key={order.pedido_id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium text-gray-800">{order.numero_pedido || order.pedido_id}</td>
                  <td className="px-4 py-2">{sourceLabel(order.order_source)}</td>
                  <td className="px-4 py-2">{fulfillmentLabel(order.fulfillment_type)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatCurrency(order.valor_liquido)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(order.valor_recebido)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(order.valor_pendente)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(order.valor_fiado)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(order.diferenca_conciliacao)}</td>
                </tr>
              ))}
              {drilldownOrders.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Nenhum pedido vinculado ao caixa atual.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Sales chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h3 className="text-gray-800 font-semibold">Pedidos por Hora</h3>
              <p className="text-gray-400 text-xs mt-0.5">
                Métrica operacional por dia, separada do caixa financeiro
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent outline-none"
                  aria-label="Data das métricas operacionais"
                />
              </div>
              <select
                value={salesIntervalMinutes}
                onChange={(e) => setSalesIntervalMinutes(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 outline-none"
                aria-label="Intervalo do gráfico de pedidos"
              >
                {salesIntervalOptions.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} min
                  </option>
                ))}
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={salesData.length ? salesData : [{ hour: '00:00', pedidos: 0 }]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(v: number) => [`${Number(v).toLocaleString('pt-BR')}`, 'Pedidos']}
              />
              <Line type="monotone" dataKey="pedidos" stroke={PRIMARY} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
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
                    <div className="text-xs text-gray-400">{formatBrasiliaTime(order.created_at)} · {order.tipo_entrega} · {order.pagamento?.metodo}</div>
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
