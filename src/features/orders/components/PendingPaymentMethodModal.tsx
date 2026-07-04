import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import api from "@/shared/lib/api";

const unwrap = (response: any) => response?.data?.data ?? response?.data;
const apiError = (error: any) =>
  error?.response?.data?.error?.message || error?.response?.data?.message || "Nao foi possivel concluir a operacao.";
const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "cartao_credito", label: "Cartao de credito" },
  { value: "cartao_debito", label: "Cartao de debito" },
  { value: "dinheiro", label: "Dinheiro" },
];

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
  const [method, setMethod] = useState(currentMethod || "dinheiro");
  const [semTroco, setSemTroco] = useState(true);
  const [trocoPara, setTrocoPara] = useState("");
  const [observacao, setObservacao] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await api.patch(`/pedidos/${order.id}/pagamento-pendente`, {
        forma_pagamento: method,
        sem_troco: method === "dinheiro" ? semTroco : undefined,
        troco_para: method === "dinheiro" && !semTroco ? Number(trocoPara.replace(",", ".")) : undefined,
        observacao: observacao.trim() || undefined,
      });
      onUpdated(unwrap(response));
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Alterar pagamento</h2>
            <p className="text-sm text-slate-500">Pedido {order?.numero_pedido || order?.numero || ""}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </header>
        <main className="space-y-4 p-5">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="space-y-2">
            {PAYMENT_METHODS.map((item) => {
              const selected = method === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMethod(item.value)}
                  className="flex w-full items-center justify-between rounded-xl border p-3 text-left text-sm font-semibold"
                  style={selected ? { borderColor: primaryColor, backgroundColor: `${primaryColor}16` } : undefined}
                >
                  {item.label}
                  {selected && <Check className="h-4 w-4" style={{ color: primaryColor }} />}
                </button>
              );
            })}
          </div>
          {method === "dinheiro" && (
            <div className="rounded-xl border bg-slate-50 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={semTroco} onChange={(event) => setSemTroco(event.target.checked)} />
                Nao precisa de troco
              </label>
              {!semTroco && (
                <input value={trocoPara} onChange={(event) => setTrocoPara(event.target.value)} inputMode="decimal" placeholder="Troco para" className="mt-3 w-full rounded-lg border p-2 text-sm" />
              )}
            </div>
          )}
          <textarea value={observacao} onChange={(event) => setObservacao(event.target.value)} maxLength={500} placeholder="Observacao" className="min-h-20 w-full resize-y rounded-xl border p-3 text-sm" />
        </main>
        <footer className="flex justify-end gap-2 border-t px-5 py-4">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button>
          <button onClick={submit} disabled={busy || (method === "dinheiro" && !semTroco && !trocoPara)} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </button>
        </footer>
      </div>
    </div>
  );
}
