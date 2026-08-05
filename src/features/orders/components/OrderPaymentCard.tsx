import type { Dispatch, SetStateAction } from "react";
import { CreditCard } from "lucide-react";

import { PRIMARY } from "@/features/orders/constants";
import { formatBrasiliaDate } from "@/shared/lib/dateTime";
import {
  getOrderPaymentMethod,
  isCurrentPaymentRecord,
} from "@/features/orders/utils/orderUtils";
import {
  formatCurrency,
  getPaymentSplitGroupId,
  parseCurrencyNumber,
} from "@/features/orders/utils/ordersScreenUtils";

type OrderPaymentCardProps = {
  selected: any;
  selectedCanChangePendingPayment: boolean;
  selectedCashChangeInfo: string;
  selectedCashChangePaidToCourier: boolean;
  selectedCashChangeStatusLabel: string;
  selectedFiadoTotal: number;
  selectedIsCardOnDelivery: boolean;
  selectedIsFiado: boolean;
  selectedIsPaid: boolean;
  selectedIsPendingCash: boolean;
  selectedNeedsCashChange: boolean;
  selectedPayment: any;
  selectedPaymentMethod: string;
  selectedPaymentStatus: string;
  selectedPaymentStatusClass: string;
  selectedPaymentStatusLabel: string;
  selectedPayments: any[];
  selectedRefundableAmount: number;
  selectedRefundedAmount: number;
  selectedRefunds: any[];
  updatingCashChangePaymentId: string;
  confirmCashPayment: () => Promise<void>;
  setPendingPaymentMethodOrder: Dispatch<SetStateAction<any | null>>;
  updateCashChangePaidToCourier: (checked: boolean) => Promise<void>;
};

