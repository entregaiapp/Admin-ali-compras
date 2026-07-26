import { useEffect, useState, type ElementType } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  HandCoins,
  Landmark,
  RefreshCw,
  ShoppingBag,
  Store,
  WalletCards,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  storeFinancialReportsService,
  type CaptureChannel,
  type FinancialStatus,
  type OrderSource,
  type PaymentMethod,
  type StoreFinancialDashboard,
  type StoreFinancialFilters,
} from '@/features/reports/services/storeFinancialReportsService';

const PRIMARY = '#122a4c';
const controlClass = 'h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50';

const sourceLabels: Record<string, string> = {
  CUSTOMER_APP: 'App ou link do cliente',
  ADMIN: 'Painel da loja',
  SALON: 'Atendimento no salão',
  UNKNOWN: 'Não identificado',
};

const captureLabels: Record<string, string> = {
  ONLINE_GATEWAY: 'Recebido online',
  EXTERNAL_OR_OFFLINE: 'Recebido fora do app',
  CREDIT_TAB: 'Fiado',
  UNDEFINED: 'Não identificado',
};

const methodLabels: Record<string, string> = {
  PIX: 'Pix',
  CARD: 'Cartão',
  CASH: 'Dinheiro',
  CREDIT_TAB: 'Fiado',
  UNDEFINED: 'Não identificado',
};

const statusLabels: Record<string, string> = {
  RECEIVED: 'Recebido',
  PENDING: 'Aguardando pagamento',
  REFUNDED: 'Devolvido',
  CANCELED: 'Cancelado',
  REJECTED: 'Recusado',
  EXPIRED: 'Vencido',
  UNDEFINED: 'Não identificado',
};

const formatCurrency = (value: number | string | null | undefined) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dateLabel = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

