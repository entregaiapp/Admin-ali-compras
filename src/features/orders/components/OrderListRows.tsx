import type { MouseEvent } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Eye,
  Loader2,
  Printer,
  RotateCcw,
} from "lucide-react";

import { PRIMARY, statusColor, statusLabels } from "@/features/orders/constants";
import { CompactOrderStatusTimeline } from "@/features/orders/components/CompactOrderStatusTimeline";
import { OrderCustomerSummary } from "@/features/orders/components/OrderCustomerSummary";
import {
  getPreferredOrderPayment,
  hexToRgba,
  isDeliveryOrder,
} from "@/features/orders/utils/orderUtils";
import {
  canQuickArchiveOrder,
  canSelectOrderForDeliveryAssignment,
  getCashChangeStatusLabel,
  getDailyTicketNumber,
  getListGroupAccentColor,
  getOrderCreatedTimestamp,
  getOrderEmbeddedPayments,
  getOrderPaymentMethodsLabel,
  getOrderTypeLabel,
  getWaitingTimeColor,
  hasPendingCancellationRequest,
  hasPendingPaymentForDisplay,
} from "@/features/orders/utils/ordersScreenUtils";

type OrderListRowsProps = {
  activeListGroup: any;
  archivingOrderId: string;
  assignedOrderIds: Set<string>;
  averageDeliveryTimeMinutes: number;
  currentTimeMs: number;
  deliveryByOrderId: Map<string, any>;
  primaryColor: string;
  resolvingCancellationOrderId: string;
  selected: any | null;
  selectedOrderIds: string[];
  selectedPayments: any[];
  unassigningDeliveryId: string;
  updatingStatusOrderId: string;
  viewMode: "lista" | "arquivados";
  getDeliveryFailureReason: (order: any) => string;
  getOperationalRowActionLabel: (order: any, groupKey: string) => string;
  handleOperationalRowAction: (
    order: any,
    groupKey: string,
    event: MouseEvent<HTMLButtonElement>,
  ) => Promise<void>;
  handleOrderCardClick: (order: any) => void;
  handleOrderCardDoubleClick: (order: any, canSelect: boolean) => void;
  handleSelectOrder: (order: any) => void;
  handleUnassignCourier: (delivery: any, event: MouseEvent<HTMLButtonElement>) => void;
  toggleArchivedOrder: (order: any) => Promise<void>;
  toggleOrderSelection: (orderId: string) => void;
};

