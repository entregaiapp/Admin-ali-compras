import { statusLabels } from '@/features/orders/constants';
export { getApiList } from '@/shared/utils/apiData';

export const extractBairro = (address: string) => {
  if (!address) return "Não informado";
  const parts = address.split("–");
  return parts.length > 1 ? parts[1].trim() : "Não informado";
};

export const getBackendStatus = (status: string) => {
  const mapped = Object.entries(statusLabels).find(
    ([, label]) => label === status,
  );
  if (mapped) return mapped[0];

  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_");
};

export const canChangeDeliveryCourier = (delivery: any) =>
  !delivery || ["aguardando", "atribuida"].includes(delivery.status);

export const isDeliveryOrder = (order: any) =>
  (order?.tipo_pedido || order?.type || "").toLowerCase() === "entrega";

export const getOrderNeighborhood = (order: any) =>
  order.endereco_cliente?.bairro || extractBairro(order.address || "");

export const getOrderAddress = (order: any) => {
  const address = order.endereco_cliente;
  if (!address) return order.address || "Endereço não informado";
  return [address.logradouro || address.rua, address.numero]
    .filter(Boolean)
    .join(", ");
};

export const getDeliveryLabel = (route: any) => {
  if (route.status === "completed") return "Concluída";
  if (route.status === "canceled") return "Cancelada";
  if (!route.optimized) return "Aguardando rota";
  if (route.status === "in_progress") return "Em andamento";
  return "Rota gerada";
};

export const getCourierVehicleLabel = (courier: any) => {
  const vehicle =
    courier?.veiculo ||
    courier?.vehicle ||
    courier?.tipo_veiculo ||
    courier?.tipoVeiculo ||
    courier?.vehicleType;

  if (!vehicle) return "Veículo não informado";

  if (typeof vehicle === "string") {
    return vehicle.replace(/_/g, " ");
  }

  return vehicle.nome || vehicle.name || vehicle.tipo || vehicle.type || "Veículo não informado";
};

export const getApiErrorMessage = (error: any, fallback: string) => {
  const payload = error?.response?.data;
  const candidates = [
    payload?.message,
    payload?.error?.message,
    payload?.error,
    error?.message,
  ];

  const message = candidates.find((value) => typeof value === "string" && value.trim());
  return message || fallback;
};

export const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return `rgba(18, 42, 76, ${alpha})`;

  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
