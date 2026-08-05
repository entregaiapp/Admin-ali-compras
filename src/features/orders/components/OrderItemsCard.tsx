import type { Dispatch, SetStateAction } from "react";
import { Loader2, Package, Pencil, Trash2 } from "lucide-react";

import { PRIMARY } from "@/features/orders/constants";
import {
  getOrderItemConfigurationLines,
  getOrderItemName,
  getOrderItemQuantity,
  getOrderItemTotal,
} from "@/features/orders/utils/orderUtils";

type EditItemTarget = { order: any; item: any } | null;

type OrderItemsCardProps = {
  adminRemovingItemId: string;
  selected: any;
  selectedCanAdminAddItems: boolean;
  selectedIsSalao: boolean;
  selectedItems: any[];
  selectedItemsLoading: boolean;
  selectedOrderUpdating: boolean;
  storePrintData: any;
  removeOrderItemFromSelectedOrder: (item: any) => Promise<void>;
  setAdminEditItemTarget: Dispatch<SetStateAction<EditItemTarget>>;
};

export function OrderItemsCard({
  adminRemovingItemId,
  removeOrderItemFromSelectedOrder,
  selected,
  selectedCanAdminAddItems,
  selectedIsSalao,
  selectedItems,
  selectedItemsLoading,
  selectedOrderUpdating,
  setAdminEditItemTarget,
  storePrintData,
}: OrderItemsCardProps) {
  return (
    <>
                  {/* Items */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" style={{ color: PRIMARY }} /> Itens
                      do Pedido
                    </h4>
                    <div className="space-y-2.5">
                      {selectedItemsLoading && (
                        <p className="text-sm text-gray-500">
                          Carregando produtos...
                        </p>
                      )}
                      {!selectedItemsLoading && selectedItems.length === 0 && (
                        <p className="text-sm text-gray-500">
                          Nenhum produto encontrado para este pedido.
                        </p>
                      )}
                      {!selectedItemsLoading &&
                        selectedItems.map((item: any, idx: number) => {
                          const configurationLines = getOrderItemConfigurationLines(item);
      
                          return (
                            <div
                              key={item.id || idx}
                              className="flex items-start justify-between gap-4"
                            >
                              <div className="min-w-0">
                                <div className="text-sm text-gray-700">
                                  {getOrderItemQuantity(item)}x {getOrderItemName(item)}
                                </div>
                                {configurationLines.length > 0 && (
                                  <div className="mt-1 space-y-0.5 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                                    {configurationLines.map((line, lineIndex) => (
                                      <div key={`${item.id || idx}-configuration-${lineIndex}`} className="break-words text-xs text-slate-600">
                                        {line}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {(item.observacoes || item.obs) && (
                                  <div className="text-xs text-gray-400 italic mt-0.5">
                                    {item.observacoes || item.obs}
                                  </div>
                                )}
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-2">
                                <div className="text-sm font-medium text-gray-700">
                                  R${" "}
                                  {getOrderItemTotal(item).toFixed(2).replace(".", ",")}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setAdminEditItemTarget({ order: selected, item })}
                                    disabled={!selectedCanAdminAddItems || selectedOrderUpdating || !item.id || !item.produto_loja_id || adminRemovingItemId === item.id}
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:w-8"
                                    title="Editar produto"
                                    aria-label={`Editar ${getOrderItemName(item)}`}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void removeOrderItemFromSelectedOrder(item)}
                                    disabled={!selectedCanAdminAddItems || selectedOrderUpdating || !item.id || adminRemovingItemId === item.id}
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:w-8"
                                    title="Excluir produto"
                                    aria-label={`Excluir ${getOrderItemName(item)}`}
                                  >
                                    {adminRemovingItemId === item.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    {!selectedIsSalao && <div className="border-t border-gray-100 mt-3 pt-3 space-y-1.5">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Subtotal</span>
                        <span>
                          R${" "}
                          {parseFloat(selected.subtotal || selected.total || 0)
                            .toFixed(2)
                            .replace(".", ",")}
                        </span>
                      </div>
                      {(selected.tipo_pedido || selected.type || "").toLowerCase() ===
                      "entrega" ? (
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Taxa de entrega</span>
                          <span>
                            R${" "}
                            {parseFloat(
                              selected.taxa_entrega ??
                                storePrintData?.taxa_entrega_padrao ??
                                0,
                            )
                              .toFixed(2)
                              .replace(".", ",")}
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>{selectedIsSalao ? "Consumo no salão" : "Retirada na loja"}</span>
                          <span className="text-green-600">Grátis</span>
                        </div>
                      )}
                      {parseFloat(selected.desconto || 0) > 0 && (
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Desconto</span>
                          <span className="text-green-600">
                            -R${" "}
                            {parseFloat(selected.desconto || 0)
                              .toFixed(2)
                              .replace(".", ",")}
                          </span>
                        </div>
                      )}
                      {parseFloat(selected.acrescimo || 0) > 0 && (
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Acréscimo</span>
                          <span className="text-amber-600">
                            +R${" "}
                            {parseFloat(selected.acrescimo || 0)
                              .toFixed(2)
                              .replace(".", ",")}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-gray-800">
                        <span>Total</span>
                        <span>
                          R${" "}
                          {parseFloat(selected.valor_total || selected.total || 0)
                            .toFixed(2)
                            .replace(".", ",")}
                        </span>
                      </div>
                    </div>}
                  </div>
      
    </>
  );
}

