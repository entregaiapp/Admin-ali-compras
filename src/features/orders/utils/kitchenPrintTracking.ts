import {
  getOrderItemConfigurationLines,
  getOrderItemName,
  getOrderItemQuantity,
} from "@/features/orders/utils/orderUtils";

export type KitchenPrintContext = "pedido" | "salao";

export type KitchenPrintSelectionItem = {
  key: string;
  item: any;
  name: string;
  quantity: number;
  details: string[];
  note: string;
  printed: boolean;
};

const STORAGE_PREFIX = "kitchen-print-history:v1";

const safeText = (value: unknown) => String(value ?? "").trim();

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
};

export const getKitchenPrintStorageKey = (
  context: KitchenPrintContext,
  ownerId: unknown,
) => `${STORAGE_PREFIX}:${context}:${safeText(ownerId) || "sem-id"}`;

export const getKitchenPrintItemKey = (item: any, index: number) => {
  const directId = safeText(
    item?.id ??
      item?.item_id ??
      item?.pedido_item_id ??
      item?.comanda_item_id,
  );
  if (directId) return directId;

  return stableJson({
    index,
    produtoId: item?.produto_id,
    produtoLojaId: item?.produto_loja_id,
    variacaoId: item?.variacao_produto_id ?? item?.variacao_produto_loja_id,
    nome: item?.nome_produto ?? item?.produto?.nome ?? item?.name,
    variacao: item?.nome_variacao,
    quantidade: item?.quantidade ?? item?.quantity ?? item?.qty,
    observacoes: item?.observacoes ?? item?.obs,
    selecoes: item?.selecoes,
  });
};

export const readKitchenPrintedKeys = (storageKey: string) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return new Set<string>(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set<string>();
  }
};

export const markKitchenItemsPrinted = (
  storageKey: string,
  itemKeys: string[],
) => {
  const next = readKitchenPrintedKeys(storageKey);
  itemKeys.forEach((key) => next.add(String(key)));

  try {
    localStorage.setItem(storageKey, JSON.stringify([...next]));
  } catch {
    // A impressao continua funcionando mesmo se o armazenamento local estiver bloqueado.
  }
};

export const buildKitchenPrintSelectionItems = (
  items: any[],
  storageKey: string,
  options: {
    getName?: (item: any) => string;
    getQuantity?: (item: any) => number;
    getDetails?: (item: any) => string[];
    getNote?: (item: any) => string;
  } = {},
): KitchenPrintSelectionItem[] => {
  const printedKeys = readKitchenPrintedKeys(storageKey);

  return (Array.isArray(items) ? items : []).map((item, index) => {
    const key = getKitchenPrintItemKey(item, index);
    return {
      key,
      item,
      name: options.getName?.(item) || getOrderItemName(item),
      quantity: options.getQuantity?.(item) ?? getOrderItemQuantity(item),
      details: options.getDetails?.(item) || getOrderItemConfigurationLines(item),
      note: options.getNote?.(item) || safeText(item?.observacoes || item?.obs),
      printed: printedKeys.has(key),
    };
  });
};
