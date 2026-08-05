import type { Dispatch, SetStateAction } from "react";
import {
  CheckCircle2,
  CircleX,
  Loader2,
  MessageCircle,
  RotateCcw,
} from "lucide-react";

import { PRIMARY, statusFlow } from "@/features/orders/constants";
import { AdminPixChargePanel } from "@/features/adminPixCharges/components/AdminPixChargePanel";
import type { AdminPixCharge } from "@/features/adminPixCharges/types/adminPixCharge";

type OrderDetailsTimelineProps = {
  selected: any;
  selectedAdminPixCharge: AdminPixCharge | null;
  selectedCustomerWhatsappUrl: string | null;
  selectedIsSalao: boolean;
  selectedOrderUpdating: boolean;
  selectedPaymentKeepsConfirmationPending: boolean;
  selectedStatusUpdating: boolean;
  getDeliveryFailureReason: (order: any) => string;
  getStatusLabel: (status: string) => string;
  handleRetryDelivery: (order: any) => void;
  setSelectedAdminPixCharge: Dispatch<SetStateAction<AdminPixCharge | null>>;
};

export function OrderDetailsTimeline({
  getDeliveryFailureReason,
  getStatusLabel,
  handleRetryDelivery,
  selected,
  selectedAdminPixCharge,
  selectedCustomerWhatsappUrl,
  selectedIsSalao,
  selectedOrderUpdating,
  selectedPaymentKeepsConfirmationPending,
  selectedStatusUpdating,
  setSelectedAdminPixCharge,
}: OrderDetailsTimelineProps) {
  return (
    <>
                  {/* Timeline */}
                  {!selectedIsSalao && <div className="rounded-xl bg-gray-50 p-3 sm:p-4">
                    <div className="flex items-start gap-1 overflow-x-auto pb-1">
                      {(() => {
                        const baseFlow =
                          String(
                            selected.tipo_pedido || selected.type || "",
                          ).toLowerCase() === "retirada"
                            ? statusFlow.filter(
                                (status) => status !== "Saiu para Entrega",
                              )
                            : statusFlow;
      
                        return selected.status === "nao_entregue"
                          ? baseFlow.map((status) =>
                              status === "Entregue" ? "Não entregue" : status,
                            )
                          : baseFlow;
                      })().map((s, i, visibleStatusFlow) => {
                        const isFailedStep =
                          selected.status === "nao_entregue" && s === "Não entregue";
                        const currentDisplay = isFailedStep
                          ? "Não entregue"
                          : getStatusLabel(selected.status);
                        const currentFlowIndex =
                          visibleStatusFlow.indexOf(currentDisplay);
                        const curIdx = currentFlowIndex >= 0 ? currentFlowIndex : 0;
                        const isPaymentPendingConfirmationStep =
                          s === "Confirmado" && selectedPaymentKeepsConfirmationPending;
                        const done =
                          isFailedStep || isPaymentPendingConfirmationStep ? false : i <= curIdx;
                        const connectorDone =
                          i < curIdx && !isPaymentPendingConfirmationStep;
                        const connectorFailed =
                          selected.status === "nao_entregue" &&
                          visibleStatusFlow[i + 1] === "Não entregue";
                        return (
                          <div
                            key={s}
                            className="flex items-start gap-1 flex-shrink-0"
                          >
                            <div className="flex w-14 flex-col items-center">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{
                                  backgroundColor: isFailedStep
                                    ? "#dc2626"
                                    : isPaymentPendingConfirmationStep
                                      ? "#f59e0b"
                                    : done
                                      ? PRIMARY
                                      : "#e5e7eb",
                                }}
                              >
                                {isFailedStep ? (
                                  <CircleX className="w-3.5 h-3.5 text-white" />
                                ) : done ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                ) : isPaymentPendingConfirmationStep ? (
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                                )}
                              </div>
                              <span
                                className={`mt-1 min-h-[22px] max-w-14 text-center text-[9px] leading-tight ${isFailedStep ? "font-semibold text-red-700" : "text-gray-500"}`}
                              >
                                {s}
                              </span>
                            </div>
                            {i < visibleStatusFlow.length - 1 && (
                              <div
                                className="mt-3 h-0.5 w-6 flex-shrink-0"
                                style={{
                                  backgroundColor: connectorDone
                                    ? connectorFailed
                                      ? "#dc2626"
                                      : PRIMARY
                                    : "#e5e7eb",
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>}
      
                  {selectedAdminPixCharge && (
                    <AdminPixChargePanel
                      initialCharge={selectedAdminPixCharge}
                      customerName={selected?.cliente?.nome || selected?.customer}
                      onChange={setSelectedAdminPixCharge}
                    />
                  )}
      
                  {!selectedIsSalao && selected.status === "nao_entregue" && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                      <h4 className="mb-1 text-sm font-semibold text-red-800">
                        Pedido não entregue
                      </h4>
                      <p className="text-sm text-red-700">
                        Problema relatado pelo entregador
                        {getDeliveryFailureReason(selected)
                          ? `: ${getDeliveryFailureReason(selected)}`
                          : "."}
                      </p>
                      <p className="mt-2 text-sm font-medium text-red-800">
                        Entre em contato com o cliente pelo WhatsApp para combinar os
                        próximos passos.
                      </p>
                      {selectedCustomerWhatsappUrl ? (
                        <a
                          href={selectedCustomerWhatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Abrir WhatsApp do cliente
                        </a>
                      ) : (
                        <div className="mt-3 rounded-lg border border-red-200 bg-white/70 px-3 py-2 text-sm font-medium text-red-800">
                          Cliente sem telefone cadastrado.
                        </div>
                      )}
                      <button
                        onClick={(event) => void handleRetryDelivery(selected, event)}
                        disabled={selectedOrderUpdating}
                        aria-busy={selectedStatusUpdating}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
                      >
                        {selectedStatusUpdating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Atualizando...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4" />
                            Tentar entrega novamente
                          </>
                        )}
                      </button>
                    </div>
                  )}
      
    </>
  );
}

