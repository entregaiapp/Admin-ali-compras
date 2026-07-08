import { Minus, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Selection = { group: any; option: any; quantity: number };

type ConfiguredItem = {
  variationId: string;
  selections: Array<Selection & {
    fraction?: number | null;
    unitPrice: number;
    contribution: number;
  }>;
  quantity: number;
  notes: string;
};

type SalaoProductConfiguratorModalProps = {
  product: any;
  configuration: any;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (item: ConfiguredItem) => void;
};

const normalizeText = (value: unknown) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const formatMoney = (value: unknown) => `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;

const roundCurrency = (value: number) => Number(value.toFixed(2));

const isPromotionActive = (promotional: unknown, endsAt: unknown) =>
  promotional !== null &&
  promotional !== undefined &&
  (!endsAt || new Date(String(endsAt)).getTime() >= Date.now());

const effectivePrice = (
  regular: unknown,
  promotional?: unknown,
  promotionEndsAt?: unknown,
) => {
  const regularPrice = Number(regular || 0);
  const promotionalPrice = Number(promotional);
  return isPromotionActive(promotional, promotionEndsAt) &&
    Number.isFinite(promotionalPrice) &&
    promotionalPrice < regularPrice
    ? promotionalPrice
    : regularPrice;
};

const variationOverrideFor = (item: any, variationId: string) =>
  (item.precos_variacao || []).find(
    (price: any) => price.variacao_produto_loja_id === variationId,
  );

const priceForVariation = (item: any, variationId: string) => {
  const variationPrice = variationOverrideFor(item, variationId);
  if (variationPrice) {
    return effectivePrice(
      variationPrice.preco_adicional ?? item.preco_adicional,
      variationPrice.preco_promocional,
      variationPrice.promocao_ate,
    );
  }

  return effectivePrice(item.preco_adicional, item.preco_promocional, item.promocao_ate);
};

const variationPriceFor = (product: any, configuration: any, variationId: string) => {
  const variation = (configuration?.variacoes || []).find((item: any) => item.id === variationId);
  if (variation) {
    return effectivePrice(variation.preco, variation.preco_promocional, variation.promocao_ate);
  }

  return effectivePrice(product?.preco, product?.preco_promocional, product?.promocao_ate);
};

const isOptionAvailable = (option: any, variationId: string) => {
  const variationPrice = (option.precos_variacao || []).find(
    (price: any) => price.variacao_produto_loja_id === variationId,
  );
  return option.ativa !== false && variationPrice?.disponivel !== false;
};

const getGroupLimits = (group: any, variationId: string) => {
  const rule = (group.regras_variacao || []).find(
    (item: any) => item.variacao_produto_loja_id === variationId,
  );
  const maximum = Number(rule?.maximo_selecoes ?? group.maximo_selecoes ?? 1);
  return {
    minimum: Math.max(0, Number(rule?.minimo_selecoes ?? group.minimo_selecoes ?? 0)),
    maximum: Math.max(1, maximum),
  };
};

export function SalaoProductConfiguratorModal({
  product,
  configuration,
  busy = false,
  onClose,
  onConfirm,
}: SalaoProductConfiguratorModalProps) {
  const groups = useMemo(
    () => (configuration?.grupos || []).filter((group: any) => group.ativo !== false),
    [configuration],
  );
  const initialVariation = configuration?.variacoes?.find((variation: any) => variation.ativa !== false)?.id || "";
  const [variationId, setVariationId] = useState(initialVariation);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  const optionCount = useMemo(
    () => groups.reduce((total: number, group: any) => total + (group.opcoes || []).filter((option: any) => option.ativa !== false).length, 0),
    [groups],
  );
  const showOptionSearch = optionCount > 5;

  useEffect(() => {
    if (showOptionSearch) searchRef.current?.focus();
  }, [showOptionSearch]);

  const visibleGroups = useMemo(() => {
    const query = normalizeText(search.trim());
    return groups
      .map((group: any) => ({
        ...group,
        opcoes: (group.opcoes || []).filter((option: any) => (
          isOptionAvailable(option, variationId)
          && (!query || normalizeText(`${option.nome} ${option.descricao || ""}`).includes(query))
        )),
      }))
      .filter((group: any) => group.opcoes.length > 0);
  }, [groups, search, variationId]);

  const countGroupSelections = (groupId: string, current = selections) => current
    .filter((selection) => selection.group.id === groupId)
    .reduce((total, selection) => total + selection.quantity, 0);

  const toggleOption = (group: any, option: any) => {
    setSelections((current) => {
      const selected = current.find((selection) => selection.group.id === group.id && selection.option.id === option.id);
      if (selected) return current.filter((selection) => !(selection.group.id === group.id && selection.option.id === option.id));

      if (group.tipo_selecao === "unica") {
        return [...current.filter((selection) => selection.group.id !== group.id), { group, option, quantity: 1 }];
      }

      if (countGroupSelections(group.id, current) >= getGroupLimits(group, variationId).maximum) return current;
      return [...current, { group, option, quantity: 1 }];
    });
  };

  const changeOptionQuantity = (group: any, option: any, direction: number) => {
    setSelections((current) => {
      const selected = current.find((selection) => selection.group.id === group.id && selection.option.id === option.id);
      if (!selected) return current;

      const nextQuantity = selected.quantity + direction;
      if (nextQuantity <= 0) {
        return current.filter((selection) => !(selection.group.id === group.id && selection.option.id === option.id));
      }

      const limits = getGroupLimits(group, variationId);
      const optionMaximum = Math.max(1, Number(option.quantidade_maxima || limits.maximum));
      const nextGroupCount = countGroupSelections(group.id, current) + direction;
      if (nextQuantity > optionMaximum || nextGroupCount > limits.maximum) return current;

      return current.map((selection) => (
        selection.group.id === group.id && selection.option.id === option.id
          ? { ...selection, quantity: nextQuantity }
          : selection
      ));
    });
  };

  const validationIssue = useMemo(() => {
    if ((configuration?.variacoes || []).length > 0 && !variationId) return "Selecione uma variação.";
    const invalidGroup = groups.find((group: any) => {
      const limits = getGroupLimits(group, variationId);
      const selected = countGroupSelections(group.id);
      return selected < limits.minimum || selected > limits.maximum;
    });
    if (invalidGroup) {
      const limits = getGroupLimits(invalidGroup, variationId);
      return limits.minimum > 0
        ? `Escolha ao menos ${limits.minimum} opção(ões) em ${invalidGroup.nome}.`
        : `Revise as opções de ${invalidGroup.nome}.`;
    }
    return "";
  }, [configuration?.variacoes, groups, selections, variationId]);

  const pricedConfiguration = useMemo(() => {
    let basePrice = variationPriceFor(product, configuration, variationId);
    let optionsPrice = 0;
    const pricedSelections: ConfiguredItem["selections"] = [];

    for (const group of groups) {
      const groupSelections = selections.filter((selection) => selection.group.id === group.id);
      const fraction = group.tipo_selecao === "fracionada" && groupSelections.length > 0
        ? 1 / groupSelections.length
        : null;
      let fractionalPrice = 0;

      for (const selection of groupSelections) {
        const unitPrice = priceForVariation(selection.option, variationId);
        const contribution = group.tipo_selecao === "fracionada"
          ? roundCurrency(unitPrice * (fraction || 0))
          : roundCurrency(unitPrice * selection.quantity);

        if (group.tipo_selecao === "fracionada") {
          fractionalPrice += contribution;
        } else {
          optionsPrice += contribution;
        }

        pricedSelections.push({
          ...selection,
          fraction,
          unitPrice,
          contribution,
        });
      }

      if (group.tipo_selecao === "fracionada" && group.substitui_preco_base && groupSelections.length > 0) {
        basePrice = roundCurrency(fractionalPrice);
      }
    }

    return {
      selections: pricedSelections,
      unitPrice: roundCurrency(basePrice + optionsPrice),
    };
  }, [configuration, groups, product, selections, variationId]);
  const unitPrice = pricedConfiguration.unitPrice;

  return (
    <div className="fixed inset-0 z-[100] flex items-end bg-slate-950/50 p-0 backdrop-blur-[1px] sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-label={`Configurar ${product?.nome || "produto"}`}>
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Personalizar item</p>
            <h2 className="truncate text-lg font-extrabold text-slate-950">{product?.nome || "Produto"}</h2>
            <p className="mt-0.5 text-sm text-slate-500">Selecione as opções antes de lançar na mesa.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label="Fechar configurador">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {(configuration?.variacoes || []).length > 0 && (
            <section className="mb-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-900">Variação / tamanho</h3>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-extrabold uppercase text-amber-700">Obrigatório</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(configuration.variacoes || []).filter((variation: any) => variation.ativa !== false).map((variation: any) => (
                  <button
                    key={variation.id}
                    type="button"
                    onClick={() => {
                      setVariationId(variation.id);
                      setSelections((current) => current.filter((selection) => isOptionAvailable(selection.option, variation.id)));
                    }}
                    className={`rounded-xl border px-3 py-2 text-left text-sm font-bold transition-colors ${variationId === variation.id ? "border-[#122a4c] bg-[#122a4c] text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}
                  >
                    <span className="block">{variation.nome}</span>
                    <span className={`block text-xs ${variationId === variation.id ? "text-white/80" : "text-slate-500"}`}>{formatMoney(variation.preco_promocional ?? variation.preco)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {showOptionSearch && (
            <label className="mb-5 block">
              <span className="mb-1.5 block text-xs font-extrabold text-slate-700">Buscar adicional</span>
              <span className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-[#122a4c] focus-within:bg-white">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input ref={searchRef} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Digite o adicional..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
                {search && <button type="button" onClick={() => setSearch("")} className="text-xs font-bold text-slate-500 hover:text-slate-900">Limpar</button>}
              </span>
            </label>
          )}

          <div className="space-y-5">
            {visibleGroups.map((group: any) => {
              const limits = getGroupLimits(group, variationId);
              const selectedCount = countGroupSelections(group.id);
              return (
                <section key={group.id} className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">{group.nome}</h3>
                      <p className="text-xs text-slate-500">{group.descricao || `Escolha de ${limits.minimum} até ${limits.maximum} opção(ões).`}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase ${limits.minimum > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{limits.minimum > 0 ? "Obrigatório" : "Opcional"}</span>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">{selectedCount} de {limits.maximum}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {group.opcoes.map((option: any) => {
                      const selection = selections.find((item) => item.group.id === group.id && item.option.id === option.id);
                      const limitReached = !selection && selectedCount >= limits.maximum;
                      const canChangeQuantity = Boolean(selection && group.permite_quantidade);
                      return (
                        <div key={option.id} className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${selection ? "border-[#122a4c] bg-blue-50/50" : "border-slate-200 bg-white"}`}>
                          <button type="button" disabled={limitReached} onClick={() => toggleOption(group, option)} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-45">
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 text-xs font-extrabold ${group.tipo_selecao === "unica" ? "rounded-full" : "rounded-md"} ${selection ? "border-[#122a4c] bg-[#122a4c] text-white" : "border-slate-300 text-transparent"}`}>✓</span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-slate-900">{option.nome}</span>
                              {option.descricao && <span className="block text-xs text-slate-500">{option.descricao}</span>}
                              {priceForVariation(option, variationId) > 0 && <span className="block text-xs font-medium text-slate-500">+ {formatMoney(priceForVariation(option, variationId))}</span>}
                            </span>
                          </button>
                          {canChangeQuantity && (
                            <div className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-white">
                              <button type="button" onClick={() => changeOptionQuantity(group, option, -1)} className="p-2 text-slate-600 hover:bg-slate-100" aria-label={`Diminuir ${option.nome}`}><Minus className="h-3.5 w-3.5" /></button>
                              <span className="w-7 text-center text-sm font-bold text-slate-900">{selection.quantity}</span>
                              <button type="button" onClick={() => changeOptionQuantity(group, option, 1)} className="p-2 text-slate-600 hover:bg-slate-100" aria-label={`Aumentar ${option.nome}`}><Plus className="h-3.5 w-3.5" /></button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            {visibleGroups.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">Nenhum adicional encontrado.</div>}
          </div>

          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-bold text-slate-800">Observação</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} placeholder="Ex.: sem cebola, molho separado..." className="min-h-20 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#122a4c]" />
          </label>
        </div>

        <footer className="border-t border-slate-100 bg-white p-4 sm:px-6">
          {validationIssue && <p className="mb-3 text-sm font-semibold text-amber-700">{validationIssue}</p>}
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50">
              <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="p-2.5 text-slate-600 hover:bg-white" aria-label="Diminuir quantidade"><Minus className="h-4 w-4" /></button>
              <span className="min-w-8 text-center text-sm font-extrabold text-slate-900">{quantity}</span>
              <button type="button" onClick={() => setQuantity((current) => current + 1)} className="p-2.5 text-slate-600 hover:bg-white" aria-label="Aumentar quantidade"><Plus className="h-4 w-4" /></button>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total do item</p>
              <p className="text-lg font-extrabold text-slate-950">{formatMoney(unitPrice * quantity)}</p>
            </div>
          </div>
          <button type="button" onClick={() => onConfirm({ variationId, selections: pricedConfiguration.selections, quantity, notes })} disabled={Boolean(validationIssue) || busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#122a4c] px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-[#0b1e38] disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? "Adicionando..." : "Adicionar à mesa"}
          </button>
        </footer>
      </div>
    </div>
  );
}
