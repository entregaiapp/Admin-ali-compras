const salaoQuantityFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export const formatSalaoQuantity = (value: unknown) => {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return String(value ?? "");
  return salaoQuantityFormatter.format(quantity);
};

export const formatSalaoQuantityInput = (value: unknown) => {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return String(value ?? "");
  return String(quantity).replace(".", ",");
};
