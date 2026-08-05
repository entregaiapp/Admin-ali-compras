import { memo } from "react";
import { AlertTriangle } from "lucide-react";

import {
  getBackendStatus,
  getOrderNeighborhood,
  getOrderPaymentMethod,
  isDeliveryOrder,
} from "@/features/orders/utils/orderUtils";
import {
  formatElapsedOrderTime,
  getTransparentRgb,
  getWaitingTimeColor,
} from "@/features/orders/utils/ordersScreenUtils";

type OrderCustomerSummaryProps = {
  order: any;
  payment: any;
  paymentLabel?: string;
  timestamp: Date | string;
  cashChangeStatusLabel?: string;
  nowMs: number;
  averageDeliveryMinutes: number;
};

export const OrderCustomerSummary = memo(function OrderCustomerSummary({
  order,
  payment,
  paymentLabel,
  timestamp,
  cashChangeStatusLabel,
  nowMs,
  averageDeliveryMinutes,
}: OrderCustomerSummaryProps) {
  const timestampMs = new Date(timestamp).getTime();
  const elapsedMinutes = Number.isFinite(timestampMs)
    ? Math.max(0, (nowMs - timestampMs) / 60_000)
    : 0;
  const status = getBackendStatus(order?.status || "");
  const tracksDeliveryWait =
    isDeliveryOrder(order) && !["entregue", "cancelado"].includes(status);
  const reachedDeliveryLimit =
    tracksDeliveryWait && elapsedMinutes >= averageDeliveryMinutes;
  const waitingColor = getWaitingTimeColor(
    elapsedMinutes,
    averageDeliveryMinutes,
  );

  return (
    <div className="mt-1.5 min-w-0 space-y-1 text-xs">
      <span className="block min-w-0 max-w-full truncate font-medium text-slate-700 sm:max-w-[260px]">
        {order.cliente?.nome || order.customer || "Desconhecido"}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
        {tracksDeliveryWait ? (
          <span
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 font-semibold"
            style={{
              color: waitingColor,
              borderColor: waitingColor,
              backgroundColor: getTransparentRgb(waitingColor, 0.1),
            }}
            title={`Tempo médio de entrega configurado: ${averageDeliveryMinutes} min`}
          >
            {reachedDeliveryLimit && <AlertTriangle className="h-3.5 w-3.5" />}
            Aguardando há {formatElapsedOrderTime(elapsedMinutes)}
          </span>
        ) : (
          <span className="whitespace-nowrap text-gray-400">
            Realizado há {formatElapsedOrderTime(elapsedMinutes)}
          </span>
        )}
        <span className="whitespace-nowrap text-gray-500">
          {paymentLabel || getOrderPaymentMethod(order, payment)}
        </span>
        {isDeliveryOrder(order) && (
          <>
            <span className="text-gray-300" aria-hidden="true">•</span>
            <span className="whitespace-nowrap text-gray-500">
              {getOrderNeighborhood(order)}
            </span>
          </>
        )}
        {cashChangeStatusLabel && (
          <>
            <span className="text-gray-300" aria-hidden="true">•</span>
            <span
              className={`whitespace-nowrap font-semibold ${
                cashChangeStatusLabel === "Troco repassado"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {cashChangeStatusLabel}
            </span>
          </>
        )}
      </div>
    </div>
  );
});