export function OrderListRows({
  activeListGroup,
  archivingOrderId,
  assignedOrderIds,
  averageDeliveryTimeMinutes,
  currentTimeMs,
  deliveryByOrderId,
  getDeliveryFailureReason,
  getOperationalRowActionLabel,
  handleOperationalRowAction,
  handleOrderCardClick,
  handleOrderCardDoubleClick,
  handleSelectOrder,
  handleUnassignCourier,
  primaryColor,
  resolvingCancellationOrderId,
  selected,
  selectedOrderIds,
  selectedPayments,
  toggleArchivedOrder,
  toggleOrderSelection,
  unassigningDeliveryId,
  updatingStatusOrderId,
  viewMode,
}: OrderListRowsProps) {
  const getStatusLabel = (status: string) => statusLabels[status] || status;

  return (
    <>
                          {activeListGroup.orders.map((order, orderIndex) => {
                          const statusDisplay = getStatusLabel(order.status);
                          const sc = statusColor[order.status] ||
                            statusColor["Recebido"] || {
                              bg: "#fffbeb",
                              text: "#d97706",
                            };
                          const isEntrega = isDeliveryOrder(order);
                          const orderPayments =
                            selected?.id === order.id
                              ? selectedPayments
                              : getOrderEmbeddedPayments(order);
                          const orderPayment = getPreferredOrderPayment(
                            order,
                            orderPayments,
                          );
                          const orderPaymentLabel = getOrderPaymentMethodsLabel(
                            order,
                            orderPayments,
                            orderPayment,
                          );
                          const orderPaymentIsPending =
                            hasPendingPaymentForDisplay(order, orderPayments);
                          const cashChangeStatusLabel = getCashChangeStatusLabel(
                            orderPayment,
                            order,
                          );
                          const canSelectForDelivery =
                            viewMode !== "arquivados" &&
                            canSelectOrderForDeliveryAssignment(
                              order,
                              assignedOrderIds,
                            );
                          const isSelectedForDelivery = selectedOrderIds.includes(
                            order.id,
                          );
                          const assignedDelivery = deliveryByOrderId.get(order.id);
                          const failureReason = getDeliveryFailureReason(order);
                          const dailyTicketNumber = getDailyTicketNumber(order);
                          const operationalActionLabel = getOperationalRowActionLabel(
                            order,
                            activeListGroup.key,
                          );
                          const operationalActionBusy =
                            updatingStatusOrderId === order.id ||
                            resolvingCancellationOrderId === order.id;
                          const rowBgClass = isSelectedForDelivery
                            ? ""
                            : orderIndex % 2 === 0
                              ? "bg-white"
                              : "bg-slate-50";
                          const rowCreatedAtMs = new Date(
                            order?.realizado_em || getOrderCreatedTimestamp(order),
                          ).getTime();
                          const rowElapsedMinutes = Number.isFinite(rowCreatedAtMs)
                            ? Math.max(0, (currentTimeMs - rowCreatedAtMs) / 60_000)
                            : 0;
                          const rowAccentColor =
                            viewMode !== "arquivados" && isEntrega
                              ? getWaitingTimeColor(
                                  rowElapsedMinutes,
                                  averageDeliveryTimeMinutes,
                                )
                              : getListGroupAccentColor(activeListGroup.key);
      
                          return (
                            <div
                              key={order.id}
                              onClick={() => handleOrderCardClick(order)}
                              onDoubleClick={(event) => {
                                if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
                                event.preventDefault();
                                handleOrderCardDoubleClick(order, canSelectForDelivery);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  handleSelectOrder(order);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              className={`relative cursor-pointer px-3 py-2.5 transition-colors duration-150 sm:px-4 sm:py-3 ${rowBgClass} hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset`}
                              style={
                                isSelectedForDelivery
                                  ? {
                                      backgroundColor: hexToRgba(primaryColor, 0.12),
                                      boxShadow: `inset 0 0 0 1px ${hexToRgba(primaryColor, 0.22)}`,
                                    }
                                  : ({
                                      "--tw-ring-color": hexToRgba(
                                        primaryColor,
                                        0.35,
                                      ),
                                    } as any)
                              }
                            >
                              <div
                                className={`grid grid-cols-1 gap-2.5 ${
                                  selected
                                    ? "xl:grid-cols-[minmax(220px,1fr)_minmax(240px,1.1fr)_160px] xl:items-center xl:gap-3"
                                    : "xl:grid-cols-[minmax(280px,0.9fr)_minmax(400px,1.4fr)_180px] xl:items-center xl:gap-4"
                                }`}
                              >
                                <span
                                  aria-hidden="true"
                                  className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full"
                                  style={{
                                    backgroundColor: isSelectedForDelivery
                                      ? primaryColor
                                      : rowAccentColor,
                                  }}
                                />
                                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                                  {canSelectForDelivery && (
                                    <button
                                      type="button"
                                      aria-label={
                                        isSelectedForDelivery
                                          ? "Remover pedido da entrega"
                                          : "Selecionar pedido para entrega"
                                      }
                                      aria-checked={isSelectedForDelivery}
                                      role="checkbox"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        toggleOrderSelection(order.id);
                                      }}
                                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border sm:mt-0.5 sm:h-5 sm:w-5 sm:rounded-md"
                                      style={{
                                        borderColor: isSelectedForDelivery
                                          ? primaryColor
                                          : "#cbd5e1",
                                        backgroundColor: isSelectedForDelivery
                                          ? primaryColor
                                          : "#fff",
                                      }}
                                    >
                                      {isSelectedForDelivery && (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                      )}
                                    </button>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {dailyTicketNumber ? (
                                        <span className="rounded-md border border-slate-300 bg-white px-2 py-0.5 font-mono text-sm font-black text-slate-900">
                                          Comanda {dailyTicketNumber}
                                        </span>
                                      ) : (
                                        <span className="text-sm font-semibold text-gray-800">
                                          Pedido {order.numero_pedido || order.id}
                                        </span>
                                      )}
                                      {viewMode === "arquivados" && (
                                        <>
                                          <span
                                            className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                                            style={{
                                              backgroundColor: sc.bg,
                                              color: sc.text,
                                            }}
                                          >
                                            {statusDisplay}
                                          </span>
                                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                            {getOrderTypeLabel(order)}
                                          </span>
                                        </>
                                      )}
                                      {orderPaymentIsPending && (
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                          Pagamento pendente
                                        </span>
                                      )}
                                      {hasPendingCancellationRequest(order) && (
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                                          Cancelamento para análise
                                        </span>
                                      )}
                                      {isEntrega &&
                                        assignedDelivery?.entregador_id && (
                                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                                            <span>Atribuído</span>
                                            <button
                                              type="button"
                                              title="Desvincular entregador"
                                              aria-label="Desvincular entregador"
                                              disabled={
                                                unassigningDeliveryId ===
                                                assignedDelivery.id
                                              }
                                              onClick={(event) =>
                                                handleUnassignCourier(
                                                  assignedDelivery,
                                                  event,
                                                )
                                              }
                                              className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                                            >
                                              {unassigningDeliveryId ===
                                              assignedDelivery.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                              ) : (
                                                <ArrowLeft className="h-3 w-3" />
                                              )}
                                            </button>
                                          </span>
                                        )}
                                    </div>
                                    <OrderCustomerSummary
                                      order={order}
                                      payment={orderPayment}
                                      paymentLabel={orderPaymentLabel}
                                      nowMs={currentTimeMs}
                                      averageDeliveryMinutes={averageDeliveryTimeMinutes}
                                      timestamp={
                                        viewMode === "arquivados"
                                          ? getOrderCreatedTimestamp(order)
                                          : order.realizado_em ||
                                            order.criado_em ||
                                            order.created_at ||
                                            new Date()
                                      }
                                      cashChangeStatusLabel={cashChangeStatusLabel}
                                    />
                                    {order.status === "nao_entregue" && (
                                      <div className="mt-1 rounded-md border border-red-100 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                                        Problema na entrega
                                        {failureReason ? `: ${failureReason}` : ""}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="min-w-0 xl:px-2">
                                  <CompactOrderStatusTimeline
                                    order={order}
                                    primaryColor={primaryColor}
                                    confirmationPending={orderPaymentIsPending}
                                    comfortable={!selected}
                                  />
                                </div>
                                <div className="flex w-full flex-col items-end gap-1 border-t border-gray-100 pt-3 text-right xl:border-0 xl:pt-0">
                                  <div className="text-sm font-bold text-slate-900">
                                    R${" "}
                                    {parseFloat(order.valor_total || order.total || 0)
                                      .toFixed(2)
                                      .replace(".", ",")}
                                  </div>
                                  {operationalActionLabel && viewMode !== "arquivados" && (
                                    <button
                                      type="button"
                                      onClick={(event) =>
                                        void handleOperationalRowAction(
                                          order,
                                          activeListGroup.key,
                                          event,
                                        )
                                      }
                                      disabled={operationalActionBusy}
                                      className="mt-1.5 inline-flex min-h-8 w-full max-w-44 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
                                      style={{ backgroundColor: primaryColor }}
                                    >
                                      {operationalActionBusy ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : activeListGroup.key === "falta_imprimir" ? (
                                        <Printer className="h-3.5 w-3.5" />
                                      ) : activeListGroup.key === "cancelamentos" ? (
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                      ) : activeListGroup.key === "entregues_aguardando_pagamento" ? (
                                        <CreditCard className="h-3.5 w-3.5" />
                                      ) : activeListGroup.key === "nao_entregues" ? (
                                        <RotateCcw className="h-3.5 w-3.5" />
                                      ) : (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      )}
                                      {operationalActionLabel}
                                    </button>
                                  )}
                                  {operationalActionLabel !== "Ver detalhes" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectOrder(order);
                                      }}
                                      className="mt-1 inline-flex min-h-8 items-center gap-1 rounded-lg px-1 text-xs font-medium hover:underline"
                                      style={{ color: PRIMARY }}
                                    >
                                      <Eye className="h-4 w-4" /> Ver detalhes
                                    </button>
                                  )}
                                  {viewMode !== "arquivados" &&
                                    canQuickArchiveOrder(order) && (
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          void toggleArchivedOrder(order);
                                        }}
                                        disabled={archivingOrderId === order.id}
                                        className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-wait disabled:opacity-70 sm:ml-auto sm:mt-1 sm:min-h-0 sm:border-0 sm:px-0 sm:hover:underline"
                                      >
                                        {archivingOrderId === order.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Archive className="h-3 w-3" />
                                        )}
                                        Arquivar
                                      </button>
                                    )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
    </>
  );
}

