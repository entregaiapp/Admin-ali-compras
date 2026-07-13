import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, ShoppingCart, Users, XCircle, DollarSign, BarChart3, Calendar, FileText, Download, Eye, ArrowLeft, Printer, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/shared/lib/api';
import { dateInputInBrasilia } from '@/shared/lib/dateTime';
import { systemToast } from '@/shared/components/SystemToast';
import { useNavigate } from 'react-router';
import {
  deliveryPaymentReportsService,
  type DeliveryPaymentBillingReport
} from '@/features/reports/services/deliveryPaymentReportsService';

const PRIMARY = '#122a4c';
const COLORS = [PRIMARY, '#2563eb', '#7c3aed', '#16a34a', '#d97706', '#ea580c'];
const DAY_MS = 24 * 60 * 60 * 1000;
const SOLD_PRODUCTS_PER_PAGE = 20;

type SoldProduct = {
  produto_key: string;
  produto_loja_id?: string | null;
  produto_id?: string | null;
  nome: string;
  unidade_medida: string;
  tipo_venda: string;
  quantidade_vendida: number;
  faturamento_total: number;
  preco_medio: number;
  pedidos: number;
};

type SoldProductsPayload = {
  data: SoldProduct[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
  resumo: {
    quantidade_total: number;
    faturamento_total: number;
  };
};

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatChartLabel = (date: Date, endDate?: Date) => {
  const sameMonth = endDate && date.getMonth() === endDate.getMonth() && date.getFullYear() === endDate.getFullYear();
  return date.toLocaleDateString('pt-BR', sameMonth ? { day: '2-digit' } : { day: '2-digit', month: '2-digit' });
};

const formatCurrency = (value: number | string | null | undefined) => {
  const numericValue = typeof value === 'number' ? value : Number(value || 0);
  return numericValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const escapePrintHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const openPrintDocument = (title: string, body: string) => {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    systemToast.error('Não foi possível abrir a janela de impressão. Verifique se o navegador bloqueou pop-ups.');
    return false;
  }

  printWindow.document.write(`<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>${escapePrintHtml(title)}</title>
        <style>
          *{box-sizing:border-box}
          body{font-family:Arial,sans-serif;margin:0;background:#fff;color:#111827}
          main{padding:24px;max-width:960px;margin:0 auto}
          h1{font-size:22px;margin:0 0 4px}
          h2{font-size:16px;margin:24px 0 10px}
          .muted{color:#6b7280;font-size:12px}
          .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:16px}
          .card{border:1px solid #e5e7eb;border-radius:8px;padding:12px}
          .label{font-size:11px;color:#6b7280}
          .value{font-size:18px;font-weight:700;margin-top:4px}
          table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
          th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left;vertical-align:top}
          th{text-transform:uppercase;font-size:10px;color:#6b7280;background:#f9fafb}
          td.num,th.num{text-align:right}
          @media print{main{padding:12px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.no-break{break-inside:avoid}}
        </style>
      </head>
      <body>
        <main>${body}</main>
        <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
      </body>
    </html>`);
  printWindow.document.close();
  return true;
};

const reportOriginLabel = (value?: string | null) => {
  const labels: Record<string, string> = {
    cliente: 'Cliente',
    manual: 'Manual',
    fiado: 'Fiado',
    salao: 'Salão',
  };
  return labels[String(value || '').toLowerCase()] || String(value || 'Indefinido');
};

const buildDeliveryPaymentReportCsv = (report: DeliveryPaymentBillingReport) => {
  const rows = [
    ['Relatório', report.loja?.nome || 'Estabelecimento'],
    ['Período', `${formatDate(report.periodo.data_inicio)} até ${formatDate(report.periodo.data_fim)}`],
    ['Gerado em', formatDateTime(report.gerado_em)],
    ['Valor final da cobrança', report.resumo.valor_final_cobranca],
    ['Pedidos de clientes', report.resumo.quantidade_pedidos_clientes],
    ['Pedidos manuais', report.resumo.quantidade_pedidos_manuais],
    ['Pedidos fiado', report.resumo.quantidade_pedidos_fiados || 0],
    ['Pedidos salão', report.resumo.quantidade_pedidos_salao || 0],
    [],
    ['Número', 'Data', 'Origem', 'Categoria', 'Status', 'Forma de pagamento', 'Fiado', 'Taxa registrada', 'Total do pedido', 'Valor de cobrança'],
    ...report.pedidos.map((pedido) => [
      pedido.numero_pedido || pedido.id,
      formatDate(pedido.data),
      reportOriginLabel(pedido.origem_relatorio),
      pedido.categoria_cobranca_label || pedido.categoria_cobranca || '',
      pedido.status,
      pedido.forma_pagamento,
      pedido.pedido_fiado ? 'sim' : 'não',
      pedido.aplicado_taxa ? 'sim' : 'não',
      pedido.total,
      pedido.valor_cobranca
    ]),
    [],
    ['Resumo final'],
    ['Valor bruto total', report.resumo.valor_bruto_total],
    ['Valor final da cobrança', report.resumo.valor_final_cobranca],
  ];

  return rows.map((row) => row.map(csvCell).join(';')).join('\n');
};

const downloadDeliveryPaymentReportCsv = (report: DeliveryPaymentBillingReport) => {
  const csv = buildDeliveryPaymentReportCsv(report);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio-pagamentos-entrega-${report.periodo.data_inicio}-${report.periodo.data_fim}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const printDeliveryPaymentReport = (report: DeliveryPaymentBillingReport) => {
  const title = `Relatório de pagamentos na entrega`;
  const body = `
    <h1>Relatório de pagamentos na entrega</h1>
    <div class="muted">${escapePrintHtml(report.loja?.nome || 'Estabelecimento')}</div>
    <div class="muted">Período: ${escapePrintHtml(formatDate(report.periodo.data_inicio))} até ${escapePrintHtml(formatDate(report.periodo.data_fim))}</div>
    <div class="muted">Gerado em ${escapePrintHtml(formatDateTime(report.gerado_em))}${report.gerado_por?.nome ? ` por ${escapePrintHtml(report.gerado_por.nome)}` : ''}</div>

    <section class="grid no-break">
      <div class="card"><div class="label">Valor da cobrança</div><div class="value">${escapePrintHtml(formatCurrency(report.resumo.valor_final_cobranca))}</div></div>
      <div class="card"><div class="label">Valor bruto total</div><div class="value">${escapePrintHtml(formatCurrency(report.resumo.valor_bruto_total))}</div></div>
      <div class="card"><div class="label">Pedidos de clientes</div><div class="value">${escapePrintHtml(report.resumo.quantidade_pedidos_clientes || 0)}</div></div>
      <div class="card"><div class="label">Pedidos manuais</div><div class="value">${escapePrintHtml(report.resumo.quantidade_pedidos_manuais || 0)}</div></div>
      <div class="card"><div class="label">Pedidos fiado</div><div class="value">${escapePrintHtml(report.resumo.quantidade_pedidos_fiados || 0)}</div></div>
      <div class="card"><div class="label">Pedidos salão</div><div class="value">${escapePrintHtml(report.resumo.quantidade_pedidos_salao || 0)}</div></div>
    </section>

    <h2>Resumo diário</h2>
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th class="num">Clientes</th>
          <th class="num">Manuais</th>
          <th class="num">Fiados</th>
          <th class="num">Salão</th>
          <th class="num">Valor bruto</th>
          <th class="num">A receber</th>
        </tr>
      </thead>
      <tbody>
        ${report.dias.map((day) => `
          <tr>
            <td>${escapePrintHtml(formatDate(day.data))}</td>
            <td class="num">${escapePrintHtml(day.quantidade_pedidos_clientes || 0)}</td>
            <td class="num">${escapePrintHtml(day.quantidade_pedidos_manuais || 0)}</td>
            <td class="num">${escapePrintHtml(day.quantidade_pedidos_fiados || 0)}</td>
            <td class="num">${escapePrintHtml(day.quantidade_pedidos_salao || 0)}</td>
            <td class="num">${escapePrintHtml(formatCurrency(day.valor_bruto_total))}</td>
            <td class="num">${escapePrintHtml(formatCurrency(day.valor_a_receber))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>Pedidos do relatório</h2>
    <table>
      <thead>
        <tr>
          <th>Pedido</th>
          <th>Data</th>
          <th>Origem</th>
          <th>Categoria</th>
          <th>Status</th>
          <th class="num">Total</th>
          <th class="num">Cobrança</th>
        </tr>
      </thead>
      <tbody>
        ${report.pedidos.map((pedido) => `
          <tr>
            <td>${escapePrintHtml(pedido.numero_pedido || pedido.id)}</td>
            <td>${escapePrintHtml(formatDate(pedido.data))}</td>
            <td>${escapePrintHtml(reportOriginLabel(pedido.origem_relatorio))}</td>
            <td>${escapePrintHtml(pedido.categoria_cobranca_label || pedido.categoria_cobranca || '-')}</td>
            <td>${escapePrintHtml(pedido.status)}</td>
            <td class="num">${escapePrintHtml(formatCurrency(pedido.total))}</td>
            <td class="num">${escapePrintHtml(formatCurrency(pedido.valor_cobranca))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  return openPrintDocument(title, body);
};

const getSalesPointDate = (point: any) => {
  const value = point?.date || point?.data || point?.dia || point?.created_at || point?.periodo;
  if (!value || typeof value !== 'string') return null;

  const date = value.includes('T') ? new Date(value) : parseLocalDate(value.slice(0, 10));
  return Number.isNaN(date.getTime()) ? null : date;
};

const getSalesPointValue = (point: any) => {
  const value = point?.vendas ?? point?.valor ?? point?.total ?? point?.revenue ?? 0;
  const number = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : 0;
};

const buildSalesChartData = (rawData: any[], startDate: string, endDate: string) => {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const safeEnd = end >= start ? end : start;
  const totalDays = Math.max(1, Math.floor((safeEnd.getTime() - start.getTime()) / DAY_MS) + 1);
  const bucketSize = totalDays <= 14 ? 1 : Math.ceil(totalDays / 12);
  const bucketCount = Math.ceil(totalDays / bucketSize);

  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = addDays(start, index * bucketSize);
    const bucketEnd = addDays(bucketStart, Math.min(bucketSize, totalDays - index * bucketSize) - 1);
    const label = bucketSize === 1
      ? formatChartLabel(bucketStart, safeEnd)
      : `${formatChartLabel(bucketStart, safeEnd)}-${formatChartLabel(bucketEnd, safeEnd)}`;

    return {
      day: label,
      vendas: 0,
      start: formatDateInput(bucketStart),
      end: formatDateInput(bucketEnd)
    };
  });

  const dataWithDates = rawData.filter(point => getSalesPointDate(point));

  if (dataWithDates.length > 0) {
    dataWithDates.forEach((point) => {
      const pointDate = getSalesPointDate(point);
      if (!pointDate || pointDate < start || pointDate > safeEnd) return;
      const bucketIndex = Math.min(
        bucketCount - 1,
        Math.floor((pointDate.getTime() - start.getTime()) / DAY_MS / bucketSize)
      );
      buckets[bucketIndex].vendas += getSalesPointValue(point);
    });
    return buckets;
  }

  if (rawData.length === bucketCount) {
    return buckets.map((bucket, index) => ({ ...bucket, vendas: getSalesPointValue(rawData[index]) }));
  }

  if (rawData.length === 1 && bucketCount === 1) {
    return [{ ...buckets[0], vendas: getSalesPointValue(rawData[0]) }];
  }

  return buckets;
};

export function ReportsScreen() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filtro de data, padrão: hoje
  const today = dateInputInBrasilia();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [showGeneratedReports, setShowGeneratedReports] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<DeliveryPaymentBillingReport[]>([]);
  const [selectedGeneratedReport, setSelectedGeneratedReport] = useState<DeliveryPaymentBillingReport | null>(null);
  const [generatedReportsLoading, setGeneratedReportsLoading] = useState(false);
  const [selectedReportLoading, setSelectedReportLoading] = useState(false);
  const [generatedReportsError, setGeneratedReportsError] = useState('');
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [soldProductsLoading, setSoldProductsLoading] = useState(false);
  const [soldProductsError, setSoldProductsError] = useState('');
  const [soldProductsSearch, setSoldProductsSearch] = useState('');
  const [soldProductsPage, setSoldProductsPage] = useState(1);
  const [soldProductsPagination, setSoldProductsPagination] = useState({
    page: 1,
    perPage: SOLD_PRODUCTS_PER_PAGE,
    total: 0,
    totalPages: 0,
  });
  const [soldProductsSummary, setSoldProductsSummary] = useState({
    quantidade_total: 0,
    faturamento_total: 0,
  });

  const loadGeneratedReportDetail = async (reportId: string) => {
    setSelectedReportLoading(true);
    setGeneratedReportsError('');
    try {
      const report = await deliveryPaymentReportsService.getById(reportId);
      setSelectedGeneratedReport(report);
    } catch (error) {
      console.error('Error fetching generated delivery payment report detail', error);
      if ((error as any).response?.status === 401) {
        navigate('/login');
        return;
      }
      setGeneratedReportsError('Não foi possível carregar o relatório selecionado.');
    } finally {
      setSelectedReportLoading(false);
    }
  };

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

  useEffect(() => {
    setSoldProductsPage(1);
  }, [startDate, endDate, soldProductsSearch]);

  useEffect(() => {
    if (showGeneratedReports) return;

    const fetchSoldProducts = async () => {
      setSoldProductsLoading(true);
      setSoldProductsError('');

      try {
        const response = await api.get('/metricas/produtos-vendidos', {
          params: {
            dataInicio: startDate,
            dataFim: endDate,
            busca: soldProductsSearch.trim() || undefined,
            page: soldProductsPage,
            perPage: SOLD_PRODUCTS_PER_PAGE,
            ordenarPor: 'faturamento',
          },
        });
        const payload = response.data.data as SoldProductsPayload;
        setSoldProducts(payload.data || []);
        setSoldProductsPagination(payload.pagination || {
          page: soldProductsPage,
          perPage: SOLD_PRODUCTS_PER_PAGE,
          total: 0,
          totalPages: 0,
        });
        setSoldProductsSummary(payload.resumo || {
          quantidade_total: 0,
          faturamento_total: 0,
        });
      } catch (error) {
        console.error('Error fetching sold products report', error);
        if ((error as any).response?.status === 401) {
          navigate('/login');
          return;
        }
        setSoldProducts([]);
        setSoldProductsPagination({
          page: soldProductsPage,
          perPage: SOLD_PRODUCTS_PER_PAGE,
          total: 0,
          totalPages: 0,
        });
        setSoldProductsSummary({
          quantidade_total: 0,
          faturamento_total: 0,
        });
        setSoldProductsError('Não foi possível carregar os produtos vendidos.');
      } finally {
        setSoldProductsLoading(false);
      }
    };

    const timer = window.setTimeout(fetchSoldProducts, 300);
    return () => window.clearTimeout(timer);
  }, [navigate, showGeneratedReports, startDate, endDate, soldProductsSearch, soldProductsPage]);

  useEffect(() => {
    if (!showGeneratedReports) return;

    const fetchGeneratedReports = async () => {
      setGeneratedReportsLoading(true);
      setGeneratedReportsError('');
      try {
        const reports = await deliveryPaymentReportsService.list();
        setGeneratedReports(reports);
        const currentStillExists = selectedGeneratedReport && reports.some((report) => report.id === selectedGeneratedReport.id);
        const nextReportId = currentStillExists ? selectedGeneratedReport.id : reports[0]?.id;
        if (nextReportId) {
          await loadGeneratedReportDetail(nextReportId);
        } else {
          setSelectedGeneratedReport(null);
        }
      } catch (error) {
        console.error('Error fetching generated delivery payment reports', error);
        if ((error as any).response?.status === 401) {
          navigate('/login');
          return;
        }
        setGeneratedReportsError('Não foi possível carregar os relatórios gerados.');
      } finally {
        setGeneratedReportsLoading(false);
      }
    };

    fetchGeneratedReports();
  }, [navigate, showGeneratedReports]);

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

  const rawSalesData = Array.isArray(metrics?.vendasSemana) ? metrics.vendasSemana : [];
  const salesData = buildSalesChartData(rawSalesData, startDate, endDate);
  const salesIntervalLabel = startDate === endDate ? 'Hoje' : `${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}`;
  const categoryRevenueData = metrics?.categoryRevenueData || [];
  const topProducts = metrics?.topProdutos || [];
  const hourlyData = metrics?.hourlyData || [];
  const soldProductsStart = soldProductsPagination.total > 0
    ? (soldProductsPagination.page - 1) * soldProductsPagination.perPage + 1
    : 0;
  const soldProductsEnd = soldProductsPagination.total > 0
    ? Math.min(soldProductsPagination.page * soldProductsPagination.perPage, soldProductsPagination.total)
    : 0;

  const printOperationalReport = () => {
    const periodLabel = startDate === endDate
      ? formatDate(startDate)
      : `${formatDate(startDate)} até ${formatDate(endDate)}`;
    const body = `
      <h1>Relatórios operacionais</h1>
      <div class="muted">Pedidos, produtos e movimento por período. Não substitui o caixa financeiro conciliado.</div>
      <div class="muted">Período: ${escapePrintHtml(periodLabel)}</div>
      <div class="muted">Impresso em ${escapePrintHtml(formatDateTime(new Date().toISOString()))}</div>

      <section class="grid no-break">
        <div class="card"><div class="label">GMV operacional</div><div class="value">${escapePrintHtml(formatCurrency(faturamentoTotal))}</div></div>
        <div class="card"><div class="label">Pedidos</div><div class="value">${escapePrintHtml(pedidosTotal)}</div></div>
        <div class="card"><div class="label">Ticket médio</div><div class="value">${escapePrintHtml(formatCurrency(ticketMedio))}</div></div>
        <div class="card"><div class="label">Novos clientes</div><div class="value">${escapePrintHtml(metrics?.novosClientes || 0)}</div></div>
        <div class="card"><div class="label">Cancelamentos</div><div class="value">${escapePrintHtml(taxaCancelamento)}%</div></div>
      </section>

      <h2>GMV operacional por dia</h2>
      <table>
        <thead><tr><th>Período</th><th class="num">GMV operacional</th></tr></thead>
        <tbody>
          ${salesData.map((item) => `
            <tr>
              <td>${escapePrintHtml(item.day)}</td>
              <td class="num">${escapePrintHtml(formatCurrency(item.vendas))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>Produtos mais vendidos</h2>
      <table>
        <thead><tr><th>Produto</th><th class="num">Quantidade</th><th class="num">Receita</th></tr></thead>
        <tbody>
          ${topProducts.length > 0 ? topProducts.map((product: any) => `
            <tr>
              <td>${escapePrintHtml(product.name)}</td>
              <td class="num">${escapePrintHtml(product.qty)}</td>
              <td class="num">${escapePrintHtml(formatCurrency(product.revenue))}</td>
            </tr>
          `).join('') : '<tr><td colspan="3">Nenhum produto vendido no período.</td></tr>'}
        </tbody>
      </table>
    `;

    openPrintDocument('Relatórios e análises', body);
  };

  return (
    <div className="p-5 space-y-5 overflow-y-auto flex-1 h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-gray-900 font-semibold text-xl">Relatórios Operacionais</h2>
          <p className="text-gray-500 text-sm mt-0.5">Pedidos, produtos e movimento por período. A conciliação financeira fica no caixa.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {!showGeneratedReports && (
            <button
              type="button"
              onClick={printOperationalReport}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowGeneratedReports((value) => !value)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            {showGeneratedReports ? <ArrowLeft className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {showGeneratedReports ? 'Voltar aos indicadores' : 'Relatórios gerados do meu estabelecimento'}
          </button>
          {!showGeneratedReports && (
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
          )}
        </div>
      </div>

      {showGeneratedReports && (
        <div className="space-y-5">
          {generatedReportsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {generatedReportsError}
            </div>
          )}

          {generatedReportsLoading ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 shadow-sm flex justify-center">
              <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }} />
            </div>
          ) : generatedReports.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 shadow-sm text-center">
              <FileText className="mx-auto h-10 w-10 text-gray-300" />
              <h3 className="mt-3 text-base font-semibold text-gray-800">Nenhum relatório gerado</h3>
              <p className="mt-1 text-sm text-gray-500">
                Os relatórios criados pelo superadmin aparecerão aqui para conferência e download.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-3">
                  <h3 className="font-semibold text-gray-800">Relatórios salvos</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Cobranças de pagamentos na entrega</p>
                </div>
                <div className="divide-y divide-gray-100 max-h-[640px] overflow-y-auto">
                  {generatedReports.map((report) => {
                    const active = selectedGeneratedReport?.id === report.id;
                    return (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => loadGeneratedReportDetail(report.id)}
                        className={`w-full text-left px-4 py-3 transition-colors ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-sm text-gray-900">
                              {formatDate(report.periodo.data_inicio)} até {formatDate(report.periodo.data_fim)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Gerado em {formatDateTime(report.gerado_em)}
                            </div>
                          </div>
                          <div className="text-right text-sm font-semibold text-gray-900">
                            {formatCurrency(report.resumo.valor_final_cobranca)}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
                          <span className="rounded-md bg-gray-100 px-2 py-1">{report.resumo.quantidade_pedidos_clientes} clientes</span>
                          <span className="rounded-md bg-gray-100 px-2 py-1">{report.resumo.quantidade_pedidos_manuais} manuais</span>
                          <span className="rounded-md bg-gray-100 px-2 py-1">{report.resumo.quantidade_pedidos_fiados || 0} fiado</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedReportLoading ? (
                <div className="bg-white border border-gray-200 rounded-xl p-10 shadow-sm flex justify-center">
                  <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }} />
                </div>
              ) : selectedGeneratedReport && (
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-full px-3 py-1">
                          <Eye className="h-3.5 w-3.5" />
                          Relatório salvo
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-gray-900">
                          Pagamentos na entrega de {formatDate(selectedGeneratedReport.periodo.data_inicio)} até {formatDate(selectedGeneratedReport.periodo.data_fim)}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Gerado em {formatDateTime(selectedGeneratedReport.gerado_em)}
                          {selectedGeneratedReport.gerado_por?.nome ? ` por ${selectedGeneratedReport.gerado_por.nome}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => printDeliveryPaymentReport(selectedGeneratedReport)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        <Printer className="h-4 w-4" />
                        Imprimir relatório
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadDeliveryPaymentReportCsv(selectedGeneratedReport)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
                        style={{ backgroundColor: PRIMARY }}
                      >
                        <Download className="h-4 w-4" />
                        Baixar relatório
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    {[
                      { label: 'Valor da cobrança', value: formatCurrency(selectedGeneratedReport.resumo.valor_final_cobranca), icon: DollarSign, color: PRIMARY },
                      { label: 'Pedidos de clientes', value: String(selectedGeneratedReport.resumo.quantidade_pedidos_clientes || 0), icon: ShoppingCart, color: '#2563eb' },
                      { label: 'Pedidos manuais', value: String(selectedGeneratedReport.resumo.quantidade_pedidos_manuais || 0), icon: FileText, color: '#7c3aed' },
                      { label: 'Pedidos fiado', value: String(selectedGeneratedReport.resumo.quantidade_pedidos_fiados || 0), icon: FileText, color: '#0f766e' },
                      { label: 'Valor bruto total', value: formatCurrency(selectedGeneratedReport.resumo.valor_bruto_total), icon: BarChart3, color: '#16a34a' },
                    ].map((item) => (
                      <div key={item.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <item.icon className="w-5 h-5 mb-3" style={{ color: item.color }} />
                        <div className="font-semibold text-gray-900 text-lg leading-tight">{item.value}</div>
                        <div className="text-sm text-gray-500 mt-1">{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-800">Resumo diário</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                          <tr>
                            <th className="px-4 py-3 text-left">Data</th>
                            <th className="px-4 py-3 text-right">Clientes</th>
                            <th className="px-4 py-3 text-right">Manuais</th>
                            <th className="px-4 py-3 text-right">Fiados</th>
                            <th className="px-4 py-3 text-right">Salao</th>
                            <th className="px-4 py-3 text-right">Valor bruto</th>
                            <th className="px-4 py-3 text-right">A receber</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedGeneratedReport.dias.map((day) => (
                            <tr key={day.data}>
                              <td className="px-4 py-3 font-medium text-gray-800">{formatDate(day.data)}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{day.quantidade_pedidos_clientes}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{day.quantidade_pedidos_manuais}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{day.quantidade_pedidos_fiados || 0}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{day.quantidade_pedidos_salao || 0}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(day.valor_bruto_total)}</td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(day.valor_a_receber)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-800">Pedidos do relatório</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Pedidos manuais de entrega podem compor a cobrança final; retirada manual aparece apenas para conferência.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                          <tr>
                            <th className="px-4 py-3 text-left">Pedido</th>
                            <th className="px-4 py-3 text-left">Data</th>
                            <th className="px-4 py-3 text-left">Origem</th>
                            <th className="px-4 py-3 text-left">Categoria</th>
                            <th className="px-4 py-3 text-left">Fiado</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-right">Total</th>
                            <th className="px-4 py-3 text-right">Cobrança</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedGeneratedReport.pedidos.map((pedido) => (
                            <tr key={pedido.id}>
                              <td className="px-4 py-3 font-medium text-gray-800">{pedido.numero_pedido || pedido.id}</td>
                              <td className="px-4 py-3 text-gray-600">{formatDate(pedido.data)}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2 py-1 text-xs font-medium ${pedido.origem_relatorio === 'manual' ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'}`}>
                                  {reportOriginLabel(pedido.origem_relatorio)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{pedido.categoria_cobranca_label || pedido.categoria_cobranca || '-'}</td>
                              <td className="px-4 py-3 text-gray-600">{pedido.pedido_fiado ? 'Sim' : 'Não'}</td>
                              <td className="px-4 py-3 text-gray-600">{pedido.status}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(pedido.total)}</td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(pedido.valor_cobranca)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!showGeneratedReports && (
        <>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'GMV operacional', value: formatCurrency(faturamentoTotal), sub: 'Pedidos do período', color: PRIMARY, icon: DollarSign },
          { label: 'Pedidos', value: pedidosTotal.toString(), sub: 'No período', color: '#2563eb', icon: ShoppingCart },
          { label: 'Ticket médio', value: formatCurrency(ticketMedio), sub: 'Por pedido', color: '#7c3aed', icon: TrendingUp },
          { label: 'Novos Clientes', value: metrics?.novosClientes?.toString() || '0', sub: 'No período', color: '#16a34a', icon: Users },
          { label: 'Cancelamentos', value: `${taxaCancelamento}%`, sub: 'Taxa no período', color: '#d97706', icon: XCircle },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <kpi.icon className="w-5 h-5 mb-3" style={{ color: kpi.color }} />
            <div className="font-semibold text-gray-800 text-lg leading-tight">{kpi.value}</div>
            <div className="text-sm text-gray-500 mt-1">{kpi.label}</div>
            <div className="text-xs font-medium mt-1.5 text-gray-400">{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Estes relatórios são operacionais e usam pedidos por período. Valores recebidos, fiado, estornos e divergências devem ser conferidos no caixa financeiro conciliado.
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">GMV operacional por dia</h3>
              <p className="text-xs text-gray-400 mt-0.5">Evolução no período selecionado</p>
            </div>
            <div className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white">
              {salesIntervalLabel}
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
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'GMV operacional']} />
              <Area type="monotone" dataKey="vendas" stroke={PRIMARY} strokeWidth={3} fill="url(#repGrad)" activeDot={{ r: 6, fill: PRIMARY }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Categories pie */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-1">Vendas por Categoria</h3>
          <p className="text-xs text-gray-400 mb-4">Participação no GMV operacional</p>
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

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">Produtos vendidos no período</h3>
              <p className="text-xs text-gray-400 mt-0.5">Quantidade vendida e GMV operacional por produto no intervalo selecionado.</p>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={soldProductsSearch}
                onChange={(event) => setSoldProductsSearch(event.target.value)}
                placeholder="Buscar produto..."
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-gray-100"
              />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Produtos encontrados</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{soldProductsPagination.total}</div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Quantidade vendida</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{soldProductsSummary.quantidade_total.toLocaleString('pt-BR')}</div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="text-xs text-gray-500">GMV operacional filtrado</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(soldProductsSummary.faturamento_total)}</div>
            </div>
          </div>
        </div>

        {soldProductsError && (
          <div className="mx-5 mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {soldProductsError}
          </div>
        )}

        <div className="relative overflow-x-auto">
          {soldProductsLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
              <div className="w-7 h-7 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }} />
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">Produto</th>
                <th className="px-5 py-3 text-right">Quantidade vendida</th>
                <th className="px-5 py-3 text-right">Pedidos</th>
                <th className="px-5 py-3 text-right">Preço médio</th>
                <th className="px-5 py-3 text-right">GMV operacional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {soldProducts.length > 0 ? soldProducts.map((product) => (
                <tr key={product.produto_key} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-800">{product.nome}</div>
                    <div className="text-xs text-gray-400">
                      {product.tipo_venda === 'peso' ? 'Venda por peso' : 'Venda por unidade'} · {product.unidade_medida || 'un'}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">
                    {product.quantidade_vendida.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">{product.pedidos}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{formatCurrency(product.preco_medio)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatCurrency(product.faturamento_total)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500">
                    {soldProductsLoading ? 'Carregando produtos vendidos...' : 'Nenhum produto vendido no período.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-gray-500">
            {soldProductsPagination.total > 0
              ? `Exibindo ${soldProductsStart}-${soldProductsEnd} de ${soldProductsPagination.total} produto${soldProductsPagination.total === 1 ? '' : 's'}`
              : 'Nenhum produto para exibir'}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSoldProductsPage((current) => Math.max(1, current - 1))}
              disabled={soldProductsLoading || soldProductsPagination.page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <span className="min-w-20 text-center text-xs text-gray-500">
              Página {soldProductsPagination.totalPages ? soldProductsPagination.page : 0} de {soldProductsPagination.totalPages || 0}
            </span>
            <button
              type="button"
              onClick={() => setSoldProductsPage((current) => Math.min(soldProductsPagination.totalPages || current, current + 1))}
              disabled={soldProductsLoading || soldProductsPagination.page >= soldProductsPagination.totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
