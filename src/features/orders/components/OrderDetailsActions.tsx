import type { MouseEvent } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Loader2,
  Package,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Store,
} from "lucide-react";

type OrderDetailsActionsProps = {
  adminCannotConfirmDelivery: boolean;
  adminCannotDispatchDelivery: boolean;
  getStatusLabel: (status: string) => string;
  handlePrintComanda: (order: any) => void;
  openForceFinalizeConfirm: (
    order: any,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
  openItemsChecklist: (order: any) => void;
  openRefundModal: () => void;
  requestOrderCancellation: (orderId: string) => void | Promise<void>;
  selected: any;
  selectedArchiving: boolean;
  selectedCancellationPending: boolean;
  selectedCanAdminAddItems: boolean;
  selectedCanForceFinalize: boolean;
  selectedCanProceed: boolean;
  selectedCanRefund: boolean;
  selectedCancelling: boolean;
  selectedForceFinalizing: boolean;
  selectedIsDelivery: boolean;
  selectedIsFiado: boolean;
  selectedIsSalao: boolean;
  selectedOrderUpdating: boolean;
  selectedPickupNeedsCashConfirmation: boolean;
  selectedForPrint: any;
  setAdminAddItemsOrder: (order: any) => void;
  setDeliveryToPickupOrder: (order: any) => void;
  toggleArchivedOrder: (order: any) => void | Promise<void>;
};

export function OrderDetailsActions({
  adminCannotConfirmDelivery,
  adminCannotDispatchDelivery,
  getStatusLabel,
  handlePrintComanda,
  openForceFinalizeConfirm,
  openItemsChecklist,
  openRefundModal,
  requestOrderCancellation,
  selected,
  selectedArchiving,
  selectedCancellationPending,
  selectedCanAdminAddItems,
  selectedCanForceFinalize,
  selectedCanProceed,
  selectedCanRefund,
  selectedCancelling,
  selectedForceFinalizing,
  selectedForPrint,
  selectedIsDelivery,
  selectedIsFiado,
  selectedIsSalao,
  selectedOrderUpdating,
  selectedPickupNeedsCashConfirmation,
  setAdminAddItemsOrder,
  setDeliveryToPickupOrder,
  toggleArchivedOrder,
}: OrderDetailsActionsProps) {
  const selectedStatusLabel = getStatusLabel(selected.status);
  const isFinished = ["Entregue", "Cancelado", "Não entregue"].includes(
    selectedStatusLabel,
  );

  return (
    <div className="space-y-2">
        {!selectedIsSalao && (
          <>
            {!selectedCanProceed && !isFinished && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                O pedido só pode avançar após a aprovação do pagamento.
              </div>
            )}
            {selectedPickupNeedsCashConfirmation && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Confirme o recebimento do pagamento antes de finalizar a retirada.
              </div>
            )}
            {adminCannotDispatchDelivery && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Pedido pronto. A saída para entrega deve ser iniciada pelo entregador.
              </div>
            )}
            {adminCannotConfirmDelivery && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                A entrega deve ser confirmada pelo entregador com a chave do cliente.
              </div>
            )}
          </>
        )}

        {selectedCanForceFinalize && (
          <button
            onClick={(event) => openForceFinalizeConfirm(selected, event)}
            disabled={selectedOrderUpdating}
            aria-busy={selectedForceFinalizing}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-wait disabled:opacity-70"
          >
            {selectedForceFinalizing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finalizando...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                Pular etapas e finalizar
              </>
            )}
          </button>
        )}

        <button
          onClick={() => handlePrintComanda(selectedForPrint)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Printer className="h-4 w-4" /> Imprimir Comanda
        </button>
        <button
          onClick={() => setAdminAddItemsOrder(selected)}
          disabled={!selectedCanAdminAddItems || selectedOrderUpdating}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Adicionar produtos
        </button>
        {selectedIsDelivery && (
          <button
            onClick={() => setDeliveryToPickupOrder(selected)}
            disabled={selectedOrderUpdating}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Store className="h-4 w-4" /> Alterar para retirada
          </button>
        )}
        {!selectedIsSalao && (
          <button
            onClick={() => openItemsChecklist(selected)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Package className="h-4 w-4" /> Ver produtos
          </button>
        )}
        {!selectedIsSalao && !selectedIsFiado && (
          <button
            onClick={openRefundModal}
            disabled={!selectedCanRefund || selectedOrderUpdating}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" /> Reembolsar
          </button>
        )}
        <button
          onClick={() => void toggleArchivedOrder(selected)}
          disabled={selectedOrderUpdating}
          aria-busy={selectedArchiving}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-wait disabled:opacity-70"
        >
          {selectedArchiving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Atualizando...
            </>
          ) : (
            <>
              {selected.arquivado ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              {selected.arquivado ? "Restaurar pedido" : "Arquivar pedido"}
            </>
          )}
        </button>
        {selectedStatusLabel !== "Cancelado" &&
          selectedStatusLabel !== "Entregue" &&
          !selectedCancellationPending && (
            <button
              onClick={() => void requestOrderCancellation(selected.id)}
              disabled={selectedOrderUpdating}
              aria-busy={selectedCancelling}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-70"
            >
              {selectedCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cancelando...
                </>
              ) : (
                "Cancelar Pedido"
              )}
            </button>
          )}
        {!selectedIsSalao && (
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50">
            <Phone className="h-4 w-4" /> Entrar em Contato
          </button>
        )}
    </div>
  );
}

type OrderDetailsStickyActionProps = {
  handleSelectedStickyAction: (
    event: MouseEvent<HTMLButtonElement>,
  ) => void | Promise<void>;
  primaryColor: string;
  selectedCancellationPending: boolean;
  selectedCancellationResolving: boolean;
  selectedOrderUpdating: boolean;
  selectedStatusUpdating: boolean;
  selectedStickyActionLabel: string | null;
  selectedStickyWaitingLabel: string | null;
};

export function OrderDetailsStickyAction({
  handleSelectedStickyAction,
  primaryColor,
  selectedCancellationPending,
  selectedCancellationResolving,
  selectedOrderUpdating,
  selectedStatusUpdating,
  selectedStickyActionLabel,
  selectedStickyWaitingLabel,
}: OrderDetailsStickyActionProps) {
  if (!selectedStickyActionLabel && !selectedStickyWaitingLabel) return null;

  return (
    <div className="z-20 shrink-0 border-t border-gray-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:px-5 sm:py-4">
      {selectedStickyActionLabel ? (
        <div className="flex items-center gap-3">
          <div className="hidden min-w-0 flex-1 sm:block">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Próxima ação
            </div>
            <div className="truncate text-sm font-medium text-gray-700">
              {selectedStickyActionLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={(event) => void handleSelectedStickyAction(event)}
            disabled={selectedOrderUpdating}
            aria-busy={
              selectedStatusUpdating || selectedCancellationResolving
            }
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:min-w-56"
            style={{
              backgroundColor: selectedCancellationPending
                ? "#b91c1c"
                : primaryColor,
            }}
          >
            {selectedOrderUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : selectedCancellationPending ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {selectedOrderUpdating
              ? "Atualizando..."
              : selectedStickyActionLabel}
          </button>
        </div>
      ) : (
        <div className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {selectedStickyWaitingLabel}
        </div>
      )}
    </div>
  );
}
