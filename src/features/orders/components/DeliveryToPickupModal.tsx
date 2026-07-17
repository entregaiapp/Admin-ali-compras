import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, RotateCcw, Store, X } from "lucide-react";
import api from "@/shared/lib/api";
import { authService } from "@/features/auth/services/authService";
import {
  MfaApprovalModal,
  type MfaApproval,
} from "@/shared/components/MfaApprovalModal";

const unwrap = (response: any) => response?.data?.data ?? response?.data;
const apiError = (error: any, fallback = "Não foi possível concluir. Tente novamente.") =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  fallback;
const money = (value: unknown) => `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;

const actionLabel: Record<string, string> = {
  estorno_gateway: "Estorno automático da taxa de entrega",
  estorno_manual: "Estorno manual confirmado pelo mercado",
  estorno_misto: "Estorno automático e manual",
  ajustar_pendente: "Ajuste do pagamento pendente",
  sem_estorno: "Sem estorno financeiro",
};

export function DeliveryToPickupModal({
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
  const [confirmManualRefund, setConfirmManualRefund] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .get(`/pedidos/${order.id}/alteracao-para-retirada/previa`)
      .then((response) => {
        if (!active) return;
        setPreview(unwrap(response));
      })
      .catch((caught) => {
        if (active) setError(apiError(caught, "Não foi possível carregar a prévia."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [order.id]);

  const refundAmount = Number(preview?.total_estorno || 0);
  const requiresManualConfirmation = preview?.requer_confirmacao_estorno_manual === true;
  const canSubmit = preview?.permitido === true && (!requiresManualConfirmation || confirmManualRefund);
  const financialAction = useMemo(
    () => actionLabel[preview?.acao_financeira] || "Ação financeira calculada pelo sistema",
    [preview?.acao_financeira],
  );

  const submit = async (approval?: MfaApproval) => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await api.post(`/pedidos/${order.id}/alterar-para-retirada`, {
        confirmar_estorno_manual: confirmManualRefund,
        ...(approval ? { mfa_approval: approval } : {}),
      });
      setApprovalOpen(false);
      onDone(unwrap(response));
    } catch (caught) {
      setError(apiError(caught, "Não foi possível alterar o pedido para retirada."));
    } finally {
      setSubmitting(false);
    }
  };

  const requestSubmit = async () => {
    if (!canSubmit) return;
    try {
      if (refundAmount > 0) {
        const mfa = await authService.getMfaStatus();
        if (mfa.refund_required) {
          setApprovalOpen(true);
          return;
        }
      }
      await submit();
    } catch (caught) {
      setError(apiError(caught, "Não foi possível verificar a preferência de segurança."));
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Alterar para retirada</h2>
            <p className="text-sm text-slate-500">Pedido {order?.numero_pedido || ""}</p>
          </div>
          <button onClick={onClose} disabled={submitting} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </header>

        <main className="space-y-4 p-5">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando prévia da alteração...
            </div>
          ) : preview?.permitido === false ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {preview?.bloqueio?.mensagem || "Este pedido não pode ser alterado para retirada."}
            </div>
          ) : (
            <>
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-slate-600">Taxa removida</span>
                  <span className="text-right font-bold text-slate-900">{money(preview?.taxa_entrega)}</span>
                  <span className="text-slate-600">Total atual</span>
                  <span className="text-right font-bold text-slate-900">{money(preview?.total_anterior)}</span>
                  <span className="text-slate-600">Novo total</span>
                  <span className="text-right font-bold text-slate-900">{money(preview?.total_novo)}</span>
                </div>
              </section>

              <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  {refundAmount > 0 ? (
                    <RotateCcw className="mt-0.5 h-4 w-4 text-blue-700" />
                  ) : (
                    <Store className="mt-0.5 h-4 w-4 text-blue-700" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-blue-950">{financialAction}</div>
                    <p className="mt-1 text-sm text-blue-800">
                      {refundAmount > 0
                        ? `Valor de estorno da taxa: ${money(refundAmount)}.`
                        : "O sistema apenas reduzirá o total ou o saldo pendente do pedido."}
                    </p>
                  </div>
                </div>
              </section>

              {requiresManualConfirmation && (
                <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <input
                    type="checkbox"
                    checked={confirmManualRefund}
                    onChange={(event) => setConfirmManualRefund(event.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    Confirmo que o valor manual de {money(preview?.estorno_manual)} da taxa de entrega foi devolvido ao cliente.
                  </span>
                </label>
              )}
            </>
          )}
        </main>

        <footer className="flex justify-end gap-2 border-t px-5 py-4">
          <button onClick={onClose} disabled={submitting} className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700">
            Cancelar
          </button>
          <button
            onClick={() => void requestSubmit()}
            disabled={loading || submitting || !canSubmit}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Confirmar retirada
          </button>
        </footer>

        <MfaApprovalModal
          open={approvalOpen}
          title="Aprovar estorno da taxa"
          description="Confirme a devolução da taxa de entrega com um administrador do mercado."
          loading={submitting}
          onClose={() => setApprovalOpen(false)}
          onConfirm={(approval) => void submit(approval)}
        />
      </div>
    </div>
  );
}
