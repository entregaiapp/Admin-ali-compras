import { useEffect, useState } from "react";
import { Check, Link2, Loader2, X } from "lucide-react";
import api from "@/shared/lib/api";

const unwrap = (response: any) => response?.data?.data ?? response?.data;
const apiError = (error: any) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  "Não foi possível concluir. Tente novamente.";

const METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão de crédito" },
  { value: "cartao_debito", label: "Cartão de débito" },
  { value: "pix", label: "Pix manual" },
  { value: "pix_link", label: "Pix por link" },
];

const money = (value: unknown) => `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;

export function RetryDeliveryFeeModal({
  order,
  primaryColor = "#2563eb",
  onClose,
  onDone,
}: {
  order: any;
  primaryColor?: string;
  onClose: () => void;
  onDone: (result: any) => void;
}) {
  const [preview, setPreview] = useState<any | null>(null);
  const [chargeFee, setChargeFee] = useState<boolean | null>(null);
  const [method, setMethod] = useState("dinheiro");
  const [cashNeedsChange, setCashNeedsChange] = useState(false);
  const [cashChangeFor, setCashChangeFor] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get(`/pedidos/${order.id}/tentar-entrega-novamente/previa`)
      .then((response) => {
        if (!active) return;
        const data = unwrap(response);
        setPreview(data);
        const available = Array.isArray(data?.formas_pagamento) ? data.formas_pagamento : [];
        setMethod(available.includes("dinheiro") ? "dinheiro" : available[0] || "dinheiro");
      })
      .catch((caught) => {
        if (active) setError(apiError(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [order.id]);

  const availableMethods = METHODS.filter((item) =>
    (preview?.formas_pagamento || ["dinheiro", "cartao_credito", "cartao_debito", "pix"]).includes(item.value),
  );
  const cashChangeValue = Number(String(cashChangeFor || "0").replace(",", "."));
  const balanceAfter = Number(preview?.resumo_depois?.saldo_pendente || 0);
  const invalidChange = method === "dinheiro" && cashNeedsChange && (!Number.isFinite(cashChangeValue) || cashChangeValue < balanceAfter);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const payload = chargeFee
        ? {
            cobrar_taxa: true,
            forma_pagamento: method,
            sem_troco: method === "dinheiro" ? !cashNeedsChange : true,
            troco_para: method === "dinheiro" && cashNeedsChange ? cashChangeValue : null,
          }
        : { cobrar_taxa: false };
      const response = await api.patch(`/pedidos/${order.id}/tentar-entrega-novamente`, payload);
      onDone(unwrap(response));
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tentar entrega novamente</h2>
            <p className="text-sm text-slate-500">Pedido {order?.numero_pedido || ""}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </header>

        <main className="space-y-4 p-5">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando prévia da taxa...
            </div>
          ) : (
            <>
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">Vai cobrar taxa?</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChargeFee(true)}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                      chargeFee === true ? "border-blue-500 bg-white text-blue-700" : "border-slate-200 text-slate-700"
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setChargeFee(false)}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                      chargeFee === false ? "border-blue-500 bg-white text-blue-700" : "border-slate-200 text-slate-700"
                    }`}
                  >
                    Não
                  </button>
                </div>
              </section>

              {chargeFee && preview && (
                <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-amber-900">Taxa de nova entrega</span>
                    <span className="text-right font-bold text-amber-950">{money(preview.taxa_reentrega)}</span>
                    <span className="text-amber-900">Novo total</span>
                    <span className="text-right font-bold text-amber-950">{money(preview.total_depois)}</span>
                    <span className="text-amber-900">Saldo que ficará pendente</span>
                    <span className="text-right font-bold text-amber-950">{money(balanceAfter)}</span>
                  </div>
                  <label className="block text-sm font-semibold text-amber-950">
                    Forma de pagamento do saldo
                    <select
                      value={method}
                      onChange={(event) => setMethod(event.target.value)}
                      className="mt-1 h-11 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-amber-500"
                    >
                      {availableMethods.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {method === "pix_link" && (
                    <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-white p-3 text-sm text-blue-800">
                      <Link2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      O link PIX será criado para o saldo complementar, sem cobrar novamente o total integral.
                    </div>
                  )}

                  {method === "dinheiro" && (
                    <div className="rounded-lg border border-emerald-200 bg-white p-3">
                      <div className="text-sm font-semibold text-emerald-900">Precisa de troco?</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setCashNeedsChange(false)} className="rounded-lg border px-3 py-2 text-sm font-semibold">
                          Não
                        </button>
                        <button type="button" onClick={() => setCashNeedsChange(true)} className="rounded-lg border px-3 py-2 text-sm font-semibold">
                          Sim
                        </button>
                      </div>
                      {cashNeedsChange && (
                        <input
                          value={cashChangeFor}
                          onChange={(event) => setCashChangeFor(event.target.value)}
                          inputMode="decimal"
                          placeholder="Troco para"
                          className="mt-2 h-10 w-full rounded-lg border border-emerald-200 px-3 text-right text-sm outline-none"
                        />
                      )}
                      {invalidChange && <p className="mt-1 text-xs text-red-600">Troco deve ser maior ou igual ao saldo.</p>}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>

        <footer className="flex justify-end gap-2 border-t px-5 py-4">
          <button onClick={onClose} disabled={submitting} className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700">
            Cancelar
          </button>
          <button
            onClick={() => void submit()}
            disabled={loading || submitting || chargeFee === null || invalidChange}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Confirmar
          </button>
        </footer>
      </div>
    </div>
  );
}
