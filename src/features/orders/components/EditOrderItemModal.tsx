import { useEffect, useMemo, useState } from "react";
import { Check, CreditCard, Loader2, X } from "lucide-react";
import api from "@/shared/lib/api";
import { SalaoProductConfiguratorModal } from "@/pages/Salao/SalaoProductConfiguratorModal";

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

const itemName = (item: any) =>
  [item?.nome_produto || item?.nome || "Produto", item?.nome_variacao]
    .filter(Boolean)
    .join(" - ");

const buildProductFallback = (item: any) => ({
  ...(item?.produto_loja || {}),
  id: item?.produto_loja_id || item?.produto_loja?.id,
  nome: item?.produto_loja?.nome || item?.nome_produto || "Produto",
  preco: item?.preco_base ?? item?.preco_unitario ?? 0,
  preco_promocional: item?.preco_base ?? item?.preco_unitario ?? 0,
});

const shouldLoadConfiguration = (item: any) =>
  Boolean(
    item?.produto_loja_id &&
      (item?.variacao_produto_loja_id ||
        (Array.isArray(item?.selecoes) && item.selecoes.length > 0) ||
        item?.produto_loja?.modo_compra === "configuravel" ||
        item?.produto_loja?.tem_variacoes),
  );

const buildSelectionPayload = (configuredItem: any) =>
  configuredItem.selections.map(({ group, option, quantity, fraction, observations }: any) => ({
    grupo_id: group.id,
    opcao_id: option.id,
    quantidade: quantity,
    fracao: fraction || undefined,
    observacoes: observations?.trim() || undefined,
  }));

export function EditOrderItemModal({
  order,
  item,
  isPaid,
  primaryColor = "#2563eb",
  onClose,
  onAdjusted,
}: {
  order: any;
  item: any;
  isPaid: boolean;
  primaryColor?: string;
  onClose: () => void;
  onAdjusted: (result: any) => void;
}) {
  const [quantity, setQuantity] = useState(String(item?.quantidade || 1).replace(".", ","));
  const [notes, setNotes] = useState(String(item?.observacoes || item?.obs || ""));
  const [motivo, setMotivo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");
  const [paymentObservation, setPaymentObservation] = useState("");
  const [configuration, setConfiguration] = useState<any | null>(null);
  const [loadingConfiguration, setLoadingConfiguration] = useState(shouldLoadConfiguration(item));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const product = useMemo(() => buildProductFallback(item), [item]);

  useEffect(() => {
    let cancelled = false;
    if (!shouldLoadConfiguration(item)) return;

    setLoadingConfiguration(true);
    api.get(`/produtos_loja/${item.produto_loja_id}/configuracao`)
      .then((response) => {
        if (!cancelled) setConfiguration(unwrap(response));
      })
      .catch(() => {
        if (!cancelled) setConfiguration(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingConfiguration(false);
      });

    return () => {
      cancelled = true;
    };
  }, [item]);

  const submitPayload = async (payload: any) => {
    setBusy(true);
    setError("");
    try {
      const response = await api.patch(`/pedidos/${order.id}/itens/${item.id}/admin-edit`, {
        ...payload,
        motivo: motivo.trim() || undefined,
        pagamento_complementar: isPaid
          ? {
              forma_pagamento: paymentMethod,
              observacao: paymentObservation.trim() || undefined,
            }
          : undefined,
      });
      onAdjusted(unwrap(response));
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(false);
    }
  };

  const submitSimple = () => {
    const parsedQuantity = Number(quantity.replace(",", "."));
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Informe uma quantidade válida.");
      return;
    }

    void submitPayload({
      produto_loja_id: item.produto_loja_id,
      variacao_produto_loja_id: item.variacao_produto_loja_id || null,
      quantidade: parsedQuantity,
      observacoes: notes.trim() || null,
      selecoes: Array.isArray(item.selecoes)
        ? item.selecoes.map((selection: any) => ({
            grupo_id: selection.grupo_id || null,
            opcao_id: selection.opcao_id || null,
            quantidade: selection.quantidade || 1,
            fracao: selection.fracao || null,
            observacoes: selection.observacoes || null,
          }))
        : [],
    });
  };

  if (configuration) {
    return (
      <>
        {error && (
          <div className="fixed left-1/2 top-4 z-[130] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-lg">
            {error}
          </div>
        )}
        <SalaoProductConfiguratorModal
          product={product}
          configuration={configuration}
          initialItem={{
            variationId: item.variacao_produto_loja_id || "",
            selections: item.selecoes || [],
            quantity: Number(item.quantidade || 1),
            notes,
          }}
          busy={busy}
          title="Editar produto do pedido"
          description="Ajuste quantidade, variação, adicionais e observação."
          confirmLabel="Salvar edição"
          busyLabel="Salvando..."
          onClose={onClose}
          onConfirm={(configuredItem) =>
            void submitPayload({
              produto_loja_id: item.produto_loja_id,
              variacao_produto_loja_id: configuredItem.variationId || null,
              quantidade: configuredItem.quantity,
              observacoes: configuredItem.notes.trim() || null,
              selecoes: buildSelectionPayload(configuredItem),
            })
          }
        />
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Editar produto do pedido</h2>
            <p className="text-sm text-slate-500">{itemName(item)}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </header>
        <main className="space-y-4 p-5">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {loadingConfiguration && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando opções do produto...
            </div>
          )}
          <label className="block text-sm font-semibold text-slate-700">
            Quantidade
            <input
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              inputMode="decimal"
              className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Observação do produto
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={500}
              className="mt-1 min-h-20 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-blue-400"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Motivo do ajuste
            <textarea
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              maxLength={500}
              placeholder="Ex.: cliente pediu alteração por WhatsApp"
              className="mt-1 min-h-20 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-blue-400"
            />
          </label>
          {isPaid && (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="flex items-center gap-2 font-bold text-slate-900">
                <CreditCard className="h-4 w-4" />
                Pagamento da diferença
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Usado apenas se a edição aumentar o total do pedido.
              </p>
              <div className="mt-3 grid gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const selected = paymentMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className="flex items-center justify-between rounded-lg border bg-white p-2 text-sm"
                      style={selected ? { borderColor: primaryColor } : undefined}
                    >
                      {method.label}
                      {selected && <Check className="h-4 w-4" style={{ color: primaryColor }} />}
                    </button>
                  );
                })}
              </div>
              <input
                value={paymentObservation}
                onChange={(event) => setPaymentObservation(event.target.value)}
                className="mt-3 w-full rounded-lg border border-slate-200 p-2 text-sm"
                placeholder="Observação do pagamento"
              />
            </section>
          )}
        </main>
        <footer className="flex justify-end gap-2 border-t px-5 py-4">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button>
          <button
            onClick={submitSimple}
            disabled={busy || loadingConfiguration}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Salvar edição
          </button>
        </footer>
      </div>
    </div>
  );
}
