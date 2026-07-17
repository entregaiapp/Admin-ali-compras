import { useEffect, useState } from "react";
import { Check, Link2, Loader2, Plus, Trash2, X } from "lucide-react";
import api from "@/shared/lib/api";
import { adminPixChargeService } from "@/features/adminPixCharges/services/adminPixChargeService";
import type { AdminPixCharge } from "@/features/adminPixCharges/types/adminPixCharge";

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
const MAX_PAYMENT_LINES = 8;

const toCents = (value: unknown) => Math.round(Number(value || 0) * 100);
const parseCurrencyInputCents = (value: string) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};
const formatCents = (value: number) => (Math.max(0, value) / 100).toFixed(2).replace(".", ",");
const parseCurrencyInput = (value: string) => parseCurrencyInputCents(value) / 100;
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
  canGeneratePixLink = false,
  onClose,
  onUpdated,
  onPixLinkGenerated,
}: {
  order: any;
  currentMethod?: string;
  primaryColor?: string;
  canGeneratePixLink?: boolean;
  onClose: () => void;
  onUpdated: (result: any) => void;
  onPixLinkGenerated?: (charge: AdminPixCharge) => void;
}) {
  const total = Number(order?.valor_total || order?.total || 0);
  const totalCents = toCents(total);
  const [lines, setLines] = useState<PaymentLine[]>([
    { forma_pagamento: currentMethod || "dinheiro", valor: totalCents ? formatCents(totalCents) : "" },
  ]);
  const [observacao, setObservacao] = useState("");
  const [cashNeedsChange, setCashNeedsChange] = useState(false);
  const [cashChangeFor, setCashChangeFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [generatingPixLink, setGeneratingPixLink] = useState(false);
  const [error, setError] = useState("");

  const paidCents = lines.reduce((sum, line) => sum + parseCurrencyInputCents(line.valor), 0);
  const remainingCents = Math.max(0, totalCents - paidCents);
  const remaining = remainingCents / 100;
  const isComplete = totalCents > 0 && paidCents === totalCents;
  const hasInvalidLine = lines.some((line) => {
    const valueCents = parseCurrencyInputCents(line.valor);
    return (Boolean(line.forma_pagamento) || valueCents > 0) && (!line.forma_pagamento || valueCents <= 0);
  });
  const canAddLine =
    !isComplete &&
    lines.length < MAX_PAYMENT_LINES &&
    lines.every((line) => line.forma_pagamento && parseCurrencyInputCents(line.valor) > 0);
  const singleCashPayment =
    lines.filter((line) => line.forma_pagamento && parseCurrencyInputCents(line.valor) > 0).length === 1 &&
    lines.some((line) => line.forma_pagamento === "dinheiro" && parseCurrencyInputCents(line.valor) > 0);
  const cashChangeForCents = parseCurrencyInputCents(cashChangeFor);
  const cashChangeInvalid = singleCashPayment && cashNeedsChange && cashChangeForCents < totalCents;

  useEffect(() => {
    if (!canAddLine) return;
    setLines((current) => [...current, { forma_pagamento: "", valor: "" }]);
  }, [canAddLine]);

  useEffect(() => {
    if (singleCashPayment) return;
    setCashNeedsChange(false);
    setCashChangeFor("");
  }, [singleCashPayment]);

  const updateLine = (index: number, patch: Partial<PaymentLine>) => {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    );
  };

  const updateLineValue = (index: number, rawValue: string) => {
    setLines((current) => {
      const otherLinesTotal = current.reduce(
        (sum, line, lineIndex) => sum + (lineIndex === index ? 0 : parseCurrencyInputCents(line.valor)),
        0,
      );
      const maxAllowed = Math.max(0, totalCents - otherLinesTotal);
      const nextCents = Math.min(parseCurrencyInputCents(rawValue), maxAllowed);

      return current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, valor: nextCents > 0 ? formatCents(nextCents) : "" } : line,
      );
    });
  };

  const removeLine = (index: number) => {
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  };

  const submit = async () => {
    const paymentsByMethod = new Map<string, number>();
    lines.forEach((line) => {
      const valueCents = parseCurrencyInputCents(line.valor);
      if (!line.forma_pagamento || valueCents <= 0) return;
      paymentsByMethod.set(line.forma_pagamento, (paymentsByMethod.get(line.forma_pagamento) || 0) + valueCents);
    });
    const pagamentos = Array.from(paymentsByMethod.entries()).map(([forma_pagamento, valueCents]) => ({
      forma_pagamento,
      valor: Number((valueCents / 100).toFixed(2)),
    }));

    if (cashChangeInvalid) {
      setError("Informe um valor de troco maior ou igual ao total do pedido.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const payload =
        pagamentos.length > 1
          ? { pagamentos, observacao: observacao.trim() || undefined }
          : {
              forma_pagamento: pagamentos[0]?.forma_pagamento,
              sem_troco: pagamentos[0]?.forma_pagamento === "dinheiro" ? !cashNeedsChange : true,
              troco_para:
                pagamentos[0]?.forma_pagamento === "dinheiro" && cashNeedsChange
                  ? parseCurrencyInput(cashChangeFor)
                  : null,
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

  const generatePixLink = async () => {
    if (!order?.id || !onPixLinkGenerated) return;
    setGeneratingPixLink(true);
    setError("");
    try {
      onPixLinkGenerated(await adminPixChargeService.createForOrder(order.id));
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setGeneratingPixLink(false);
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

          {canGeneratePixLink && (
            <section className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <div className="text-sm font-bold text-blue-950">Cobrança por link de pagamento</div>
              <p className="mt-1 text-xs text-blue-800">
                Substitui a forma pendente atual e cria um link seguro para o cliente pagar via PIX.
              </p>
              <button
                type="button"
                onClick={() => void generatePixLink()}
                disabled={busy || generatingPixLink}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
              >
                {generatingPixLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                {generatingPixLink ? "Gerando link..." : "Gerar link - PIX"}
              </button>
            </section>
          )}

          <div className="space-y-2">
            {lines.map((line, index) => {
              const lineValue = parseCurrencyInput(line.valor);

              return (
                <div key={index} className="grid grid-cols-[1fr_132px_36px] gap-2">
                  <select
                    value={line.forma_pagamento}
                    onChange={(event) => updateLine(index, { forma_pagamento: event.target.value })}
                    className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
                  >
                    <option value="">Selecione</option>
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={line.valor}
                    onChange={(event) => updateLineValue(index, event.target.value)}
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

          {!isComplete && lines.length < MAX_PAYMENT_LINES && (
            <button
              type="button"
              onClick={() => setLines((current) => [...current, { forma_pagamento: "", valor: "" }])}
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
                {formatCurrency(remaining)}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-sm font-semibold text-slate-800">
              <span>Total da conta</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {singleCashPayment && (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="text-sm font-bold text-emerald-950">Precisa de troco?</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCashNeedsChange(false);
                    setCashChangeFor("");
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    !cashNeedsChange
                      ? "border-emerald-600 bg-white text-emerald-800"
                      : "border-emerald-200 bg-emerald-100 text-emerald-700"
                  }`}
                >
                  Não precisa
                </button>
                <button
                  type="button"
                  onClick={() => setCashNeedsChange(true)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    cashNeedsChange
                      ? "border-emerald-600 bg-white text-emerald-800"
                      : "border-emerald-200 bg-emerald-100 text-emerald-700"
                  }`}
                >
                  Precisa
                </button>
              </div>
              {cashNeedsChange && (
                <label className="mt-3 block text-sm font-semibold text-emerald-950">
                  Troco para
                  <input
                    value={cashChangeFor}
                    onChange={(event) => setCashChangeFor(formatCents(parseCurrencyInputCents(event.target.value)))}
                    inputMode="decimal"
                    className="mt-1 h-11 w-full rounded-lg border border-emerald-200 bg-white px-3 text-right text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500"
                    placeholder="0,00"
                  />
                  {cashChangeInvalid && (
                    <span className="mt-1 block text-xs text-red-600">
                      O valor deve ser maior ou igual ao total do pedido.
                    </span>
                  )}
                </label>
              )}
            </section>
          )}

          <textarea
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            maxLength={500}
            placeholder="Observação"
            className="min-h-20 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"
          />
        </main>
        <footer className="flex justify-end gap-2 border-t px-5 py-4">
          <button onClick={onClose} disabled={busy || generatingPixLink} className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Cancelar</button>
          <button
            onClick={submit}
            disabled={busy || generatingPixLink || !isComplete || hasInvalidLine || cashChangeInvalid}
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
