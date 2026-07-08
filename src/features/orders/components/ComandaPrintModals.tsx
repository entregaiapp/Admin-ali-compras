import { ChefHat, Printer, Receipt, X } from "lucide-react";
import type { ComandaPrintMode } from "@/features/orders/utils/print";
import type { KitchenPrintSelectionItem } from "@/features/orders/utils/kitchenPrintTracking";
import { useMemo, useState, type MouseEvent } from "react";

type PrintModeModalProps = {
  title?: string;
  subtitle?: string;
  busy?: boolean;
  onClose: () => void;
  onSelect: (mode: ComandaPrintMode) => void;
};

type KitchenSelectionModalProps = {
  title?: string;
  subtitle?: string;
  items: KitchenPrintSelectionItem[];
  busy?: boolean;
  onClose: () => void;
  onPrint: (itemKeys: string[]) => void;
};

const stopPropagation = (event: MouseEvent) => event.stopPropagation();

export function ComandaPrintModeModal({
  title = "Imprimir",
  subtitle,
  busy = false,
  onClose,
  onSelect,
}: PrintModeModalProps) {
  const options: Array<{
    mode: ComandaPrintMode;
    label: string;
    description: string;
    icon: typeof Printer;
  }> = [
    {
      mode: "cozinha",
      label: "Cozinha",
      description: "Produtos em destaque para produção.",
      icon: ChefHat,
    },
    {
      mode: "cliente",
      label: "Cliente",
      description: "Comanda completa com fonte normal.",
      icon: Receipt,
    },
    {
      mode: "cliente_cozinha",
      label: "Cliente e Cozinha",
      description: "Comanda completa no modelo atual.",
      icon: Printer,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={stopPropagation}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-950">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs font-medium text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-3 p-4">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.mode}
                type="button"
                onClick={() => onSelect(option.mode)}
                disabled={busy}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-slate-900">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-slate-500">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function KitchenPrintSelectionModal({
  title = "Selecionar produtos",
  subtitle,
  items,
  busy = false,
  onClose,
  onPrint,
}: KitchenSelectionModalProps) {
  const initialSelected = useMemo(
    () =>
      Object.fromEntries(
        items
          .filter((item) => !item.printed)
          .map((item) => [item.key, true]),
      ) as Record<string, boolean>,
    [items],
  );
  const [selected, setSelected] = useState<Record<string, boolean>>(
    initialSelected,
  );
  const selectedKeys = items
    .filter((item) => selected[item.key])
    .map((item) => item.key);
  const newCount = items.filter((item) => !item.printed).length;

  const toggle = (key: string) => {
    setSelected((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={stopPropagation}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-950">
              {title}
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {subtitle || `${newCount} produto${newCount === 1 ? "" : "s"} novo${newCount === 1 ? "" : "s"} para a cozinha.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-600">
          {selectedKeys.length} de {items.length} produto
          {items.length === 1 ? "" : "s"} selecionado
          {selectedKeys.length === 1 ? "" : "s"}
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {items.map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={Boolean(selected[item.key])}
                onChange={() => toggle(item.key)}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-900">
                    {item.quantity}x {item.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      item.printed
                        ? "bg-slate-100 text-slate-600"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {item.printed ? "Já impresso" : "Novo"}
                  </span>
                </span>
                {item.details.length > 0 && (
                  <span className="mt-1 block text-xs font-medium text-slate-500">
                    {item.details.join(" | ")}
                  </span>
                )}
                {item.note && (
                  <span className="mt-1 block text-xs font-bold text-amber-800">
                    Obs: {item.note}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onPrint(selectedKeys)}
            disabled={busy || selectedKeys.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#122a4c] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Printer className="h-4 w-4" />
            Imprimir selecionados
          </button>
        </footer>
      </div>
    </div>
  );
}
