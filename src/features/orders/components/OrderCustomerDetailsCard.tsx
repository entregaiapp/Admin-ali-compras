import { MapPin, Phone, User } from "lucide-react";

import { PRIMARY } from "@/features/orders/constants";
import {
  getOrderAddress,
  getOrderNeighborhood,
} from "@/features/orders/utils/orderUtils";
import { getOrderCustomerPhone } from "@/features/orders/utils/ordersScreenUtils";

type OrderCustomerDetailsCardProps = {
  selected: any;
  selectedCanEditAdminDeliveryAddress: boolean;
  selectedIsSalao: boolean;
  openAddressEditModal: (order: any) => void;
};

export function OrderCustomerDetailsCard({
  openAddressEditModal,
  selected,
  selectedCanEditAdminDeliveryAddress,
  selectedIsSalao,
}: OrderCustomerDetailsCardProps) {
  return (
    <>
                  {/* Customer info */}
                  {!selectedIsSalao && <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" style={{ color: PRIMARY }} /> Dados do
                      Cliente
                    </h4>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-800">
                        {selected.cliente?.nome || selected.customer || "Sem nome"}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Phone className="w-3.5 h-3.5" />
                        {getOrderCustomerPhone(selected) || "Sem telefone"}
                      </div>
                      {selected.cpf_na_nota && (
                        <div className="text-sm text-gray-500">
                          <span className="font-medium text-gray-700">
                            CPF na nota:
                          </span>{" "}
                          {selected.cpf_na_nota_cpf || "Informado"}
                        </div>
                      )}
                      {(selected.tipo_pedido || selected.type || "").toLowerCase() ===
                        "entrega" && (
                        <>
                          <div className="flex items-start gap-2 text-sm text-gray-500">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span>{getOrderAddress(selected)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: "#e0e7ff", color: "#3730a3" }}
                            >
                              Bairro: {getOrderNeighborhood(selected)}
                            </span>
                          </div>
                          {selectedCanEditAdminDeliveryAddress && (
                            <button
                              type="button"
                              onClick={() => openAddressEditModal(selected)}
                              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              Editar endereço
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>}
      
    </>
  );
}
