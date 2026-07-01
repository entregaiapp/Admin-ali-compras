import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { fiadosService } from "../services/fiadosService";

const money = (value: unknown) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const today = () => new Date().toISOString().slice(0, 10);
const firstDayOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
};

const paymentLabels: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Cartao de credito",
  cartao_debito: "Cartao de debito",
  vale_refeicao: "Vale refeicao",
  vale_alimentacao: "Vale alimentacao",
  outro: "Outro",
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export function FiadosScreen() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [accounts, setAccounts] = useState<any>({ data: [], page: 1, total_pages: 1, total: 0 });
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [details, setDetails] = useState<any | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    page: 1,
    busca: "",
    status: "",
    pagou_no_periodo: false,
    data_inicio: firstDayOfMonth(),
    data_fim: today(),
  });
  const [receipt, setReceipt] = useState({
    valor: "",
    forma_pagamento: "dinheiro",
    observacao: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        ...filters,
        per_page: 20,
        pagou_no_periodo: filters.pagou_no_periodo ? "true" : undefined,
      };
      const [dashboardPayload, accountsPayload] = await Promise.all([
        fiadosService.dashboard({ data_inicio: filters.data_inicio, data_fim: filters.data_fim }),
        fiadosService.list(params),
      ]);
      setDashboard(dashboardPayload);
      setAccounts(accountsPayload);
    } catch (caught: any) {
      setError(caught?.response?.data?.message || "Nao foi possivel carregar fiados.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadDetails = useCallback(async (account: any) => {
    setSelectedAccount(account);
    setSelectedOrderIds([]);
    setDetailsLoading(true);
    setError("");
    try {
      const payload = await fiadosService.details(account.id, {
        data_inicio: filters.data_inicio,
        data_fim: filters.data_fim,
      });
      setDetails(payload);
      setReceipt((current) => ({ ...current, valor: String(payload?.resumo?.saldo_aberto || "") }));
    } catch (caught: any) {
      setError(caught?.response?.data?.message || "Nao foi possivel carregar detalhes.");
    } finally {
      setDetailsLoading(false);
    }
  }, [filters.data_fim, filters.data_inicio]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageButtons = useMemo(() => {
    const total = Number(accounts.total_pages || 1);
    const current = Number(accounts.page || 1);
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [accounts.page, accounts.total_pages]);

  const toggleOrder = (pedidoId: string) => {
    setSelectedOrderIds((current) =>
      current.includes(pedidoId) ? current.filter((id) => id !== pedidoId) : [...current, pedidoId],
    );
  };

  const selectedOrders = useMemo(() => {
    const openOrders = details?.pedidos_abertos || [];
    if (!selectedOrderIds.length) return openOrders;
    return openOrders.filter((order: any) => selectedOrderIds.includes(order.pedido_id));
  }, [details?.pedidos_abertos, selectedOrderIds]);

  const selectedBalance = useMemo(
    () => selectedOrders.reduce((sum: number, order: any) => sum + Number(order.saldo_aberto || 0), 0),
    [selectedOrders],
  );

  const printAccount = () => {
    if (!details) return;
    const orders = selectedOrders.length ? selectedOrders : details.pedidos_abertos || [];
    const rows = orders.map((order: any) => `
      <tr>
        <td>${escapeHtml(order.numero_pedido)}</td>
        <td>${escapeHtml(new Date(order.realizado_em).toLocaleDateString("pt-BR"))}</td>
        <td style="text-align:right">${money(order.valor_original)}</td>
        <td style="text-align:right">${money(order.valor_pago)}</td>
        <td style="text-align:right">${money(order.saldo_aberto)}</td>
      </tr>
    `).join("");
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Conta fiado - ${escapeHtml(details.contato?.nome)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
            h1 { font-size: 20px; margin: 0 0 4px; }
            p { margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; font-size: 12px; }
            th { text-align: left; background: #f8fafc; }
            .total { margin-top: 18px; text-align: right; font-size: 18px; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Conta fiado</h1>
          <p><strong>Cliente:</strong> ${escapeHtml(details.contato?.nome)}</p>
          <p><strong>Telefone:</strong> ${escapeHtml(details.contato?.telefone)}</p>
          <p><strong>Emitido em:</strong> ${new Date().toLocaleString("pt-BR")}</p>
          <table>
            <thead>
              <tr><th>Pedido</th><th>Data</th><th style="text-align:right">Total</th><th style="text-align:right">Pago</th><th style="text-align:right">Aberto</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="total">Total aberto: ${money(orders.reduce((sum: number, order: any) => sum + Number(order.saldo_aberto || 0), 0))}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const submitReceipt = async () => {
    if (!selectedAccount) return;
    const value = Number(receipt.valor.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Informe um valor valido para recebimento.");
      return;
    }
    setReceiving(true);
    setError("");
    try {
      await fiadosService.receive(selectedAccount.id, {
        valor: value,
        forma_pagamento: receipt.forma_pagamento,
        observacao: receipt.observacao || undefined,
        pedido_ids: selectedOrderIds,
      });
      await load();
      await loadDetails(selectedAccount);
      setReceipt({ valor: "", forma_pagamento: "dinheiro", observacao: "" });
    } catch (caught: any) {
      setError(caught?.response?.data?.message || "Nao foi possivel registrar o recebimento.");
    } finally {
      setReceiving(false);
    }
  };

  const changePage = (page: number) => setFilters((current) => ({ ...current, page }));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-slate-50 p-4 lg:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-950">
            <Wallet className="h-6 w-6 text-[#122a4c]" />
            Fiados
          </h1>
          <p className="text-sm text-slate-500">Contas abertas e recebimentos do caixa.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Saldo aberto", dashboard?.saldo_aberto_total],
          ["Fiado no periodo", dashboard?.valor_fiado_periodo],
          ["Recebido no periodo", dashboard?.recebido_periodo],
          ["Pessoas com saldo", dashboard?.pessoas_com_saldo, false],
          ["Pedidos abertos", dashboard?.pedidos_abertos, false],
        ].map(([label, value, currency = true]) => (
          <div key={String(label)} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
            <div className="mt-2 text-xl font-bold text-slate-950">{currency ? money(value) : Number(value || 0)}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border bg-white p-3 lg:grid-cols-[1fr_150px_150px_170px_180px]">
        <label className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={filters.busca}
            onChange={(event) => setFilters((current) => ({ ...current, busca: event.target.value, page: 1 }))}
            placeholder="Buscar por nome ou telefone"
            className="h-10 w-full rounded-lg border pl-9 pr-3 text-sm"
          />
        </label>
        <input type="date" value={filters.data_inicio} onChange={(event) => setFilters((current) => ({ ...current, data_inicio: event.target.value, page: 1 }))} className="h-10 rounded-lg border px-3 text-sm" />
        <input type="date" value={filters.data_fim} onChange={(event) => setFilters((current) => ({ ...current, data_fim: event.target.value, page: 1 }))} className="h-10 rounded-lg border px-3 text-sm" />
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))} className="h-10 rounded-lg border px-3 text-sm">
          <option value="">Todos status</option>
          <option value="aberto">Com saldo aberto</option>
          <option value="quitado">Quitados</option>
        </select>
        <label className="flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={filters.pagou_no_periodo} onChange={(event) => setFilters((current) => ({ ...current, pagou_no_periodo: event.target.checked, page: 1 }))} />
          Pagou no periodo
        </label>
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_460px]">
        <section className="overflow-hidden rounded-lg border bg-white">
          <div className="border-b px-4 py-3 text-sm font-semibold text-slate-700">
            {loading ? "Carregando..." : `${accounts.total || 0} pessoas encontradas`}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Pessoa</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                  <th className="px-4 py-3 text-right">Fiado periodo</th>
                  <th className="px-4 py-3 text-right">Recebido periodo</th>
                  <th className="px-4 py-3 text-right">Pedidos</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>
                ) : accounts.data?.length ? accounts.data.map((account: any) => (
                  <tr key={account.id} onClick={() => void loadDetails(account)} className="cursor-pointer border-t hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-950">{account.nome}</div>
                      <div className="text-xs text-slate-500">{account.telefone}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-950">{money(account.saldo_aberto)}</td>
                    <td className="px-4 py-3 text-right">{money(account.valor_fiado_periodo)}</td>
                    <td className="px-4 py-3 text-right">{money(account.valor_pago_periodo)}</td>
                    <td className="px-4 py-3 text-right">{account.pedidos_abertos}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-500">Nenhuma conta fiado encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3">
            <button disabled={Number(accounts.page || 1) <= 1} onClick={() => changePage(Number(accounts.page || 1) - 1)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <div className="flex gap-1">
              {pageButtons.map((page) => (
                <button key={page} onClick={() => changePage(page)} className={`h-9 min-w-9 rounded-lg px-3 text-sm font-bold ${page === Number(accounts.page || 1) ? "bg-[#122a4c] text-white" : "border bg-white text-slate-700"}`}>
                  {page}
                </button>
              ))}
            </div>
            <button disabled={Number(accounts.page || 1) >= Number(accounts.total_pages || 1)} onClick={() => changePage(Number(accounts.page || 1) + 1)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40">
              Proxima <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <aside className="rounded-lg border bg-white p-4">
          {!selectedAccount ? (
            <div className="flex h-full min-h-80 flex-col items-center justify-center text-center text-slate-500">
              <ReceiptText className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm">Selecione uma pessoa para ver pedidos abertos e receber pagamentos.</p>
            </div>
          ) : detailsLoading ? (
            <div className="flex min-h-80 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#122a4c]" /></div>
          ) : details ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">{details.contato?.nome}</h2>
                  <p className="text-sm text-slate-500">{details.contato?.telefone}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">Aberto: {money(details.resumo?.saldo_aberto)}</p>
                </div>
                <button onClick={() => { setSelectedAccount(null); setDetails(null); }} className="rounded-lg border p-2 text-slate-500"><X className="h-4 w-4" /></button>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Pedidos abertos</h3>
                  <button onClick={printAccount} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-bold text-slate-700">
                    <Printer className="h-3.5 w-3.5" /> Imprimir
                  </button>
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {(details.pedidos_abertos || []).length ? details.pedidos_abertos.map((order: any) => (
                    <label key={order.pedido_id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-slate-50">
                      <input type="checkbox" checked={selectedOrderIds.includes(order.pedido_id)} onChange={() => toggleOrder(order.pedido_id)} className="mt-1" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-950">{order.numero_pedido}</span>
                        <span className="text-xs text-slate-500">{new Date(order.realizado_em).toLocaleString("pt-BR")}</span>
                        <span className="mt-1 block text-xs text-slate-500">{(order.itens || []).map((item: any) => item.nome_produto).join(", ")}</span>
                      </span>
                      <b className="text-sm text-slate-950">{money(order.saldo_aberto)}</b>
                    </label>
                  )) : (
                    <div className="rounded-lg border border-dashed p-5 text-center text-sm text-slate-500">Sem pedidos em aberto.</div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border bg-slate-50 p-3">
                <h3 className="mb-3 font-bold text-slate-900">Receber</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Valor
                    <input value={receipt.valor} onChange={(event) => setReceipt((current) => ({ ...current, valor: event.target.value }))} inputMode="decimal" className="mt-1 h-10 w-full rounded-lg border px-3" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Forma
                    <select value={receipt.forma_pagamento} onChange={(event) => setReceipt((current) => ({ ...current, forma_pagamento: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border px-3">
                      {Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                </div>
                <label className="mt-2 block text-sm font-semibold text-slate-700">
                  Observacao
                  <input value={receipt.observacao} onChange={(event) => setReceipt((current) => ({ ...current, observacao: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border px-3" />
                </label>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">{selectedOrderIds.length ? `Selecionado: ${money(selectedBalance)}` : "Sem selecao, baixa os mais antigos."}</span>
                  <button disabled={receiving || !(details.pedidos_abertos || []).length} onClick={() => void submitReceipt()} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                    {receiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Receber
                  </button>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-bold text-slate-900">Historico de recebimentos</h3>
                <div className="max-h-52 space-y-2 overflow-y-auto">
                  {(details.recebimentos || []).length ? details.recebimentos.map((item: any) => (
                    <div key={item.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex justify-between gap-2">
                        <b>{money(item.valor)}</b>
                        <span>{paymentLabels[item.forma_pagamento] || item.forma_pagamento}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{new Date(item.recebido_em).toLocaleString("pt-BR")}</div>
                      {item.observacao && <div className="mt-1 text-xs text-slate-600">{item.observacao}</div>}
                    </div>
                  )) : (
                    <div className="rounded-lg border border-dashed p-4 text-center text-sm text-slate-500">Nenhum recebimento registrado.</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
