import { CheckCircle2, CircleX } from "lucide-react";

import { PRIMARY, statusFlow, statusLabels } from "@/features/orders/constants";

type CompactOrderStatusTimelineProps = {
  order: any;
  primaryColor?: string;
  confirmationPending?: boolean;
  comfortable?: boolean;
};

const COMPACT_LABELS: Record<string, string> = {
  "Em Separação": "Separação",
  "Saiu para Entrega": "Em rota",
};

const STATUS_ALIASES: Record<string, string> = {
  recebido: "Recebido",
  separacao: "Em Separação",
  saiu: "Saiu para Entrega",
};

const getOrderType = (order: any) =>
  String(order?.tipo_pedido || order?.type || "").toLowerCase();

const getStatusLabel = (status: unknown) => {
  const value = String(status || "");
  return statusLabels[value] || STATUS_ALIASES[value.toLowerCase()] || value;
};

const getVisibleFlow = (order: any) => {
  const flow = getOrderType(order) === "retirada"
    ? statusFlow.filter((status) => status !== "Saiu para Entrega")
    : statusFlow;

  return String(order?.status || "").toLowerCase() === "nao_entregue"
    ? flow.map((status) => status === "Entregue" ? "Não entregue" : status)
    : flow;
};

export function CompactOrderStatusTimeline({
  order,
  primaryColor = PRIMARY,
  confirmationPending = false,
  comfortable = false,
}: CompactOrderStatusTimelineProps) {
  if (getOrderType(order) === "salao") return null;

  const normalizedStatus = String(order?.status || "").toLowerCase();

  if (normalizedStatus === "cancelado") {
    return (
      <div
        className={`${comfortable ? "w-full text-xs" : "mt-2 max-w-md text-[9px]"} flex items-center gap-1.5 font-semibold text-red-700`}
        aria-label="Progresso do pedido: cancelado"
      >
        <CircleX className="h-3.5 w-3.5 shrink-0 text-red-600" />
        <span className="h-px flex-1 bg-red-200" aria-hidden="true" />
        <span>Pedido cancelado</span>
      </div>
    );
  }

  const visibleFlow = getVisibleFlow(order);
  const currentStatus = normalizedStatus === "nao_entregue"
    ? "Não entregue"
    : getStatusLabel(order?.status);
  const currentIndex = Math.max(visibleFlow.indexOf(currentStatus), 0);

  return (
    <div
      className={`${comfortable ? "w-full" : "mt-2 max-w-md"} grid`}
      style={{ gridTemplateColumns: `repeat(${visibleFlow.length}, minmax(0, 1fr))` }}
      aria-label={`Progresso do pedido: ${currentStatus}`}
    >
      {visibleFlow.map((status, index) => {
        const isFailed = status === "Não entregue";
        const isCurrent = index === currentIndex;
        const isReached = index <= currentIndex;
        const isPendingConfirmation =
          confirmationPending && status === "Confirmado";
        const connectorReached = index < currentIndex && !isPendingConfirmation;
        const connectorFailed = visibleFlow[index + 1] === "Não entregue";

        return (
          <div key={status} className="relative flex min-w-0 flex-col items-center">
            {index < visibleFlow.length - 1 && (
              <span
                className={`absolute left-1/2 h-px w-full -translate-y-1/2 ${comfortable ? "top-2" : "top-[6px]"}`}
                style={{
                  backgroundColor: connectorReached
                    ? connectorFailed ? "#dc2626" : primaryColor
                    : "#d1d5db",
                }}
                aria-hidden="true"
              />
            )}

            <span
              className={`relative z-[1] flex shrink-0 items-center justify-center rounded-full ${comfortable ? "h-4 w-4" : "h-3 w-3"}`}
              style={{
                backgroundColor: isPendingConfirmation ? "#f59e0b" : "#ffffff",
                ...(isCurrent
                  ? {
                      boxShadow: `0 0 0 2px ${
                        isFailed ? "#fee2e2" : `${primaryColor}24`
                      }`,
                    }
                  : {}),
              }}
              aria-hidden="true"
            >
              {isFailed ? (
                <CircleX className={`${comfortable ? "h-4 w-4" : "h-3 w-3"} fill-red-600 text-white`} />
              ) : isPendingConfirmation ? (
                <span className={`${comfortable ? "h-2 w-2" : "h-1.5 w-1.5"} rounded-full bg-white`} />
              ) : isReached ? (
                <CheckCircle2
                  className={`${comfortable ? "h-4 w-4" : "h-3 w-3"} text-white`}
                  style={{ fill: primaryColor }}
                />
              ) : (
                <span className={`${comfortable ? "h-2.5 w-2.5" : "h-2 w-2"} rounded-full bg-gray-300`} />
              )}
            </span>

            <span
              className={`${comfortable ? "mt-1.5 text-[10px] leading-tight" : "mt-1 text-[8px] leading-none"} w-full truncate px-0.5 text-center ${
                isCurrent
                  ? isFailed
                    ? "font-semibold text-red-700"
                    : "font-semibold text-gray-700"
                  : isPendingConfirmation
                    ? "font-semibold text-amber-600"
                  : "text-gray-400"
              }`}
              title={status}
            >
              {COMPACT_LABELS[status] || status}
            </span>
          </div>
        );
      })}
    </div>
  );
}
