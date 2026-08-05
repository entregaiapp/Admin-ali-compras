import { ArrowLeft, Package, Printer, X } from "lucide-react";

import { statusColor } from "@/features/orders/constants";
import {
  formatOrderDateTime,
  getDailyTicketNumber,
  getOrderTypeLabel,
} from "@/features/orders/utils/ordersScreenUtils";
import type { AdminPixCharge } from "@/features/adminPixCharges/types/adminPixCharge";

type OrderDetailsHeaderProps = {
  selected: any;
  selectedAdminPixCharge: AdminPixCharge | null;
  selectedForPrint: any;
  selectedIsSalao: boolean;
  getStatusLabel: (status: string) => string;
  handlePrintComanda: (order: any) => void;
  onClose: () => void;
  openItemsChecklist: (order: any) => void;
};

export function OrderDetailsHeader({
  getStatusLabel,
  handlePrintComanda,
  onClose,
  openItemsChecklist,
  selected,
  selectedAdminPixCharge,
  selectedForPrint,
  selectedIsSalao,
}: OrderDetailsHeaderProps) {
  const dailyTicketNumber = getDailyTicketNumber(selected);
  const selectedStatusColor =
    statusColor[selected.status] ||
    statusColor.Recebido || { bg: "#eee", text: "#666" };

  return (
    <div className="sticky top-0 z-10 flex items-start gap-2 border-b border-gray-100 bg-white px-3 py-2.5 sm:items-center sm:gap-3 sm:px-5 sm:py-3.5">
      <button
        onClick={onClose}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
        aria-label="Voltar para a lista de pedidos"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1 pt-0.5 sm:pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-gray-900">
            Pedido {selected.numero_pedido || selected.id}
          </h2>
          {dailyTicketNumber && (
            <span className="rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 font-mono text-sm font-black text-slate-900">
              Comanda {dailyTicketNumber}
            </span>
          )}
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: selectedStatusColor.bg,
              color: selectedStatusColor.text,
            }}
          >
            {getStatusLabel(selected.status)}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-gray-400">
          {formatOrderDateTime(
            selected.realizado_em ||
              selected.criado_em ||
              selected.created_at ||
              new Date(),
          )}{" "}
          · {getOrderTypeLabel(selected)}
        </div>
        {selected.agendado_para && (
          <div className="mt-1 text-xs text-amber-700">
            Entrega agendada para {formatOrderDateTime(selected.agendado_para)}
          </div>
        )}
      </div>

      {!selectedIsSalao && (
        <button
          onClick={() => handlePrintComanda(selectedForPrint)}
          disabled={Boolean(
            selectedAdminPixCharge && selectedAdminPixCharge.estado !== "aprovado",
          )}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1.5"
          title="Imprimir comanda"
        >
          <Printer className="h-4 w-4" />
          <span className="hidden text-xs sm:inline">Imprimir</span>
        </button>
      )}

      {!selectedIsSalao && (
        <button
          onClick={() => openItemsChecklist(selected)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-sm text-gray-600 transition-colors hover:bg-gray-50 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1.5"
          title="Ver produtos"
        >
          <Package className="h-4 w-4" />
          <span className="hidden text-xs sm:inline">Ver produtos</span>
        </button>
      )}

      <button
        onClick={onClose}
        className="hidden flex-col items-center gap-0.5 rounded-md px-1 py-0.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 lg:flex"
        title="Fechar detalhes — tecla Esc"
        aria-label="Fechar detalhes do pedido — tecla Esc"
      >
        <X className="h-5 w-5" />
        <kbd className="font-sans text-[8px] font-semibold uppercase leading-none tracking-wide text-gray-400">
          Esc
        </kbd>
      </button>
    </div>
  );
}
