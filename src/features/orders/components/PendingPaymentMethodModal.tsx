import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, Trash2, X } from "lucide-react";
import api from "@/shared/lib/api";

const unwrap = (response: any) => response?.data?.data ?? response?.data;
const apiError = (error: any) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  "Não foi possível concluir. Tente novamente.";

const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "cartao_credito", label: "Cartão de crédito" },
  { value: "cartao_debito", label: "Cartão de débito" },
  { value: "dinheiro", label: "Dinheiro" },
];

const parseCurrencyInput = (value: string) => {
  const normalized = String(value || "").replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
};

const toCents = (value: unknown) => Math.round(Number(value || 0) * 100);
const formatCurrency = (value: unknown) =>
  `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;

type PaymentLine = {
  forma_pagamento: string;
  valor: string;
};

export function PendingPaymentMethodModal({
  order,
  currentMethod,
  primaryColor = "#2563eb",
  onClose,
  onUpdated,
}: {
  order: any;
  currentMethod?: string;
  primaryColor?: string;
  onClose: () => void;
  onUpdated: (result: any) => void;
}) {
  const total = Number(order?.valor_total || order?.total || 0);
  const [lines, setLines] = useState<PaymentLine[]>([
    { forma_pagamento: currentMethod || "dinheiro", valor: total ? total.toFixed(2).replace(".", ",") : "" },
  ]);
  const [observacao, setObservacao] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedMethods = useMemo(
    () => new Set(lines.map((line) => line.forma_pagamento).filter(Boolean)),
    [lines],
  );
  const paidTotal = lines.reduce((sum, line) => sum + parseCurrencyInput(line.valor), 0);
  const remaining = Math.max(0, total - paidTotal);
  const isComplete = total > 0 && toCents(paidTotal) === toCents(total);
  const canAddLine =
    !isComplete &&
    lines.length < PAYMENT_METHODS.length &&
    lines.every((line) => line.forma_pagamento && parseCurrencyInput(line.valor) > 0);

  useEffect(() => {
    if (!canAddLine) return;
    setLines((current) => [...current, { forma_pagamento: "", valor: remaining.toFixed(2).replace(".", ",") }]);
  }, [canAddLine, remaining]);

  const updateLine = (index: number, patch: Partial<PaymentLine>) => {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    );
  };

  const removeLine = (index: number) => {
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  };

  const submit = async () => {
    const pagamentos = lines
      .map((line) => ({
        forma_pagamento: line.forma_pagamento,
        valor: Number(parseCurrencyInput(line.valor).toFixed(2)),
      }))
      .filter((line) => line.forma_pagamento && line.valor > 0);

    setBusy(true);
    setError("");
    try {
      const payload =
        pagamentos.length > 1
          ? { pagamentos, observacao: observacao.trim() || undefined }
          : {
              forma_pagamento: pagamentos[0]?.forma_pagamento,
              sem_troco: true,
              observacao: observacao.trim() || undefined,
            };
      const response = await api.patch(`/pedidos/${order.id}/pagamento-pendente`, payload);
      onUpdated(unwrap(response));
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Alterar forma de pagamento</h2>
            <p className="text-sm text-slate-500">Pedido {order?.numero_pedido || order?.numero || ""}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </header>
        <main className="space-y-4 p-5">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="space-y-2">
            {lines.map((line, index) => {
              const lineValue = parseCurrencyInput(line.valor);
              const options = PAYMENT_METHODS.filter(
                (method) => method.value === line.forma_pagamento || !selectedMethods.has(method.value),
              );

              return (
                <div key={index} className="grid grid-cols-[1fr_132px_36px] gap-2">
                  <select
                    value={line.forma_pagamento}
                    onChange={(event) => updateLine(index, { forma_pagamento: event.target.value })}
                    className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
                  >
                    <option value="">Selecione</option>
                    {options.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={line.valor}
                    onChange={(event) => updateLine(index, { valor: event.target.value })}
                    inputMode="decimal"
                    className="h-11 rounded-lg border border-slate-200 px-3 text-right text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
                    placeholder="0,00"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    disabled={lines.length === 1}
                    className="flex h-11 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Remover forma"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {line.forma_pagamento && lineValue <= 0 && (
                    <div className="col-span-3 -mt-1 text-xs text-red-600">Informe um valor maior que zero.</div>
                  )}
                </div>
              );
            })}
          </div>

          {!isComplete && lines.length < PAYMENT_METHODS.length && (
            <button
              type="button"
              onClick={() => setLines((current) => [...current, { forma_pagamento: "", valor: remaining.toFixed(2).replace(".", ",") }])}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar forma
            </button>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Resta pagar</span>
              <span className={isComplete ? "font-semibold text-green-700" : "font-semibold text-amber-700"}>
                {formatCurrency(Math.max(0, total - paidTotal))}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-sm font-semibold text-slate-800">
              <span>Total da conta</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <textarea
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            maxLength={500}
            placeholder="Observação"
            className="min-h-20 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"
          />
        </main>
        <footer className="flex justify-end gap-2 border-t px-5 py-4">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button>
          <button
            onClick={submit}
            disabled={busy || !isComplete || lines.some((line) => !line.forma_pagamento || parseCurrencyInput(line.valor) <= 0)}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Alterar forma de pagamento
          </button>
        </footer>
      </div>
    </div>
  );
}