const percentage = (value: number | string | null | undefined) =>
  `${Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-0.5 text-sm text-gray-500">{description}</p>
    </div>
  );
}

function MoneyCard({
  title,
  value,
  description,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  description: string;
  icon: ElementType;
  color: string;
}) {
  return (
    <div className="flex min-h-36 flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <span className="rounded-lg bg-gray-50 p-2">
          <Icon className="h-4 w-4" style={{ color }} />
        </span>
      </div>
      <div className="mt-4">
        <div className="text-xl font-bold text-gray-900">{formatCurrency(value)}</div>
        <div className="mt-1 text-xs leading-4 text-gray-400">{description}</div>
      </div>
    </div>
  );
}

export function StoreFinancialOverview({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [filters, setFilters] = useState<Omit<StoreFinancialFilters, 'dataInicio' | 'dataFim'>>({
    dateType: 'payment',
    orderSource: '',
    captureChannel: '',
    paymentMethod: '',
    financialStatus: '',
  });
  const [data, setData] = useState<StoreFinancialDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await storeFinancialReportsService.get({
          dataInicio: startDate,
          dataFim: endDate,
          ...filters,
        });
        if (active) setData(result);
      } catch (requestError) {
        console.error('Error fetching store financial reports dashboard', requestError);
        if (active) setError('Não foi possível carregar os pagamentos deste período.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [endDate, filters, startDate]);

  const setFilter = <Key extends keyof typeof filters>(key: Key, value: (typeof filters)[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const summary = data?.resumo;
  const platform = data?.taxa_plataforma?.resumo;
  const storePlatform = data?.taxa_plataforma?.por_loja?.[0];
  const alerts = data?.alertas;
  const hasAlerts = Boolean(alerts && (
    alerts.origem_desconhecida !== 0
    || alerts.canal_indefinido !== 0
    || alerts.metodo_indefinido !== 0
    || alerts.fiado_sem_origem !== 0
    || alerts.diferenca_conciliacao !== 0
  ));

  return (
    <section className="space-y-5">
      <div className="rounded-xl bg-slate-900 p-5 text-white shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-300">Dinheiro da sua loja</p>
        <h2 className="mt-1 text-2xl font-bold">Visão geral dos pagamentos</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-300">
          Veja quanto foi recebido, o que ainda está pendente e como os clientes pagaram.
          Todos os números abaixo pertencem somente à sua loja.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900">Escolha o que deseja ver</h3>
          <p className="mt-0.5 text-xs text-gray-400">Os resultados são atualizados automaticamente.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-1.5 text-xs font-medium text-gray-600">
            <span>Usar a data do</span>
            <select value={filters.dateType} onChange={(event) => setFilter('dateType', event.target.value as 'payment' | 'order')} className={controlClass}>
              <option value="payment">Pagamento</option>
              <option value="order">Pedido</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium text-gray-600">
            <span>Pedido feito pelo</span>
            <select value={filters.orderSource} onChange={(event) => setFilter('orderSource', event.target.value as OrderSource | '')} className={controlClass}>
              <option value="">Todos</option>
              <option value="CUSTOMER_APP">Cliente</option>
              <option value="ADMIN">Painel da loja</option>
              <option value="SALON">Salão</option>
              <option value="UNKNOWN">Não identificado</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium text-gray-600">
            <span>Onde foi recebido</span>
            <select value={filters.captureChannel} onChange={(event) => setFilter('captureChannel', event.target.value as CaptureChannel | '')} className={controlClass}>
              <option value="">Todos</option>
              <option value="ONLINE_GATEWAY">Online</option>
              <option value="EXTERNAL_OR_OFFLINE">Fora do app ou na entrega</option>
              <option value="CREDIT_TAB">Fiado</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium text-gray-600">
            <span>Forma de pagamento</span>
            <select value={filters.paymentMethod} onChange={(event) => setFilter('paymentMethod', event.target.value as PaymentMethod | '')} className={controlClass}>
              <option value="">Todas</option>
              <option value="PIX">Pix</option>
              <option value="CARD">Cartão</option>
              <option value="CASH">Dinheiro</option>
              <option value="CREDIT_TAB">Fiado</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium text-gray-600">
            <span>Situação</span>
            <select value={filters.financialStatus} onChange={(event) => setFilter('financialStatus', event.target.value as FinancialStatus | '')} className={controlClass}>
              <option value="">Todas</option>
              {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex min-h-56 items-center justify-center rounded-xl border border-gray-200 bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-slate-900" />
        </div>
      ) : data && summary && platform && (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`}>
          <div className="space-y-3">
            <SectionTitle title="Resumo do dinheiro" description="Os principais valores do período escolhido." />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MoneyCard title="Total recebido" value={summary.total_efetivamente_recebido} description="Pagamentos recebidos mais valores de fiado que foram pagos." icon={CheckCircle2} color="#16a34a" />
              <MoneyCard title="Recebido nos pedidos" value={summary.valor_recebido} description="Pagamentos dos pedidos que já foram confirmados." icon={DollarSign} color="#059669" />
              <MoneyCard title="Valor após taxas online" value={summary.valor_liquido_recebido} description="O que restou depois das taxas cobradas no pagamento online." icon={Landmark} color="#0891b2" />
              <MoneyCard title="Aguardando pagamento" value={summary.valor_pendente} description="Valores registrados que ainda não foram recebidos." icon={Clock3} color="#d97706" />
              <MoneyCard title="Total registrado" value={summary.valor_registrado} description="Todos os pagamentos encontrados, em qualquer situação." icon={WalletCards} color="#475569" />
              <MoneyCard title="Taxas dos pagamentos online" value={summary.taxas_gateway} description="Custos cobrados pelo serviço que processou o pagamento." icon={CreditCard} color="#7c3aed" />
              <MoneyCard title="Valores devolvidos" value={summary.valor_estornado} description="Dinheiro devolvido ao cliente." icon={RefreshCw} color="#ea580c" />
              <MoneyCard title="Não recebidos" value={summary.valor_cancelado + summary.valor_rejeitado + summary.valor_expirado} description="Pagamentos cancelados, recusados ou vencidos." icon={AlertTriangle} color="#dc2626" />
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle title="De onde vieram as vendas" description="Compare os pedidos feitos pelo cliente, pelo painel da loja e pelo salão." />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(['CUSTOMER_APP', 'ADMIN', 'SALON', 'UNKNOWN'] as const).map((source) => {
                const bucket = data.por_origem.find((item) => item.key === source);
                return (
                  <div key={source} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 font-semibold text-gray-900">
                      {source === 'CUSTOMER_APP' ? <ShoppingBag className="h-4 w-4 text-violet-600" /> : <Store className="h-4 w-4 text-blue-600" />}
                      {sourceLabels[source]}
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between gap-3"><span className="text-gray-500">Recebido</span><strong>{formatCurrency(bucket?.valor_recebido)}</strong></div>
                      <div className="flex justify-between gap-3"><span className="text-gray-500">Aguardando</span><span>{formatCurrency(bucket?.valor_pendente)}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-gray-500">Devolvido</span><span>{formatCurrency(bucket?.valor_estornado)}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle title="Como os clientes pagaram" description="Cada linha mostra onde o pedido foi feito, onde o pagamento foi recebido e a forma usada." />
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Pedido feito por</th>
                      <th className="px-4 py-3 text-left">Onde recebeu</th>
                      <th className="px-4 py-3 text-left">Forma</th>
                      <th className="px-4 py-3 text-right">Recebido</th>
                      <th className="px-4 py-3 text-right">Aguardando</th>
                      <th className="px-4 py-3 text-right">Devolvido</th>
                      <th className="px-4 py-3 text-right">Após taxas online</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.matriz_canais.map((row) => (
                      <tr key={`${row.order_source}-${row.payment_capture_channel}-${row.payment_method}`}>
                        <td className="px-4 py-3 font-medium text-gray-800">{sourceLabels[row.order_source] || row.order_source}</td>
                        <td className="px-4 py-3 text-gray-600">{captureLabels[row.payment_capture_channel] || row.payment_capture_channel}</td>
                        <td className="px-4 py-3 text-gray-600">{methodLabels[row.payment_method] || row.payment_method}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatCurrency(row.valor_recebido)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(row.valor_pendente)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(row.valor_estornado)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(row.valor_liquido_recebido)}</td>
                      </tr>
                    ))}
                    {data.matriz_canais.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Nenhum pagamento encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900">Valores recebidos por dia</h3>
              <p className="mt-0.5 text-xs text-gray-400">Separados pelo lugar onde o pedido foi feito.</p>
              <div className="mt-4">
                {data.evolucao_diaria.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-sm text-gray-500">Nenhum valor recebido.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.evolucao_diaria}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="data" tickFormatter={dateLabel} tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(value) => Number(value).toLocaleString('pt-BR', { notation: 'compact' })} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number | string) => formatCurrency(value)} labelFormatter={(label) => dateLabel(String(label))} />
                      <Legend />
                      <Bar dataKey="app" name="Cliente" stackId="recebido" fill="#7c3aed" />
                      <Bar dataKey="admin" name="Painel da loja" stackId="recebido" fill="#2563eb" />
                      <Bar dataKey="salao" name="Salão" stackId="recebido" fill="#d97706" />
                      <Bar dataKey="desconhecido" name="Não identificado" stackId="recebido" fill="#dc2626" />
                      <Bar dataKey="fiado" name="Fiado pago" stackId="recebido" fill="#059669" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900">Onde os pedidos foram feitos</h3>
              <p className="mt-0.5 text-xs text-gray-400">Porcentagem de pedidos do cliente e do painel da loja.</p>
              <div className="mt-4">
                {data.evolucao_percentual_pedidos.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-sm text-gray-500">Nenhum pedido encontrado.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={data.evolucao_percentual_pedidos}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="data" tickFormatter={dateLabel} tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tickFormatter={percentage} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number | string) => percentage(value)} labelFormatter={(label) => dateLabel(String(label))} />
                      <Legend />
                      <Line type="monotone" dataKey="percentual_app" name="Cliente" stroke="#7c3aed" strokeWidth={3} />
                      <Line type="monotone" dataKey="percentual_admin" name="Painel da loja" stroke="#2563eb" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle title="Taxa de uso da plataforma" description="Veja o que já foi descontado online e o que ainda será cobrado da loja." />
            {storePlatform?.regra_split && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Regra atual: <strong>{storePlatform.regra_split.nome || 'Taxa da plataforma'}</strong>
                {' · '}
                {storePlatform.regra_split.tipo_valor === 'percentual'
                  ? `${storePlatform.regra_split.valor}%`
                  : formatCurrency(storePlatform.regra_split.valor)}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MoneyCard title="Vendas usadas no cálculo" value={platform.base_elegivel} description="Parte das vendas em que a taxa da plataforma é aplicada." icon={DollarSign} color="#2563eb" />
              <MoneyCard title="Taxa calculada" value={platform.taxa_calculada} description="Valor calculado pela regra atual da sua loja." icon={HandCoins} color="#4f46e5" />
              <MoneyCard title="Taxa final" value={platform.taxa_liquida} description="Taxa após descontar devoluções feitas aos clientes." icon={Landmark} color="#7c3aed" />
              <MoneyCard title="Já descontado online" value={platform.split_recebido} description="Parte da taxa que já foi separada no pagamento online." icon={CheckCircle2} color="#16a34a" />
              <MoneyCard title="Desconto online aguardando" value={platform.split_pendente} description="Parte da taxa online que ainda está sendo processada." icon={Clock3} color="#d97706" />
              <MoneyCard title="Taxa a pagar" value={platform.valor_a_cobrar} description="Taxa de vendas recebidas fora do app ou na entrega." icon={Store} color="#ea580c" />
              <MoneyCard title="Taxa retirada por devoluções" value={platform.taxa_estornada} description="Parte da taxa cancelada porque houve devolução." icon={RefreshCw} color="#dc2626" />
              <MoneyCard title="Valor para conferir" value={platform.diferenca_conciliacao} description={platform.diferenca_conciliacao === 0 ? 'Os valores estão conferindo.' : 'Há um valor que precisa ser conferido.'} icon={AlertTriangle} color={platform.diferenca_conciliacao === 0 ? '#16a34a' : '#dc2626'} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <SectionTitle title="Vendas fiadas" description="Valores vendidos no fiado e pagamentos recebidos depois." />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-3"><div className="text-xs text-gray-500">Vendido fiado</div><div className="mt-1 font-bold text-gray-900">{formatCurrency(data.fiado.valor_lancado)}</div></div>
                <div className="rounded-lg bg-gray-50 p-3"><div className="text-xs text-gray-500">Ainda falta receber</div><div className="mt-1 font-bold text-gray-900">{formatCurrency(data.fiado.saldo_pendente)}</div></div>
                <div className="rounded-lg bg-gray-50 p-3"><div className="text-xs text-gray-500">Fiado recebido</div><div className="mt-1 font-bold text-gray-900">{formatCurrency(data.fiado.valor_recebido)}</div></div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <SectionTitle title="Situação dos pagamentos" description="Quanto há em cada situação no período." />
              <div className="mt-4 space-y-2">
                {data.por_situacao.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    <span className="text-gray-600">{statusLabels[item.key] || item.label || item.key}</span>
                    <strong className="text-gray-900">{formatCurrency(item.valor_registrado)}</strong>
                  </div>
                ))}
                {data.por_situacao.length === 0 && <p className="py-5 text-center text-sm text-gray-500">Nenhum pagamento encontrado.</p>}
              </div>
            </div>
          </div>

          {hasAlerts && alerts && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-amber-900">
                <AlertTriangle className="h-4 w-4" />
                Valores que precisam ser conferidos
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {alerts.origem_desconhecida !== 0 && <div className="rounded-lg bg-white/70 p-3 text-sm"><span className="text-amber-800">Pedido sem origem</span><strong className="mt-1 block">{formatCurrency(alerts.origem_desconhecida)}</strong></div>}
                {alerts.canal_indefinido !== 0 && <div className="rounded-lg bg-white/70 p-3 text-sm"><span className="text-amber-800">Local do pagamento não identificado</span><strong className="mt-1 block">{formatCurrency(alerts.canal_indefinido)}</strong></div>}
                {alerts.metodo_indefinido !== 0 && <div className="rounded-lg bg-white/70 p-3 text-sm"><span className="text-amber-800">Forma não identificada</span><strong className="mt-1 block">{formatCurrency(alerts.metodo_indefinido)}</strong></div>}
                {alerts.fiado_sem_origem !== 0 && <div className="rounded-lg bg-white/70 p-3 text-sm"><span className="text-amber-800">Fiado pago sem pedido ligado</span><strong className="mt-1 block">{formatCurrency(alerts.fiado_sem_origem)}</strong></div>}
                {alerts.diferenca_conciliacao !== 0 && <div className="rounded-lg bg-white/70 p-3 text-sm"><span className="text-amber-800">Valor que não confere</span><strong className="mt-1 block text-red-600">{formatCurrency(alerts.diferenca_conciliacao)}</strong></div>}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
