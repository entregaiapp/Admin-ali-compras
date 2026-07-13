import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Check,
  CreditCard,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  Wallet,
  X,
} from 'lucide-react';
import { formatBrasiliaDate } from '@/shared/lib/dateTime';
import { showSystemNotice } from '@/shared/components/SystemToast';
import {
  type AvailableCashOrder,
  type CashMovement,
  type CashMovementType,
  type CashPaymentMethod,
  type CashRegister,
  type CashSummary,
  type CurrentCashResponse,
  cashService,
} from '../services/cashService';

const PRIMARY = '#122a4c';
const GREEN = '#059669';
const PINK = '#e91e63';

const tabs = [
  { key: 'atual', label: 'Caixa atual' },
  { key: 'movimentacoes', label: 'Movimentações' },
  { key: 'fechamentos', label: 'Fechamentos' },
  { key: 'divergencias', label: 'Divergências' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const currency = (value: number | null | undefined) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const moneyNumber = (value: number | null | undefined) =>
  Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatMoneyInput = (value: number | null | undefined) => moneyNumber(value);

const normalizeMoneyInput = (rawValue: string) => {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';

  const negative = raw.includes('-');
  const unsigned = raw.replace(/-/g, '');
  const separatorMatch = unsigned.match(/[,.](\d{1,2})$/);
  if (separatorMatch) {
    const integerPart = unsigned.slice(0, separatorMatch.index).replace(/\D/g, '') || '0';
    const decimalPart = separatorMatch[1].padEnd(2, '0');
    const parsed = Number(`${integerPart}.${decimalPart}`);
    return `${negative && parsed !== 0 ? '-' : ''}${moneyNumber(parsed)}`;
  }

  const digits = unsigned.replace(/\D/g, '');
  if (!digits) return negative ? '-0,00' : '';
  const parsed = Number(digits) / 100;
  return `${negative && parsed !== 0 ? '-' : ''}${moneyNumber(parsed)}`;
};

const parseMoney = (value: string) => {
  const normalized = String(value || '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const escapePrintHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const paymentLabel: Record<string, string> = {
  dinheiro: 'dinheiro',
  pix: 'pix',
  cartao_debito: 'débito',
  cartao_credito: 'crédito',
  fiado: 'fiado',
  fiado_recebimento: 'recebimento de fiado',
  pendente: 'pendente',
  sangria: 'saída',
  suprimento: 'entrada',
  despesa_rapida: 'saída',
};

const paymentOptions: Array<{ value: CashPaymentMethod; label: string }> = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_debito', label: 'Cartão de débito' },
  { value: 'cartao_credito', label: 'Cartão de crédito' },
];

const paymentDetailRows = (summary: CashRegister['resumo']) => [
  {
    key: 'dinheiro' as CashPaymentMethod,
    label: 'Dinheiro',
    vendas: summary?.vendas_dinheiro || 0,
    suprimentos: summary?.suprimentos_dinheiro || 0,
    sangrias: summary?.sangrias_dinheiro || 0,
    despesas: summary?.despesas_dinheiro || 0,
    esperado: summary?.saldo_dinheiro_esperado || 0,
  },
  {
    key: 'pix' as CashPaymentMethod,
    label: 'PIX',
    vendas: summary?.vendas_pix || 0,
    suprimentos: summary?.suprimentos_pix || 0,
    sangrias: summary?.sangrias_pix || 0,
    despesas: summary?.despesas_pix || 0,
    esperado: summary?.saldo_pix_esperado || 0,
  },
  {
    key: 'cartao_debito' as CashPaymentMethod,
    label: 'Cartão débito',
    vendas: summary?.vendas_cartao_debito || 0,
    suprimentos: summary?.suprimentos_cartao_debito || 0,
    sangrias: summary?.sangrias_cartao_debito || 0,
    despesas: summary?.despesas_cartao_debito || 0,
    esperado: summary?.saldo_cartao_debito_esperado || 0,
  },
  {
    key: 'cartao_credito' as CashPaymentMethod,
    label: 'Cartão crédito',
    vendas: summary?.vendas_cartao_credito || 0,
    suprimentos: summary?.suprimentos_cartao_credito || 0,
    sangrias: summary?.sangrias_cartao_credito || 0,
    despesas: summary?.despesas_cartao_credito || 0,
    esperado: summary?.saldo_cartao_credito_esperado || 0,
  },
];

const printCashClosingReceipt = (cash: CashRegister, movements: CashMovement[] = []) => {
  const resolvedSummary = buildCashSummary(cash, movements);
  const printWindow = window.open('', '_blank', 'width=420,height=650');

  if (!printWindow) {
    showSystemNotice('Não foi possível abrir a janela de impressão. Verifique se o navegador bloqueou pop-ups.');
    return false;
  }

  const period = [
    cash.aberto_em ? formatBrasiliaDate(cash.aberto_em) : null,
    cash.fechado_em ? formatBrasiliaDate(cash.fechado_em) : null,
  ].filter(Boolean).join(' até ');

  const totalMovements = (resolvedSummary.suprimentos_total || 0)
    - (resolvedSummary.sangrias_total || 0)
    - (resolvedSummary.despesas_total || 0);
  const cardSales = (resolvedSummary.vendas_cartao_debito || 0) + (resolvedSummary.vendas_cartao_credito || 0);
  const cardExpected = (resolvedSummary.saldo_cartao_debito_esperado || 0) + (resolvedSummary.saldo_cartao_credito_esperado || 0);
  const cardInformed = Number(cash.informado_cartao_debito || 0) + Number(cash.informado_cartao_credito || 0);

  printWindow.document.write(`<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Fechamento de caixa</title>
        <style>
          *{box-sizing:border-box}
          body{font-family:'Courier New',Courier,monospace;margin:0;background:#fff;color:#000}
          main{width:80mm;margin:0 auto;padding:4mm}
          h1{font-size:16px;margin:0 0 4px;text-align:center;text-transform:uppercase}
          .center{text-align:center}
          .muted{font-size:10px;margin-bottom:2px}
          .divider{border-top:1px dashed #000;margin:8px 0}
          .row{display:flex;justify-content:space-between;gap:8px;font-size:12px;line-height:1.25;margin:3px 0}
          .row span:first-child{flex:1}
          .row strong{font-weight:700;white-space:nowrap}
          .total{font-size:14px;font-weight:700}
          .note{font-size:11px;margin-top:8px;white-space:pre-wrap}
          @page{size:80mm auto;margin:0}
          @media print{body{margin:0}main{padding:3mm}}
        </style>
      </head>
      <body>
        <main>
          <h1>Fechamento de caixa</h1>
          <div class="center muted">${escapePrintHtml(cash.operador_nome || cash.fechado_por_nome || 'Operador')} - Matriz</div>
          ${period ? `<div class="center muted">${escapePrintHtml(period)}</div>` : ''}
          <div class="divider"></div>
          <div class="row"><span>Pedidos</span><strong>${escapePrintHtml(resolvedSummary.pedidos_rastreados || 0)}</strong></div>
          <div class="row"><span>Dinheiro esperado</span><strong>${escapePrintHtml(currency(resolvedSummary.saldo_dinheiro_esperado))}</strong></div>
          <div class="row"><span>PIX esperado</span><strong>${escapePrintHtml(currency(resolvedSummary.saldo_pix_esperado))}</strong></div>
          <div class="row"><span>Cartao esperado</span><strong>${escapePrintHtml(currency(cardExpected))}</strong></div>
          <div class="row"><span>Vendas dinheiro</span><strong>${escapePrintHtml(currency(resolvedSummary.vendas_dinheiro))}</strong></div>
          <div class="row"><span>Vendas PIX</span><strong>${escapePrintHtml(currency(resolvedSummary.vendas_pix))}</strong></div>
          <div class="row"><span>Vendas cartao</span><strong>${escapePrintHtml(currency(cardSales))}</strong></div>
          <div class="divider"></div>
          <div class="row"><span>Suprimentos</span><strong>${escapePrintHtml(currency(resolvedSummary.suprimentos_total))}</strong></div>
          <div class="row"><span>Sangrias</span><strong>-${escapePrintHtml(currency(resolvedSummary.sangrias_total))}</strong></div>
          <div class="row"><span>Despesas</span><strong>-${escapePrintHtml(currency(resolvedSummary.despesas_total))}</strong></div>
          <div class="row"><span>Mov. liquida</span><strong>${escapePrintHtml(currency(totalMovements))}</strong></div>
          <div class="divider"></div>
          <div class="row"><span>Dinheiro informado</span><strong>${escapePrintHtml(currency(cash.informado_dinheiro))}</strong></div>
          <div class="row"><span>PIX informado</span><strong>${escapePrintHtml(currency(cash.informado_pix))}</strong></div>
          <div class="row"><span>Cartao informado</span><strong>${escapePrintHtml(currency(cardInformed))}</strong></div>
          <div class="row total"><span>Total esperado</span><strong>${escapePrintHtml(currency(resolvedSummary.total_esperado))}</strong></div>
          <div class="row"><span>Total informado</span><strong>${escapePrintHtml(currency(cash.total_informado))}</strong></div>
          <div class="row total"><span>Diferenca</span><strong>${escapePrintHtml(currency(cash.diferenca_total))}</strong></div>
          ${cash.fechamento_observacao ? `<div class="note"><strong>Observação:</strong> ${escapePrintHtml(cash.fechamento_observacao)}</div>` : ''}
          <div class="divider"></div>
          <div class="center muted">Impresso em ${escapePrintHtml(formatBrasiliaDate(new Date().toISOString()))}</div>
        </main>
        <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
      </body>
    </html>`);
  printWindow.document.close();
  return true;
};

const buildCashSummary = (cash: CashRegister, movements: CashMovement[] = []): CashSummary => {
  const summary: CashSummary = {
    valor_inicial: Number(cash.resumo?.valor_inicial ?? cash.valor_inicial ?? 0),
    vendas_dinheiro: Number(cash.resumo?.vendas_dinheiro ?? cash.vendas_dinheiro ?? 0),
    vendas_pix: Number(cash.resumo?.vendas_pix ?? cash.vendas_pix ?? 0),
    vendas_cartao_debito: Number(cash.resumo?.vendas_cartao_debito ?? cash.vendas_cartao_debito ?? 0),
    vendas_cartao_credito: Number(cash.resumo?.vendas_cartao_credito ?? cash.vendas_cartao_credito ?? 0),
    suprimentos_total: Number(cash.resumo?.suprimentos_total ?? cash.suprimentos_total ?? 0),
    sangrias_total: Number(cash.resumo?.sangrias_total ?? cash.sangrias_total ?? 0),
    despesas_total: Number(cash.resumo?.despesas_total ?? cash.despesas_total ?? 0),
    suprimentos_dinheiro: Number(cash.resumo?.suprimentos_dinheiro ?? 0),
    suprimentos_pix: Number(cash.resumo?.suprimentos_pix ?? 0),
    suprimentos_cartao_debito: Number(cash.resumo?.suprimentos_cartao_debito ?? 0),
    suprimentos_cartao_credito: Number(cash.resumo?.suprimentos_cartao_credito ?? 0),
    sangrias_dinheiro: Number(cash.resumo?.sangrias_dinheiro ?? 0),
    sangrias_pix: Number(cash.resumo?.sangrias_pix ?? 0),
    sangrias_cartao_debito: Number(cash.resumo?.sangrias_cartao_debito ?? 0),
    sangrias_cartao_credito: Number(cash.resumo?.sangrias_cartao_credito ?? 0),
    despesas_dinheiro: Number(cash.resumo?.despesas_dinheiro ?? 0),
    despesas_pix: Number(cash.resumo?.despesas_pix ?? 0),
    despesas_cartao_debito: Number(cash.resumo?.despesas_cartao_debito ?? 0),
    despesas_cartao_credito: Number(cash.resumo?.despesas_cartao_credito ?? 0),
    total_esperado: Number(cash.resumo?.total_esperado ?? cash.total_esperado ?? 0),
    saldo_dinheiro_esperado: Number(cash.resumo?.saldo_dinheiro_esperado ?? cash.saldo_dinheiro_esperado ?? 0),
    saldo_pix_esperado: Number(cash.resumo?.saldo_pix_esperado ?? 0),
    saldo_cartao_debito_esperado: Number(cash.resumo?.saldo_cartao_debito_esperado ?? 0),
    saldo_cartao_credito_esperado: Number(cash.resumo?.saldo_cartao_credito_esperado ?? 0),
    pedidos_rastreados: Number(cash.resumo?.pedidos_rastreados ?? 0),
    pedidos_cancelados: Number(cash.resumo?.pedidos_cancelados ?? 0),
    pedidos_total_bruto: Number(cash.resumo?.pedidos_total_bruto ?? 0),
  };

  if (!cash.resumo && movements.length > 0) {
    summary.vendas_dinheiro = 0;
    summary.vendas_pix = 0;
    summary.vendas_cartao_debito = 0;
    summary.vendas_cartao_credito = 0;
    summary.pedidos_rastreados = 0;

    for (const movement of movements) {
      const value = Number(movement.valor || 0);
      const method = movement.forma_pagamento as CashPaymentMethod;
      const type = movement.tipo_movimentacao || movement.origem_inclusao;
      if (movement.tipo_registro === 'pedido') {
        summary.pedidos_rastreados += 1;
        if (method === 'dinheiro') summary.vendas_dinheiro += value;
        if (method === 'pix') summary.vendas_pix += value;
        if (method === 'cartao_debito') summary.vendas_cartao_debito += value;
        if (method === 'cartao_credito') summary.vendas_cartao_credito += value;
      } else if (type === 'suprimento') {
        if (method === 'dinheiro') summary.suprimentos_dinheiro += value;
        if (method === 'pix') summary.suprimentos_pix += value;
        if (method === 'cartao_debito') summary.suprimentos_cartao_debito += value;
        if (method === 'cartao_credito') summary.suprimentos_cartao_credito += value;
      } else if (type === 'sangria') {
        if (method === 'dinheiro') summary.sangrias_dinheiro += value;
        if (method === 'pix') summary.sangrias_pix += value;
        if (method === 'cartao_debito') summary.sangrias_cartao_debito += value;
        if (method === 'cartao_credito') summary.sangrias_cartao_credito += value;
      } else if (type === 'despesa_rapida') {
        if (method === 'dinheiro') summary.despesas_dinheiro += value;
        if (method === 'pix') summary.despesas_pix += value;
        if (method === 'cartao_debito') summary.despesas_cartao_debito += value;
        if (method === 'cartao_credito') summary.despesas_cartao_credito += value;
      }
    }
  }

  summary.saldo_pix_esperado = Number(cash.resumo?.saldo_pix_esperado ?? (
    summary.vendas_pix + summary.suprimentos_pix - summary.sangrias_pix - summary.despesas_pix
  ));
  summary.saldo_cartao_debito_esperado = Number(cash.resumo?.saldo_cartao_debito_esperado ?? (
    summary.vendas_cartao_debito + summary.suprimentos_cartao_debito - summary.sangrias_cartao_debito - summary.despesas_cartao_debito
  ));
  summary.saldo_cartao_credito_esperado = Number(cash.resumo?.saldo_cartao_credito_esperado ?? (
    summary.vendas_cartao_credito + summary.suprimentos_cartao_credito - summary.sangrias_cartao_credito - summary.despesas_cartao_credito
  ));

  return summary;
};

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-20 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-emerald-500"
        />
      )}
    </label>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  placeholder = 'R$ 0,00',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={(nextValue) => onChange(normalizeMoneyInput(nextValue))}
      placeholder={placeholder}
    />
  );
}

function OpenCashModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [orders, setOrders] = useState<AvailableCashOrder[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [initialValue, setInitialValue] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cashService.availableOrders()
      .then(setOrders)
      .catch(() => showSystemNotice('Não foi possível carregar os pedidos disponíveis.'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const submit = async () => {
    try {
      setSaving(true);
      await cashService.open({
        valor_inicial: parseMoney(initialValue),
        observacao: note || null,
        pedido_ids: selectAll ? [] : selected,
        incluir_todos_disponiveis: selectAll,
      });
      onDone();
      onClose();
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || 'Não foi possível abrir o caixa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Abrir caixa" onClose={onClose}>
      <div className="space-y-4">
        <MoneyField label="Valor inicial em caixa" value={initialValue} onChange={setInitialValue} />
        <TextField label="Observação" value={note} onChange={setNote} placeholder="Opcional" />

        <div className="rounded-xl border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">Pedidos antes do caixa</div>
              <div className="text-xs text-gray-500">{orders.length} pedido(s) ainda sem caixa</div>
            </div>
            <button
              onClick={() => {
                setSelectAll((value) => !value);
                setSelected([]);
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700"
            >
              {selectAll ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-500">Carregando pedidos...</div>
            ) : orders.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">Nenhum pedido disponível.</div>
            ) : (
              orders.map((order) => {
                const checked = selectAll || selected.includes(order.id);
                return (
                  <button
                    key={order.id}
                    onClick={() => !selectAll && toggle(order.id)}
                    disabled={selectAll}
                    className={`mb-2 flex w-full items-center gap-3 rounded-xl border p-3 text-left ${checked ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-white'}`}
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded border ${checked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'}`}>
                      {checked && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">#{order.numero_pedido} · {order.cliente_nome}</span>
                      <span className="block text-xs text-gray-500">{formatBrasiliaDate(order.realizado_em)} · {order.status}</span>
                    </span>
                    <span className="text-sm font-bold text-gray-900">{currency(order.total)}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button onClick={onClose} className="h-12 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700">Cancelar</button>
          <button onClick={submit} disabled={saving} className="h-12 rounded-xl bg-emerald-600 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? 'Abrindo...' : 'Abrir caixa'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function MovementModal({
  cashId,
  type,
  onClose,
  onDone,
}: {
  cashId: string;
  type: CashMovementType;
  onClose: () => void;
  onDone: () => void;
}) {
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);
  const [value, setValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<CashPaymentMethod>('dinheiro');
  const [reason, setReason] = useState('');
  const [responsible, setResponsible] = useState(user?.nome || user?.name || '');
  const [saving, setSaving] = useState(false);
  const title = type === 'sangria' ? 'Sangria' : type === 'suprimento' ? 'Suprimento de caixa' : 'Despesa rápida';

  const submit = async () => {
    try {
      setSaving(true);
      await cashService.createMovement(cashId, {
        tipo: type,
        forma_pagamento: paymentMethod,
        valor: parseMoney(value),
        motivo: reason,
        responsavel_nome: responsible || null,
      });
      onDone();
      onClose();
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || 'Não foi possível registrar a movimentação.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <MoneyField label="Valor" value={value} onChange={setValue} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Forma afetada</span>
          <select
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as CashPaymentMethod)}
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-emerald-500"
          >
            {paymentOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <TextField label="Motivo" value={reason} onChange={setReason} placeholder={type === 'sangria' ? 'Ex: Depósito bancário' : 'Ex: Adição de troco'} />
        {type === 'sangria' && (
          <TextField label="Responsável pela retirada" value={responsible} onChange={setResponsible} />
        )}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button onClick={onClose} className="h-12 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700">Cancelar</button>
          <button
            onClick={submit}
            disabled={saving}
            className={`h-12 rounded-xl text-sm font-semibold text-white disabled:opacity-60 ${type === 'sangria' || type === 'despesa_rapida' ? 'bg-pink-600' : 'bg-emerald-600'}`}
          >
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CashDetailsModal({
  cash,
  movements = [],
  loadingMovements = false,
  onClose,
  onPrint,
}: {
  cash: CashRegister;
  movements?: CashMovement[];
  loadingMovements?: boolean;
  onClose: () => void;
  onPrint?: () => void;
}) {
  const resolvedSummary = useMemo(() => buildCashSummary(cash, movements), [cash, movements]);
  const rows = paymentDetailRows(resolvedSummary);
  const period = [
    cash.aberto_em ? formatBrasiliaDate(cash.aberto_em, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : null,
    cash.fechado_em ? formatBrasiliaDate(cash.fechado_em, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : null,
  ].filter(Boolean).join(' até ');

  return (
    <Modal title="Dashboard rápido do caixa" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onPrint || (() => printCashClosingReceipt(cash, movements))}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir fechamento
          </button>
        </div>
        {period && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            Fluxo: {period}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500">Pedidos rastreados</div>
            <div className="mt-1 text-xl font-bold text-gray-950">{resolvedSummary.pedidos_rastreados || 0}</div>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500">Total esperado</div>
            <div className="mt-1 text-xl font-bold text-gray-950">{currency(resolvedSummary.total_esperado)}</div>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500">Movimentações</div>
            <div className="mt-1 text-xl font-bold text-gray-950">
              {currency((resolvedSummary.suprimentos_total || 0) - (resolvedSummary.sangrias_total || 0) - (resolvedSummary.despesas_total || 0))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-3">Forma</th>
                <th className="px-3 py-3">Vendas</th>
                <th className="px-3 py-3">Suprimentos</th>
                <th className="px-3 py-3">Sangrias</th>
                <th className="px-3 py-3">Despesas</th>
                <th className="px-3 py-3">Esperado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-gray-100">
                  <td className="px-3 py-3 font-semibold text-gray-900">{row.label}</td>
                  <td className="px-3 py-3 text-emerald-700">{currency(row.vendas)}</td>
                  <td className="px-3 py-3 text-emerald-700">{currency(row.suprimentos)}</td>
                  <td className="px-3 py-3 text-pink-700">-{currency(row.sangrias)}</td>
                  <td className="px-3 py-3 text-pink-700">-{currency(row.despesas)}</td>
                  <td className="px-3 py-3 font-bold text-gray-950">{currency(row.esperado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="text-sm font-semibold text-gray-900">Fluxo do dia</div>
            <div className="text-xs text-gray-500">{movements.length} lançamento(s)</div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loadingMovements ? (
              <div className="p-6 text-center text-sm text-gray-500">Carregando fluxo...</div>
            ) : movements.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">Nenhuma movimentação neste caixa.</div>
            ) : (
              movements.map((movement) => {
                const type = movement.tipo_movimentacao || movement.origem_inclusao;
                const isOut = ['sangria', 'despesa_rapida'].includes(type);
                const title = movement.tipo_registro === 'pedido'
                  ? `Venda #${movement.numero_pedido || '-'}`
                  : paymentLabel[type] || type;
                return (
                  <div key={`${movement.tipo_registro}-${movement.id}`} className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${isOut ? 'bg-pink-100 text-pink-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {isOut ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-gray-900">{title}</div>
                      <div className="truncate text-xs text-gray-500">
                        {movement.cliente_nome || movement.motivo || 'Caixa'} · {formatBrasiliaDate(movement.criado_em)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${isOut ? 'text-pink-600' : 'text-emerald-600'}`}>
                        {isOut ? '-' : '+'}{currency(movement.valor)}
                      </div>
                      <div className="text-xs font-semibold text-gray-500">{paymentLabel[movement.forma_pagamento] || movement.forma_pagamento}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function CloseCashModal({
  cash,
  movements = [],
  onClose,
  onDone,
}: {
  cash: CashRegister;
  movements?: CashMovement[];
  onClose: () => void;
  onDone: () => void;
}) {
  const summary = cash.resumo;
  const [dinheiro, setDinheiro] = useState(formatMoneyInput(summary?.saldo_dinheiro_esperado));
  const [pix, setPix] = useState(formatMoneyInput(summary?.saldo_pix_esperado));
  const [debit, setDebit] = useState(formatMoneyInput(summary?.saldo_cartao_debito_esperado));
  const [credit, setCredit] = useState(formatMoneyInput(summary?.saldo_cartao_credito_esperado));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const expected = {
    dinheiro: summary?.saldo_dinheiro_esperado || 0,
    pix: summary?.saldo_pix_esperado || 0,
    cartao_debito: summary?.saldo_cartao_debito_esperado || 0,
    cartao_credito: summary?.saldo_cartao_credito_esperado || 0,
  };
  const counted = {
    dinheiro: parseMoney(dinheiro),
    pix: parseMoney(pix),
    cartao_debito: parseMoney(debit),
    cartao_credito: parseMoney(credit),
  };
  const difference = Object.values(counted).reduce((sum, value) => sum + value, 0)
    - Object.values(expected).reduce((sum, value) => sum + value, 0);

  const submit = async (printAfterClose = false) => {
    try {
      setSaving(true);
      const closedCash = await cashService.close(cash.id, {
        dinheiro: counted.dinheiro,
        pix: counted.pix,
        cartao_debito: counted.cartao_debito,
        cartao_credito: counted.cartao_credito,
        observacao: note || null,
      });
      if (printAfterClose) {
        printCashClosingReceipt(closedCash, movements);
      }
      onDone();
      onClose();
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || 'Não foi possível fechar o caixa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Fechar caixa" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">Informe os valores contados por forma de pagamento:</p>
          <button onClick={() => setDetailsOpen(true)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700">
            Ver dashboard
          </button>
        </div>
        <MoneyField label="Dinheiro em caixa" value={dinheiro} onChange={setDinheiro} />
        <MoneyField label="PIX recebido" value={pix} onChange={setPix} />
        <MoneyField label="Cartão débito" value={debit} onChange={setDebit} />
        <MoneyField label="Cartão crédito" value={credit} onChange={setCredit} />
        {Math.abs(difference) >= 0.01 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Divergência de {currency(difference)}
          </div>
        )}
        <TextField label="Observação" value={note} onChange={setNote} placeholder="Obrigatória para divergências" multiline />
        <div className="grid gap-3 pt-2 sm:grid-cols-3">
          <button onClick={onClose} className="h-12 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700">Cancelar</button>
          <button onClick={() => submit(false)} disabled={saving} className="h-12 rounded-xl bg-pink-600 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? 'Fechando...' : 'Confirmar fechamento'}
          </button>
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={saving}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-pink-200 bg-white text-sm font-semibold text-pink-700 disabled:opacity-60"
          >
            <Printer className="h-4 w-4" />
            Fechar e imprimir
          </button>
        </div>
      </div>
      {detailsOpen && <CashDetailsModal cash={cash} movements={movements} onClose={() => setDetailsOpen(false)} />}
    </Modal>
  );
}

function JustifyModal({ cash, onClose, onDone }: { cash: CashRegister; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    try {
      setSaving(true);
      await cashService.justify(cash.id, text);
      onDone();
      onClose();
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || 'Não foi possível justificar a divergência.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Justificar divergência" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Diferença: {currency(cash.diferenca_total)}
        </div>
        <TextField label="Justificativa" value={text} onChange={setText} multiline />
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button onClick={onClose} className="h-12 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700">Cancelar</button>
          <button onClick={submit} disabled={saving} className="h-12 rounded-xl bg-indigo-600 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? 'Salvando...' : 'Justificar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function CashScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('atual');
  const [current, setCurrent] = useState<CurrentCashResponse | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [closures, setClosures] = useState<CashRegister[]>([]);
  const [divergences, setDivergences] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [movementType, setMovementType] = useState<CashMovementType | null>(null);
  const [closeModal, setCloseModal] = useState(false);
  const [openingClose, setOpeningClose] = useState(false);
  const [justifyCash, setJustifyCash] = useState<CashRegister | null>(null);
  const [detailsCash, setDetailsCash] = useState<CashRegister | null>(null);
  const [detailsMovements, setDetailsMovements] = useState<CashMovement[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const cash = current?.caixa || null;

  const loadCurrent = async () => {
    const data = await cashService.current();
    setCurrent(data);
    return data;
  };

  const loadAll = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const currentData = await loadCurrent();
      const [closuresData, divergencesData] = await Promise.all([
        cashService.closures(),
        cashService.divergences(),
      ]);
      setClosures(closuresData.data || []);
      setDivergences(divergencesData.data || []);
      if (currentData.caixa?.id) {
        setMovements(await cashService.movements(currentData.caixa.id));
      } else {
        setMovements([]);
      }
    } catch (error) {
      showSystemNotice('Não foi possível carregar o caixa.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const summary = cash?.resumo;

  const openCloseCashModal = async () => {
    try {
      setOpeningClose(true);
      const currentData = await loadCurrent();
      if (currentData.caixa?.id) {
        setMovements(await cashService.movements(currentData.caixa.id));
      }
      setCloseModal(true);
    } catch (error) {
      showSystemNotice('Não foi possível atualizar o resumo do caixa.');
    } finally {
      setOpeningClose(false);
    }
  };

  const openCashDashboard = async (cashRegister: CashRegister) => {
    setDetailsCash(cashRegister);
    setDetailsMovements([]);
    setDetailsLoading(true);
    try {
      const data = await cashService.movements(cashRegister.id);
      setDetailsMovements(data);
    } catch (error) {
      showSystemNotice('Não foi possível carregar o fluxo do caixa.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const renderCurrent = () => {
    if (!cash || current?.status === 'fechado') {
      const lastClosure = closures[0];
      return (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <Wallet className="mx-auto mb-4 h-10 w-10 text-gray-300" />
          <div className="font-semibold text-gray-800">Caixa está fechado</div>
          <p className="mt-1 text-sm text-gray-500">{current?.pedidos_disponiveis || 0} pedido(s) disponível(is) para abertura</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {lastClosure && (
              <button
                onClick={() => void openCashDashboard(lastClosure)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700"
              >
                <BarChart3 className="h-4 w-4" />
                Ver dashboard
              </button>
            )}
            <button onClick={() => setOpenModal(true)} className="rounded-xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white">
              Abrir caixa agora
            </button>
          </div>
        </div>
      );
    }

    const cards = [
      ['Saldo inicial', summary?.valor_inicial, PRIMARY],
      ['Vendas dinheiro', summary?.vendas_dinheiro, GREEN],
      ['Vendas PIX', summary?.vendas_pix, '#4f46e5'],
      ['Cartão de débito', summary?.vendas_cartao_debito, GREEN],
      ['Cartão de crédito', summary?.vendas_cartao_credito, GREEN],
      ['Sangrias', -(summary?.sangrias_total || 0), PINK],
      ['Suprimentos', summary?.suprimentos_total, GREEN],
      ['Despesas rápidas', -(summary?.despesas_total || 0), PINK],
    ];

    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <div>
              <div className="font-semibold text-emerald-900">Caixa aberto desde {formatBrasiliaDate(cash.aberto_em, { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="text-sm text-emerald-700">{cash.operador_nome || 'Operador'} · Matriz</div>
            </div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cards.map(([label, value, color]) => (
            <div key={label as string} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-500">{label}</div>
              <div className="mt-2 text-xl font-bold" style={{ color: color as string }}>{currency(value as number)}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <span className="text-sm text-gray-600">Total esperado em caixa</span>
            <span className="font-bold text-gray-900">{currency(summary?.total_esperado)}</span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm font-semibold text-pink-700">Saldo em dinheiro esperado</span>
            <span className="font-bold text-pink-700">{currency(summary?.saldo_dinheiro_esperado)}</span>
          </div>
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-gray-500">PIX esperado</span>
              <div className="font-bold text-gray-900">{currency(summary?.saldo_pix_esperado)}</div>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-gray-500">Débito esperado</span>
              <div className="font-bold text-gray-900">{currency(summary?.saldo_cartao_debito_esperado)}</div>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-gray-500">Crédito esperado</span>
              <div className="font-bold text-gray-900">{currency(summary?.saldo_cartao_credito_esperado)}</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">{summary?.pedidos_rastreados || 0} pedido(s) rastreado(s)</div>
        </div>
      </div>
    );
  };

  const renderMovements = () => (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {movements.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-500">Nenhuma movimentação encontrada.</div>
      ) : (
        movements.map((item) => {
          const isOut = ['sangria', 'despesa_rapida'].includes(item.tipo_movimentacao || item.origem_inclusao);
          const isManual = item.tipo_registro === 'manual';
          const isFiadoReceipt = item.tipo_registro === 'fiado_recebimento';
          return (
            <div key={`${item.tipo_registro}-${item.id}`} className="flex items-center gap-4 border-b border-gray-100 px-5 py-4 last:border-b-0">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${isOut ? 'bg-pink-100 text-pink-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {isOut ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-900">
                  {isManual ? item.motivo : isFiadoReceipt ? 'Recebimento de fiado' : `Venda PDV #${item.numero_pedido}`}
                </div>
                <div className="truncate text-sm text-gray-500">
                  {isManual ? item.cliente_nome : item.cliente_nome || 'Cliente'} · {formatBrasiliaDate(item.criado_em)}
                </div>
              </div>
              <div className="text-right">
                <div className={`font-bold ${isOut ? 'text-pink-600' : 'text-emerald-600'}`}>{isOut ? '-' : '+'}{currency(item.valor)}</div>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                  {isManual || isFiadoReceipt ? `${paymentLabel[item.tipo_movimentacao || item.origem_inclusao] || item.origem_inclusao} · ` : ''}
                  {paymentLabel[item.forma_pagamento] || item.forma_pagamento}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderClosures = () => (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Operador</th>
            <th className="px-4 py-3">Filial</th>
            <th className="px-4 py-3">Esperado</th>
            <th className="px-4 py-3">Informado</th>
            <th className="px-4 py-3">Diferença</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {closures.map((item) => (
            <tr key={item.id} className="border-t border-gray-100">
              <td className="px-4 py-4">{item.fechado_em ? formatBrasiliaDate(item.fechado_em, { day: '2-digit', month: '2-digit' }) : '-'}</td>
              <td className="px-4 py-4">{item.operador_nome || '-'}</td>
              <td className="px-4 py-4"><span className="rounded-full bg-gray-100 px-2 py-1 text-xs">Matriz</span></td>
              <td className="px-4 py-4 font-semibold">{currency(item.total_esperado)}</td>
              <td className="px-4 py-4">{currency(item.total_informado)}</td>
              <td className={`px-4 py-4 font-bold ${item.diferenca_total < 0 ? 'text-pink-600' : item.diferenca_total > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>{currency(item.diferenca_total)}</td>
              <td className="px-4 py-4">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.divergencia_status === 'sem_divergencia' ? 'bg-emerald-50 text-emerald-700' : item.divergencia_status === 'justificada' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                  {item.divergencia_status === 'sem_divergencia' ? 'Sem divergência' : item.divergencia_status === 'justificada' ? 'Justificada' : 'Pendente'}
                </span>
              </td>
              <td className="px-4 py-4 text-right">
                <div className="inline-flex items-center justify-end gap-2">
                  <button
                    type="button"
                    title="Imprimir fechamento"
                    aria-label="Imprimir fechamento"
                    onClick={() => printCashClosingReceipt(item)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                <button
                  type="button"
                  title="Ver dashboard do caixa"
                  aria-label="Ver dashboard do caixa"
                  onClick={() => void openCashDashboard(item)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderDivergences = () => (
    <div className="space-y-3">
      {divergences.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">Nenhuma divergência.</div>
      ) : divergences.map((item) => (
        <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-red-100 bg-red-50 p-5">
          <AlertTriangle className="h-5 w-5 text-pink-600" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
              {item.fechado_em ? formatBrasiliaDate(item.fechado_em, { day: '2-digit', month: '2-digit' }) : '-'} · {item.operador_nome || '-'}
              <span className="rounded-full bg-white px-2 py-1 text-xs text-gray-600">Matriz</span>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">{item.divergencia_status === 'justificada' ? 'Justificada' : 'Pendente'}</span>
            </div>
            <div className="mt-1 text-base font-bold text-pink-700">Diferença: {currency(item.diferenca_total)}</div>
            <div className="mt-1 text-sm text-gray-600">{item.divergencia_justificativa || item.fechamento_observacao || 'Sem justificativa registrada'}</div>
          </div>
          {item.divergencia_status !== 'justificada' && (
            <button onClick={() => setJustifyCash(item)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Justificar</button>
          )}
          <button
            type="button"
            title="Ver dashboard do caixa"
            aria-label="Ver dashboard do caixa"
            onClick={() => void openCashDashboard(item)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-white text-gray-600 hover:bg-red-50"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Imprimir fechamento"
            aria-label="Imprimir fechamento"
            onClick={() => printCashClosingReceipt(item)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-white text-gray-600 hover:bg-red-50"
          >
            <Printer className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="h-full flex-1 overflow-y-auto bg-gray-50 p-5">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Caixa</h1>
          <p className="text-sm text-gray-500">Controle de abertura, movimentações e fechamento</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {cash?.status === 'aberto' ? (
            <>
              <button onClick={() => setMovementType('sangria')} className="inline-flex items-center gap-2 rounded-xl border border-pink-100 bg-white px-4 py-2 text-sm font-semibold text-pink-700"><Minus className="h-4 w-4" /> Sangria</button>
              <button onClick={() => setMovementType('suprimento')} className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-4 py-2 text-sm font-semibold text-emerald-700"><Plus className="h-4 w-4" /> Suprimento</button>
              <button onClick={() => setMovementType('despesa_rapida')} className="inline-flex items-center gap-2 rounded-xl border border-pink-100 bg-white px-4 py-2 text-sm font-semibold text-pink-700"><Banknote className="h-4 w-4" /> Despesa</button>
              <button onClick={openCloseCashModal} disabled={openingClose} className="rounded-xl bg-pink-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {openingClose ? 'Atualizando...' : 'Fechar caixa'}
              </button>
            </>
          ) : (
            <button onClick={() => setOpenModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white"><Wallet className="h-4 w-4" /> Abrir caixa</button>
          )}
          <button onClick={() => loadAll({ silent: true })} className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="mb-5 inline-flex rounded-2xl bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === tab.key ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500'}`}
          >
            {tab.label}{tab.key === 'divergencias' && divergences.length > 0 ? ` (${divergences.length})` : ''}
          </button>
        ))}
      </div>

      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${cash?.status === 'aberto' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
          <div>
            <div className="font-semibold text-gray-900">{cash?.status === 'aberto' ? 'Caixa aberto' : 'Caixa fechado'}</div>
            <div className="text-sm text-gray-500">{cash?.operador_nome || 'Matriz'}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-600" /></div>
      ) : (
        <>
          {activeTab === 'atual' && renderCurrent()}
          {activeTab === 'movimentacoes' && renderMovements()}
          {activeTab === 'fechamentos' && <div className="overflow-x-auto">{renderClosures()}</div>}
          {activeTab === 'divergencias' && renderDivergences()}
        </>
      )}

      {openModal && <OpenCashModal onClose={() => setOpenModal(false)} onDone={() => loadAll()} />}
      {movementType && cash && <MovementModal cashId={cash.id} type={movementType} onClose={() => setMovementType(null)} onDone={() => loadAll()} />}
      {closeModal && cash && <CloseCashModal cash={cash} movements={movements} onClose={() => setCloseModal(false)} onDone={() => loadAll()} />}
      {justifyCash && <JustifyModal cash={justifyCash} onClose={() => setJustifyCash(null)} onDone={() => loadAll()} />}
      {detailsCash && (
        <CashDetailsModal
          cash={detailsCash}
          movements={detailsMovements}
          loadingMovements={detailsLoading}
          onPrint={() => printCashClosingReceipt(detailsCash, detailsMovements)}
          onClose={() => setDetailsCash(null)}
        />
      )}
    </div>
  );
}