export function OrderPaymentCard({
  confirmCashPayment,
  selected,
  selectedCanChangePendingPayment,
  selectedCashChangeInfo,
  selectedCashChangePaidToCourier,
  selectedCashChangeStatusLabel,
  selectedFiadoTotal,
  selectedIsCardOnDelivery,
  selectedIsFiado,
  selectedIsPaid,
  selectedIsPendingCash,
  selectedNeedsCashChange,
  selectedPayment,
  selectedPaymentMethod,
  selectedPaymentStatus,
  selectedPaymentStatusClass,
  selectedPaymentStatusLabel,
  selectedPayments,
  selectedRefundableAmount,
  selectedRefundedAmount,
  selectedRefunds,
  setPendingPaymentMethodOrder,
  updateCashChangePaidToCourier,
  updatingCashChangePaymentId,
}: OrderPaymentCardProps) {
  return (
    <>
                  {/* Payment */}
                  {selectedIsFiado && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <h4 className="text-sm font-semibold text-amber-900">
                        Pedido fiado
                      </h4>
                      <p className="mt-1 text-sm text-amber-800">
                        A conta e os recebimentos deste pedido são gerenciados no
                        módulo Fiados.
                      </p>
                      <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-200 bg-white/70 px-3 py-2 text-sm">
                        <span className="font-semibold text-amber-900">Valor em fiado</span>
                        <span className="font-bold text-amber-950">{formatCurrency(selectedFiadoTotal)}</span>
                      </div>
                      {selectedPaymentStatus !== "NÃ£o informado" && (
                        <div className={`mt-2 text-xs font-semibold ${selectedPaymentStatusClass}`}>
                          {selectedPaymentStatusLabel}
                        </div>
                      )}
                    </div>
                  )}
                  {!selectedIsFiado && <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-gray-700 font-semibold mb-2 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" style={{ color: PRIMARY }} />{" "}
                      Pagamento
                    </h4>
                    <div className="text-sm text-gray-600">
                      {selectedPaymentMethod}
                    </div>
                    {selectedPaymentStatus !== "Não informado" && (
                      <div
                        className={`mt-1 text-xs font-medium ${selectedPaymentStatusClass}`}
                      >
                        {selectedIsPaid ? "✓ " : ""}
                        {selectedPaymentStatusLabel}
                      </div>
                    )}
                    {selectedPayments.length > 1 && (
                      <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                          Pagamentos registrados
                        </div>
                        {(() => {
                          const renderedGroups = new Set<string>();
      
                          return selectedPayments.map((payment) => {
                            const splitGroupId = getPaymentSplitGroupId(payment);
                            if (splitGroupId) {
                              if (renderedGroups.has(splitGroupId)) return null;
                              renderedGroups.add(splitGroupId);
                              const groupPayments = selectedPayments.filter((item) => getPaymentSplitGroupId(item) === splitGroupId);
                              const isSelectedCurrent = groupPayments.some((item) => item?.id === selectedPayment?.id);
                              const isCurrent = isSelectedCurrent || groupPayments.every(isCurrentPaymentRecord);
                              const totalSplit = groupPayments.reduce((sum, item) => sum + parseCurrencyNumber(item.valor), 0);
      
                              return (
                                <div
                                  key={splitGroupId}
                                  className={`rounded-lg border px-3 py-2 text-xs transition-opacity ${
                                    isCurrent
                                      ? "border-blue-200 bg-blue-50 opacity-100 shadow-sm"
                                      : "border-gray-100 bg-gray-50 opacity-50"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <span className="font-semibold text-gray-700">Pagamento dividido</span>
                                      {isCurrent && (
                                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                          Atual
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-semibold text-gray-800">{formatCurrency(totalSplit)}</span>
                                  </div>
                                  <div className="mt-2 space-y-1">
                                    {groupPayments.map((item) => (
                                      <div key={item.id} className="flex items-center justify-between gap-2 text-gray-600">
                                        <span>{getOrderPaymentMethod({ pagamento: item }, item)}</span>
                                        <span className="font-semibold text-gray-700">{formatCurrency(item.valor)}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-1 flex items-center justify-between gap-2 text-gray-500">
                                    <span className="capitalize">{String(groupPayments[0]?.status || "").replace(/_/g, " ")}</span>
                                    {groupPayments[0]?.pago_em && <span>{formatBrasiliaDate(groupPayments[0].pago_em)}</span>}
                                  </div>
                                </div>
                              );
                            }
      
                            const isComplement = payment?.metadata?.tipo === "pagamento_complementar";
                            const isSelectedCurrent = payment?.id === selectedPayment?.id;
                            const isCurrent = isSelectedCurrent || isCurrentPaymentRecord(payment);
                            return (
                              <div
                                key={payment.id}
                                className={`rounded-lg border px-3 py-2 text-xs transition-opacity ${
                                  isCurrent
                                    ? "border-blue-100 bg-blue-50 opacity-100"
                                    : "border-gray-100 bg-gray-50 opacity-50"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="font-semibold text-gray-700">
                                      {isComplement ? "Complemento" : "Original"} - {getOrderPaymentMethod({ pagamento: payment }, payment)}
                                    </span>
                                    {isSelectedCurrent && (
                                      <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                        Atual
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-semibold text-gray-800">{formatCurrency(payment.valor)}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between gap-2 text-gray-500">
                                  <span className="capitalize">{String(payment.status || "").replace(/_/g, " ")}</span>
                                  {payment.pago_em && <span>{formatBrasiliaDate(payment.pago_em)}</span>}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                    {!selectedIsPaid && (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        {selectedIsPendingCash
                          ? selectedIsCardOnDelivery
                            ? "Pagamento em cartão pendente de recebimento."
                            : "Pagamento pendente de recebimento pelo caixa."
                          : "Pagamento pendente"}
                      </div>
                    )}
                    {selectedIsPendingCash && (
                      <button
                        type="button"
                        onClick={confirmCashPayment}
                        disabled={!selectedPayment?.id}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:cursor-wait disabled:opacity-70"
                      >
                        Marcar pagamento como recebido
                      </button>
                    )}
                    {selectedCanChangePendingPayment && (
                      <button
                        type="button"
                        onClick={() => setPendingPaymentMethodOrder(selected)}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Alterar forma de pagamento
                      </button>
                    )}
                    {selectedCashChangeInfo && (
                      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                          {selectedIsCardOnDelivery ? "Cobrança" : "Troco"}
                        </div>
                        <div className="mt-0.5 text-sm font-semibold text-gray-700">
                          {selectedCashChangeInfo}
                        </div>
                        {selectedCashChangeStatusLabel && (
                          <div
                            className={`mt-1 text-xs font-semibold ${
                              selectedCashChangeStatusLabel === "Troco repassado"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {selectedCashChangeStatusLabel}
                          </div>
                        )}
                      </div>
                    )}
                    {selectedNeedsCashChange && (
                      <label className="mt-3 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">
                        <input
                          type="checkbox"
                          checked={selectedCashChangePaidToCourier}
                          disabled={
                            !selectedPayment?.id ||
                            updatingCashChangePaymentId === selectedPayment.id
                          }
                          onChange={(event) =>
                            void updateCashChangePaidToCourier(event.target.checked)
                          }
                          className="mt-0.5 h-4 w-4 rounded border-green-300"
                        />
                        <span>
                          Troco pago ao entregador
                          {updatingCashChangePaymentId === selectedPayment?.id && (
                            <span className="ml-2 font-medium text-green-700">
                              Atualizando...
                            </span>
                          )}
                        </span>
                      </label>
                    )}
                    {selectedRefunds.length > 0 && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-500">
                          <span>Reembolsos</span>
                          <span>{formatCurrency(selectedRefundedAmount)}</span>
                        </div>
                        <div className="space-y-2">
                          {selectedRefunds.map((refund) => {
                            const metadata = refund.metadata || {};
                            const missingItems = Array.isArray(
                              metadata.itens_faltantes,
                            )
                              ? metadata.itens_faltantes
                              : [];
                            return (
                              <div
                                key={refund.id}
                                className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2"
                              >
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <span className="font-semibold text-blue-900">
                                    {formatCurrency(refund.valor)}
                                  </span>
                                  <span className="capitalize text-blue-700">
                                    {String(refund.status || "").replace(/_/g, " ")}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-blue-800">
                                  {refund.motivo ||
                                    (metadata.tipo === "produto_em_falta"
                                      ? "Produto em falta"
                                      : "Reembolso")}
                                </p>
                                {missingItems.length > 0 && (
                                  <p className="mt-1 text-[11px] text-blue-700">
                                    {missingItems
                                      .map(
                                        (item: any) =>
                                          `${item.quantidade_faltante}x ${item.nome_produto}`,
                                      )
                                      .join(", ")}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 text-[11px] text-gray-500">
                          Saldo disponível: {formatCurrency(selectedRefundableAmount)}
                        </div>
                      </div>
                    )}
                  </div>}
      
    </>
  );
}

