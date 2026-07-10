import { useEffect, useState } from "react";
import { ImagePlus, Info, Plus, Trash2, X } from "lucide-react";
import { showSystemNotice } from "@/shared/components/SystemNoticeModal";
import { dateTimeInputInBrasilia } from "@/shared/lib/dateTime";
import { productsService } from "../services/productsService";
import type {
  ConfigurableGroup,
  ConfigurableOption,
  ConfigurableVariation,
  ProductConfiguration,
  ProductConfigurationPatch,
} from "../types/product";

const PRIMARY = "#122a4c";
const newKey = () => `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const numberValue = (value: string | number | null | undefined) => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};
const nullableNumberValue = (value: string | number | null | undefined) => {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};
const dateTimeLocalValue = (value: string | null | undefined) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value)) {
    return value.slice(0, 16);
  }
  return dateTimeInputInBrasilia(value);
};
const dateTimePayloadValue = (value: string) => value.trim() || null;
type CatalogItemType = "adicionais" | "pizza";
type OptionItemType = "adicional" | "produto" | "produto_e_adicional";

function InfoHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-400 hover:bg-blue-50 hover:text-blue-700"
        aria-label="Mostrar ajuda"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span className="absolute left-5 top-0 z-20 w-64 rounded-lg border bg-white p-2 text-[11px] font-medium leading-relaxed text-gray-600 shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

function ConfigurationOptionImageUpload({
  file,
  imageUrl,
  disabled,
  onSelect,
}: {
  file?: File;
  imageUrl?: string | null;
  disabled: boolean;
  onSelect: (file: File | null) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState(imageUrl || "");

  useEffect(() => {
    if (!file) {
      setPreviewUrl(imageUrl || "");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, imageUrl]);

  return (
    <label className={`flex w-52 items-center gap-2 rounded border border-dashed p-2 text-xs ${disabled ? "cursor-not-allowed border-gray-200 text-gray-400" : "cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Pré-visualização da imagem do card"
          className="h-12 w-12 flex-shrink-0 rounded object-cover"
          onError={() => setPreviewUrl("")}
        />
      ) : (
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-gray-100 text-gray-400">
          <ImagePlus className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{file?.name || (imageUrl ? "Imagem enviada" : "Enviar imagem")}</span>
        <span className="mt-0.5 block text-[10px] text-gray-400">Pré-visualização</span>
      </span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          onSelect(event.target.files?.[0] || null);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function normalizeGroupRules(group: ConfigurableGroup): ConfigurableGroup {
  if (group.tipo_selecao !== "fracionada") return group;
  return {
    ...group,
    permite_quantidade: false,
    substitui_preco_base: true,
  };
}

function normalizeConfigurationRules(configuration: ProductConfiguration): ProductConfiguration {
  return {
    ...configuration,
    grupos: configuration.grupos.map(normalizeGroupRules),
  };
}

const defaultVariations = (): ConfigurableVariation[] => [
  { chave_cliente: newKey(), nome: "P", preco: 30, ativa: true, ordem_exibicao: 0 },
  { chave_cliente: newKey(), nome: "M", preco: 40, ativa: true, ordem_exibicao: 1 },
  { chave_cliente: newKey(), nome: "G", preco: 50, ativa: true, ordem_exibicao: 2 },
];

const option = (name = "Nova opção", itemType: OptionItemType = "adicional"): ConfigurableOption => ({
  nome: name,
  descricao: null,
  tipo_item: itemType,
  imagem_url: null,
  produto_categoria_id: null,
  preco_adicional: 0,
  preco_promocional: null,
  promocao_ate: null,
  quantidade_maxima: 1,
  ativa: true,
  ordem_exibicao: 0,
  precos_variacao: [],
});

function defaultAddonGroups(): ConfigurableGroup[] {
  return [
    {
      nome: "Adicionais",
      tipo_selecao: "multipla",
      minimo_selecoes: 0,
      maximo_selecoes: 10,
      permite_quantidade: true,
      substitui_preco_base: false,
      ativo: true,
      ordem_exibicao: 0,
      regras_variacao: [],
      opcoes: [option("Bacon extra"), option("Queijo extra")],
    },
    {
      nome: "Escolha o ponto",
      tipo_selecao: "unica",
      minimo_selecoes: 1,
      maximo_selecoes: 1,
      permite_quantidade: false,
      substitui_preco_base: false,
      ativo: true,
      ordem_exibicao: 1,
      regras_variacao: [],
      opcoes: [option("Ao ponto"), option("Bem passado")],
    },
  ];
}

function defaultGroups(variations: ConfigurableVariation[]): ConfigurableGroup[] {
  return [
    {
      nome: "Sabores",
      tipo_selecao: "fracionada",
      minimo_selecoes: 1,
      maximo_selecoes: 3,
      permite_quantidade: false,
      substitui_preco_base: true,
      ativo: true,
      ordem_exibicao: 0,
      regras_variacao: variations.map((variation, index) => ({
        variacao_chave_cliente: variation.chave_cliente,
        minimo_selecoes: 1,
        maximo_selecoes: index + 1,
      })),
      opcoes: [option("Mussarela", "produto_e_adicional"), option("Calabresa", "produto_e_adicional")],
    },
    {
      nome: "Adicionais",
      tipo_selecao: "multipla",
      minimo_selecoes: 0,
      maximo_selecoes: 10,
      permite_quantidade: true,
      substitui_preco_base: false,
      ativo: true,
      ordem_exibicao: 1,
      regras_variacao: [],
      opcoes: [option("Borda recheada")],
    },
  ];
}

function inferItemType(configuration: ProductConfiguration): CatalogItemType {
  const hasFractionalGroup = configuration.grupos.some((group) => group.tipo_selecao === "fracionada");
  return hasFractionalGroup || configuration.variacoes.length > 0 ? "pizza" : "adicionais";
}

function variationRef(variation: ConfigurableVariation) {
  return variation.id
    ? { variacao_produto_loja_id: variation.id }
    : { variacao_chave_cliente: variation.chave_cliente };
}

function stripConfiguration(configuration: ProductConfiguration): ProductConfiguration {
  const variationKeys = configuration.variacoes.map(() => newKey());
  const clientKeyByVariationId = new Map(
    configuration.variacoes.map((variation, index) => [variation.id, variationKeys[index]]),
  );
  return {
    versao: 1,
    variacoes: configuration.variacoes.map((variation, index) => ({
      ...variation,
      id: undefined,
      variacao_produto_id: undefined,
      chave_cliente: variationKeys[index],
    })),
    grupos: configuration.grupos.map((group) => ({
      ...group,
      id: undefined,
      regras_variacao: group.regras_variacao.map((rule) => ({
        minimo_selecoes: rule.minimo_selecoes,
        maximo_selecoes: rule.maximo_selecoes,
        variacao_chave_cliente: clientKeyByVariationId.get(rule.variacao_produto_loja_id),
      })),
      opcoes: group.opcoes.map((item) => ({
        ...item,
        id: undefined,
        precos_variacao: item.precos_variacao.map((price) => ({
          preco_adicional: price.preco_adicional,
          preco_promocional: price.preco_promocional,
          promocao_ate: price.promocao_ate,
          disponivel: price.disponivel,
          variacao_chave_cliente: clientKeyByVariationId.get(price.variacao_produto_loja_id),
        })),
      })),
    })),
  };
}

const stableStringify = (value: unknown) => JSON.stringify(value ?? null);
const variationKey = (variation: ConfigurableVariation) => variation.id ? `id:${variation.id}` : `client:${variation.chave_cliente || ""}`;
const optionKey = (item: ConfigurableOption) => item.id ? `id:${item.id}` : "";
const groupWithoutOptions = (group: ConfigurableGroup) => {
  const { opcoes, ...metadata } = group;
  void opcoes;
  return metadata;
};

function buildConfigurationPatch(
  initialConfiguration: ProductConfiguration,
  currentConfiguration: ProductConfiguration,
): ProductConfigurationPatch | null {
  const variations: ConfigurableVariation[] = [];
  const initialVariationsByKey = new Map(initialConfiguration.variacoes.map((variation) => [variationKey(variation), variation]));
  const currentVariationKeys = new Set(currentConfiguration.variacoes.map(variationKey));

  for (const variation of currentConfiguration.variacoes) {
    const initialVariation = initialVariationsByKey.get(variationKey(variation));
    if (!variation.id || !initialVariation || stableStringify(variation) !== stableStringify(initialVariation)) {
      variations.push(variation);
    }
  }

  for (const variation of initialConfiguration.variacoes) {
    if (variation.id && !currentVariationKeys.has(variationKey(variation))) {
      variations.push({ ...variation, ativa: false });
    }
  }

  const groups: ConfigurableGroup[] = [];
  const initialGroupsById = new Map(
    initialConfiguration.grupos
      .filter((group) => group.id)
      .map((group) => [group.id, group] as const),
  );
  const currentGroupIds = new Set(currentConfiguration.grupos.map((group) => group.id).filter(Boolean));

  for (const group of currentConfiguration.grupos) {
    const initialGroup = group.id ? initialGroupsById.get(group.id) : undefined;
    if (!group.id || !initialGroup) {
      groups.push(group);
      continue;
    }

    const changedOptions: ConfigurableOption[] = [];
    const initialOptionsByKey = new Map(initialGroup.opcoes.map((item) => [optionKey(item), item]));
    const currentOptionKeys = new Set(group.opcoes.map(optionKey).filter(Boolean));

    for (const item of group.opcoes) {
      const key = optionKey(item);
      const initialOption = key ? initialOptionsByKey.get(key) : undefined;
      if (!item.id || !initialOption || stableStringify(item) !== stableStringify(initialOption)) {
        changedOptions.push(item);
      }
    }

    for (const item of initialGroup.opcoes) {
      const key = optionKey(item);
      if (item.id && key && !currentOptionKeys.has(key)) {
        changedOptions.push({ ...item, ativa: false });
      }
    }

    const groupChanged = stableStringify(groupWithoutOptions(group)) !== stableStringify(groupWithoutOptions(initialGroup));
    if (groupChanged || changedOptions.length > 0) {
      groups.push({ ...group, opcoes: changedOptions });
    }
  }

  for (const group of initialConfiguration.grupos) {
    if (group.id && !currentGroupIds.has(group.id)) {
      groups.push({ ...group, ativo: false, opcoes: [] });
    }
  }

  if (variations.length === 0 && groups.length === 0) return null;
  return {
    versao: initialConfiguration.versao,
    variacoes: variations,
    grupos: groups,
  };
}

function buildStoreProductPatch(product: any, current: Record<string, any>) {
  const original = {
    nome: String(product?.nome || "").trim(),
    descricao: String(product?.descricao || "").trim() || null,
    marca: String(product?.marca || "").trim() || null,
    preco: numberValue(product?.preco),
    preco_promocional: nullableNumberValue(product?.preco_promocional),
    promocao_ate: dateTimePayloadValue(dateTimeLocalValue(product?.promocao_ate)),
    categoria_id: product?.categoria_id || product?.categoria_final_id || "",
    ativo: product?.ativo_na_loja !== false,
  };
  const patch: Record<string, any> = {};

  for (const [key, value] of Object.entries(current)) {
    if (stableStringify(value) !== stableStringify(original[key as keyof typeof original])) {
      patch[key] = value;
    }
  }

  if (product?.modo_compra !== "configuravel") patch.modo_compra = "configuravel";
  if (product?.modo_estoque !== "disponibilidade") patch.modo_estoque = "disponibilidade";

  return patch;
}

type Props = {
  product?: any;
  duplicate?: boolean;
  categories: any[];
  canManageImages: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function ConfigurableProductEditor({ product, duplicate = false, categories, canManageImages, onClose, onSuccess }: Props) {
  const [name, setName] = useState(duplicate ? `${product?.nome || "Item"} - cópia` : product?.nome || "");
  const [description, setDescription] = useState(product?.descricao || "");
  const [brand, setBrand] = useState(product?.marca || "");
  const imageUrl = product?.imagem_url || "";
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState(product?.categoria_id || product?.categoria_final_id || "");
  const [basePrice, setBasePrice] = useState(numberValue(product?.preco));
  const [basePromotionalPrice, setBasePromotionalPrice] = useState<number | null>(nullableNumberValue(product?.preco_promocional));
  const [promotionUntil, setPromotionUntil] = useState(dateTimeLocalValue(product?.promocao_ate));
  const [active, setActive] = useState(product?.ativo_na_loja !== false);
  const [itemType, setItemType] = useState<CatalogItemType>("adicionais");
  const [configuration, setConfiguration] = useState<ProductConfiguration>({
    versao: 1,
    variacoes: [],
    grupos: defaultAddonGroups(),
  });
  const [initialConfiguration, setInitialConfiguration] = useState<ProductConfiguration | null>(null);
  const [optionImageFiles, setOptionImageFiles] = useState<Map<string, File>>(new Map());
  const [loading, setLoading] = useState(Boolean(product && !duplicate));
  const [saving, setSaving] = useState(false);
  const editingExisting = Boolean(product?.id && !duplicate);

  useEffect(() => {
    if (!product?.id) {
      setLoading(false);
      return;
    }
    productsService.getProductConfiguration(product.id)
      .then((data) => {
        const loaded: ProductConfiguration = {
          versao: Number(data.versao || 1),
          variacoes: data.variacoes || [],
          grupos: data.grupos || [],
        };
        const normalized = normalizeConfigurationRules(duplicate ? stripConfiguration(loaded) : loaded);
        setConfiguration(normalized);
        setInitialConfiguration(duplicate ? null : normalized);
        setItemType(inferItemType(loaded));
      })
      .catch((error) => showSystemNotice(error?.response?.data?.message || "Não foi possível carregar o cardápio."))
      .finally(() => setLoading(false));
  }, [duplicate, product?.id]);

  const changeItemType = (nextType: CatalogItemType) => {
    setItemType(nextType);
    if (nextType === "pizza") {
      const variations = defaultVariations();
      setConfiguration({
        versao: 1,
        variacoes: variations,
        grupos: defaultGroups(variations),
      });
      setBasePrice((current) => current || 30);
      return;
    }
    setConfiguration({
      versao: 1,
      variacoes: [],
      grupos: defaultAddonGroups(),
    });
  };

  const updateVariation = (index: number, field: keyof ConfigurableVariation, value: any) => {
    setConfiguration((current) => ({
      ...current,
      variacoes: current.variacoes.map((variation, currentIndex) =>
        currentIndex === index ? { ...variation, [field]: value } : variation
      ),
    }));
  };

  const updateGroup = (index: number, patch: Partial<ConfigurableGroup>) => {
    setConfiguration((current) => ({
      ...current,
      grupos: current.grupos.map((group, currentIndex) =>
        currentIndex === index ? normalizeGroupRules({ ...group, ...patch }) : group
      ),
    }));
  };

  const updateOption = (groupIndex: number, optionIndex: number, patch: Partial<ConfigurableOption>) => {
    setConfiguration((current) => ({
      ...current,
      grupos: current.grupos.map((group, currentGroupIndex) => currentGroupIndex === groupIndex
        ? {
            ...group,
            opcoes: group.opcoes.map((item, currentOptionIndex) =>
              currentOptionIndex === optionIndex ? { ...item, ...patch } : item
            ),
          }
        : group),
    }));
  };

  const optionImageKey = (groupIndex: number, optionIndex: number) => `${groupIndex}:${optionIndex}`;

  const selectOptionImage = (groupIndex: number, optionIndex: number, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      showSystemNotice("Envie uma imagem JPEG, PNG, WebP ou GIF de até 8 MB.");
      return;
    }
    setOptionImageFiles((current) => {
      const next = new Map(current);
      next.set(optionImageKey(groupIndex, optionIndex), file);
      return next;
    });
  };

  const updateVariationRule = (groupIndex: number, variation: ConfigurableVariation, maximum: number) => {
    const group = configuration.grupos[groupIndex];
    const reference = variationRef(variation);
    const currentRuleIndex = group.regras_variacao.findIndex((rule) =>
      variation.id
        ? rule.variacao_produto_loja_id === variation.id
        : rule.variacao_chave_cliente === variation.chave_cliente
    );
    const rules = [...group.regras_variacao];
    const nextRule = { ...reference, minimo_selecoes: group.minimo_selecoes, maximo_selecoes: maximum };
    if (currentRuleIndex >= 0) rules[currentRuleIndex] = nextRule;
    else rules.push(nextRule);
    updateGroup(groupIndex, { regras_variacao: rules });
  };

  const updateOptionVariationOverride = (
    groupIndex: number,
    optionIndex: number,
    variation: ConfigurableVariation,
    patch: Partial<ConfigurableOption["precos_variacao"][number]>,
  ) => {
    const current = configuration.grupos[groupIndex].opcoes[optionIndex];
    const reference = variationRef(variation);
    const prices = [...current.precos_variacao];
    const priceIndex = prices.findIndex((item) =>
      variation.id
        ? item.variacao_produto_loja_id === variation.id
        : item.variacao_chave_cliente === variation.chave_cliente
    );
    const nextPrice = { ...reference, disponivel: true, ...patch };
    if (priceIndex >= 0) prices[priceIndex] = { ...prices[priceIndex], ...nextPrice };
    else prices.push(nextPrice);
    updateOption(groupIndex, optionIndex, { precos_variacao: prices });
  };

  const save = async () => {
    if (!name.trim() || !categoryId) {
      showSystemNotice("Informe nome e categoria.");
      return;
    }
    if (basePromotionalPrice !== null && basePromotionalPrice > basePrice) {
      showSystemNotice("O preço promocional do item não pode ser maior que o preço base.");
      return;
    }
    if (itemType === "pizza" && !configuration.variacoes.length) {
      showSystemNotice("Cadastre ao menos um tamanho.");
      return;
    }
    for (const variation of configuration.variacoes) {
      if (variation.preco_promocional !== null && variation.preco_promocional !== undefined && variation.preco_promocional > variation.preco) {
        showSystemNotice(`O preço promocional do tamanho "${variation.nome}" não pode ser maior que o preço normal.`);
        return;
      }
    }
    for (const group of configuration.grupos) {
      for (const item of group.opcoes) {
        if (item.preco_promocional !== null && item.preco_promocional !== undefined && item.preco_promocional > item.preco_adicional) {
          showSystemNotice(`O preço promocional de "${item.nome}" não pode ser maior que o preço padrão.`);
          return;
        }
        for (const override of item.precos_variacao) {
          const price = override.preco_adicional ?? item.preco_adicional;
          if (override.preco_promocional !== null && override.preco_promocional !== undefined && price !== null && override.preco_promocional > price) {
            showSystemNotice(`O preço promocional de "${item.nome}" por tamanho não pode ser maior que o preço normal.`);
            return;
          }
        }
      }
    }
    try {
      setSaving(true);
      let productStoreId = product?.id;
      let productId = product?.produto_id;
      let version = configuration.versao;
      if (!editingExisting) {
        const created = await productsService.createLocalProduct({
          categoria_id: categoryId,
          categoria_loja_id: categoryId,
          nome: name.trim(),
          descricao: description.trim() || null,
          marca: brand.trim() || null,
          unidade_medida: "un",
          preco: basePrice,
          preco_promocional: basePromotionalPrice,
          promocao_ate: dateTimePayloadValue(promotionUntil),
          ativo: active,
          destaque: false,
          modo_compra: "configuravel",
          modo_estoque: "disponibilidade",
        });
        productStoreId = created.id;
        productId = created.produto?.id;
        version = Number(created.configuracao_versao || 1);
      } else {
        const productPatch = buildStoreProductPatch(product, {
          nome: name.trim(),
          descricao: description.trim() || null,
          marca: brand.trim() || null,
          preco: basePrice,
          preco_promocional: basePromotionalPrice,
          promocao_ate: dateTimePayloadValue(promotionUntil),
          categoria_id: categoryId,
          ativo: active,
        });
        if (Object.keys(productPatch).length > 0) {
          await productsService.updateStoreProduct(productStoreId, productPatch);
        }
      }
      const normalizedConfiguration = normalizeConfigurationRules(configuration);
      const groupsWithUploadedImages = await Promise.all(normalizedConfiguration.grupos.map(async (group, groupIndex) => ({
        ...group,
        opcoes: await Promise.all(group.opcoes.map(async (item, optionIndex) => {
          const file = optionImageFiles.get(optionImageKey(groupIndex, optionIndex));
          if (!file) return item;
          const uploaded = await productsService.uploadConfigurationOptionImage(productStoreId, file);
          return { ...item, imagem_url: uploaded.url };
        })),
      })));
      const configurationToSave = {
        ...normalizedConfiguration,
        versao: version,
        grupos: groupsWithUploadedImages,
      };
      if (editingExisting) {
        if (!initialConfiguration) {
          showSystemNotice("NÃ£o foi possÃ­vel identificar as alteraÃ§Ãµes do cardÃ¡pio. Reabra o editor antes de salvar.");
          return;
        }
        const configurationPatch = buildConfigurationPatch(initialConfiguration, configurationToSave);
        if (configurationPatch) {
          await productsService.patchProductConfiguration(productStoreId, configurationPatch);
        }
      } else {
        await productsService.updateProductConfiguration(productStoreId, configurationToSave);
      }
      if (imageFile && productId) {
        await productsService.uploadProductImage(productId, imageFile, true);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      const payload = error?.response?.data;
      const code = payload?.error?.code || payload?.error?.message || payload?.message;
      const message = code === "CONFIGURATION_VERSION_CONFLICT"
        ? "Este cardápio foi alterado em outra sessão. Reabra o editor antes de salvar."
        : payload?.error?.message || payload?.message || "Erro ao salvar item do cardápio.";
      showSystemNotice(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 text-white">Carregando cardápio...</div>;
  }

  return (
    <div className="fixed inset-0 z-[70] bg-white">
      <div className="flex h-full w-full flex-col bg-white">
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{editingExisting ? "Editar item configurável" : "Criar item do cardápio"}</h2>
            <p className="text-xs text-gray-500">Informações, tamanhos, limites, sabores, adicionais e disponibilidade.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto bg-gray-50 p-5">
          <section className="mx-auto w-full max-w-[1500px] rounded-xl border bg-white p-4">
            <h3 className="mb-4 font-bold">1. Informações</h3>
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => changeItemType("adicionais")}
                className={`rounded-xl border p-4 text-left transition hover:border-blue-300 ${itemType === "adicionais" ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"}`}
              >
                <span className="block text-sm font-black text-gray-900">Produto com adicionais</span>
                <span className="mt-1 block text-xs text-gray-500">
                  Hambúrguer, cachorro-quente, açaí ou qualquer item com opcionais e perguntas obrigatórias. Também pode ficar sem grupos para exibir apenas o campo de observação ao cliente.
                </span>
              </button>
              <button
                type="button"
                onClick={() => changeItemType("pizza")}
                className={`rounded-xl border p-4 text-left transition hover:border-blue-300 ${itemType === "pizza" ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"}`}
              >
                <span className="block text-sm font-black text-gray-900">Produto montável / pizza</span>
                <span className="mt-1 block text-xs text-gray-500">
                  Usa tamanhos, sabores fracionados e limites por tamanho, como P até 1 e G até 3 sabores.
                </span>
              </button>
            </div>
            {editingExisting && (
              <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Trocar o tipo reinicia tamanhos, grupos e opções deste item. Pedidos antigos continuam preservados pelo snapshot.
              </p>
            )}
            <div className="grid gap-3 lg:grid-cols-4 md:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-gray-600">
                Nome do item
                <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border p-2.5 text-sm font-normal text-gray-900" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-gray-600">
                Categoria
                <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="w-full rounded-lg border p-2.5 text-sm font-normal text-gray-900">
                  <option value="">Selecione a categoria</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.nome}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold text-gray-600">
                Marca ou cozinha
                <input value={brand} onChange={(event) => setBrand(event.target.value)} className="w-full rounded-lg border p-2.5 text-sm font-normal text-gray-900" />
              </label>
              <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold text-gray-600">
                <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
                Item ativo
              </label>
              <label className="space-y-1 text-xs font-semibold text-gray-600">
                Preço base
                <input type="number" min="0" step="0.01" value={basePrice} onChange={(event) => setBasePrice(numberValue(event.target.value))} className="w-full rounded-lg border p-2.5 text-sm font-normal text-gray-900" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-gray-600">
                Preço promocional
                <input type="number" min="0" step="0.01" value={basePromotionalPrice ?? ""} onChange={(event) => setBasePromotionalPrice(nullableNumberValue(event.target.value))} placeholder="Sem promoção" className="w-full rounded-lg border p-2.5 text-sm font-normal text-gray-900" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-gray-600">
                Promoção até
                <input type="datetime-local" value={promotionUntil} onChange={(event) => setPromotionUntil(event.target.value)} className="w-full rounded-lg border p-2.5 text-sm font-normal text-gray-900" />
              </label>
              {canManageImages && (
                <label className="space-y-1 text-xs font-semibold text-gray-600">
                  Imagem do item
                  <span className="flex items-center gap-2 rounded-lg border border-dashed bg-gray-50 p-2 text-xs font-normal text-gray-600">
                    <ImagePlus className="h-4 w-4 text-gray-500" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        if (file && file.size > 8 * 1024 * 1024) {
                          showSystemNotice("A imagem deve ter no máximo 8 MB.");
                          event.target.value = "";
                          return;
                        }
                        setImageFile(file);
                      }}
                      className="max-w-full text-xs"
                    />
                  </span>
                  <span className="block text-[11px] font-normal text-gray-500">JPEG, PNG, WebP ou GIF. O arquivo é otimizado automaticamente antes de salvar.</span>
                  {(imageFile || imageUrl) && <span className="block truncate text-[11px] font-normal text-gray-500">{imageFile?.name || "Imagem atual definida"}</span>}
                </label>
              )}
              <label className="space-y-1 text-xs font-semibold text-gray-600 md:col-span-2 lg:col-span-4">
                Descrição do item
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-20 w-full rounded-lg border p-2.5 text-sm font-normal text-gray-900" />
              </label>
            </div>
          </section>

          {itemType === "pizza" && (
          <section className="mx-auto w-full max-w-[1500px] rounded-xl border bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">2. Tamanhos e preços</h3>
              <button
                onClick={() => setConfiguration((current) => ({
                  ...current,
                  variacoes: [...current.variacoes, {
                    chave_cliente: newKey(),
                    nome: "Novo tamanho",
                    preco: basePrice,
                    preco_promocional: null,
                    promocao_ate: null,
                    ativa: true,
                    ordem_exibicao: current.variacoes.length,
                  }],
                }))}
                className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5" /> Tamanho
              </button>
            </div>
            <div className="space-y-3">
              {configuration.variacoes.map((variation, index) => (
                <div key={variation.id || variation.chave_cliente} className="grid gap-2 rounded-lg border bg-gray-50 p-3 lg:grid-cols-[1fr_140px_160px_210px_95px_38px] md:grid-cols-2">
                  <label className="space-y-1 text-xs font-semibold text-gray-600">
                    Nome do tamanho
                    <input value={variation.nome} onChange={(event) => updateVariation(index, "nome", event.target.value)} className="w-full rounded-lg border bg-white p-2 text-sm font-normal text-gray-900" />
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-gray-600">
                    Preço
                    <input type="number" min="0" step="0.01" value={variation.preco} onChange={(event) => updateVariation(index, "preco", numberValue(event.target.value))} className="w-full rounded-lg border bg-white p-2 text-sm font-normal text-gray-900" />
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-gray-600">
                    Preço promocional
                    <input type="number" min="0" step="0.01" value={variation.preco_promocional ?? ""} onChange={(event) => updateVariation(index, "preco_promocional", nullableNumberValue(event.target.value))} placeholder="Sem promoção" className="w-full rounded-lg border bg-white p-2 text-sm font-normal text-gray-900" />
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-gray-600">
                    Promoção até
                    <input type="datetime-local" value={dateTimeLocalValue(variation.promocao_ate)} onChange={(event) => updateVariation(index, "promocao_ate", dateTimePayloadValue(event.target.value))} className="w-full rounded-lg border bg-white p-2 text-sm font-normal text-gray-900" />
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-gray-600">
                    <input type="checkbox" checked={variation.ativa} onChange={(event) => updateVariation(index, "ativa", event.target.checked)} />
                    Ativo
                  </label>
                  <button onClick={() => setConfiguration((current) => ({ ...current, variacoes: current.variacoes.filter((_, currentIndex) => currentIndex !== index) }))} className="flex items-center justify-center text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </section>
          )}

          {configuration.grupos.map((group, groupIndex) => (
            <section key={group.id || `${group.nome}-${groupIndex}`} className="mx-auto w-full max-w-[1500px] rounded-xl border bg-white p-4">
              <div className="mb-4 grid gap-2 lg:grid-cols-[1fr_190px_100px_100px_120px_110px_38px] md:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-gray-600">
                  Grupo
                  <input value={group.nome} onChange={(event) => updateGroup(groupIndex, { nome: event.target.value })} className="w-full rounded-lg border p-2 text-sm font-bold text-gray-900" />
                </label>
                <label className="space-y-1 text-xs font-semibold text-gray-600">
                  Tipo
                  <InfoHint text="Define como o cliente escolhe as opções: uma única, várias, ou sabores fracionados por tamanho." />
                  <select value={group.tipo_selecao} onChange={(event) => updateGroup(groupIndex, {
                    tipo_selecao: event.target.value as ConfigurableGroup["tipo_selecao"],
                    substitui_preco_base: event.target.value === "fracionada",
                    permite_quantidade: event.target.value === "fracionada" ? false : group.permite_quantidade,
                  })} className="w-full rounded-lg border p-2 text-sm font-normal text-gray-900">
                    <option value="unica">Escolha única</option>
                    <option value="multipla">Múltipla</option>
                    {itemType === "pizza" && <option value="fracionada">Fracionada</option>}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold text-gray-600">
                  Mínimo
                  <InfoHint text="Menor quantidade de opções que o cliente precisa selecionar nesse grupo." />
                  <input type="number" min="0" value={group.minimo_selecoes} onChange={(event) => updateGroup(groupIndex, { minimo_selecoes: numberValue(event.target.value) })} className="w-full rounded-lg border p-2 text-sm font-normal text-gray-900" />
                </label>
                <label className="space-y-1 text-xs font-semibold text-gray-600">
                  Máximo
                  <InfoHint text="Maior quantidade de opções permitida. Em grupo fracionado representa o limite geral de sabores." />
                  <input type="number" min="1" value={group.maximo_selecoes} onChange={(event) => updateGroup(groupIndex, { maximo_selecoes: numberValue(event.target.value) })} className="w-full rounded-lg border p-2 text-sm font-normal text-gray-900" />
                </label>
                <label className="space-y-1 text-xs font-semibold text-gray-600">
                  Ordem
                  <input type="number" min="0" value={group.ordem_exibicao} onChange={(event) => updateGroup(groupIndex, { ordem_exibicao: numberValue(event.target.value) })} className="w-full rounded-lg border p-2 text-sm font-normal text-gray-900" />
                </label>
                <label className="flex items-center gap-2 rounded-lg border px-2 text-xs text-gray-600">
                  <input type="checkbox" checked={group.ativo} onChange={(event) => updateGroup(groupIndex, { ativo: event.target.checked })} />
                  Grupo ativo
                </label>
                <button onClick={() => setConfiguration((current) => ({ ...current, grupos: current.grupos.filter((_, currentIndex) => currentIndex !== groupIndex) }))} className="flex items-center justify-center text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>

              <div className="mb-4 grid gap-3 md:grid-cols-[1fr_240px]">
                <label className="space-y-1 text-xs font-semibold text-gray-600">
                  Descrição do grupo
                  <input value={group.descricao || ""} onChange={(event) => updateGroup(groupIndex, { descricao: event.target.value })} placeholder="Texto opcional para aparecer antes das opções" className="w-full rounded-lg border p-2 text-sm font-normal text-gray-900" />
                </label>
                <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-gray-600 ${group.tipo_selecao === "fracionada" ? "cursor-not-allowed bg-gray-100 opacity-70" : ""}`}>
                  <input
                    type="checkbox"
                    checked={group.tipo_selecao === "fracionada" ? false : group.permite_quantidade}
                    disabled={group.tipo_selecao === "fracionada"}
                    onChange={(event) => updateGroup(groupIndex, { permite_quantidade: event.target.checked })}
                  />
                  Permitir quantidade por opção
                  <InfoHint text="Permite o cliente escolher mais de uma unidade da mesma opção. Em fracionada fica desligado porque cada sabor conta como porção." />
                </label>
              </div>

              {group.tipo_selecao === "fracionada" && (
                <div className="mb-4 rounded-lg bg-blue-50 p-3">
                  <p className="mb-2 text-xs font-bold text-blue-900">Limite de sabores por tamanho</p>
                  <div className="flex flex-wrap gap-2">
                    {configuration.variacoes.map((variation) => {
                      const rule = group.regras_variacao.find((item) =>
                        variation.id ? item.variacao_produto_loja_id === variation.id : item.variacao_chave_cliente === variation.chave_cliente
                      );
                      return (
                        <label key={variation.id || variation.chave_cliente} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs">
                          {variation.nome}
                          <input type="number" min="1" value={rule?.maximo_selecoes || group.maximo_selecoes} onChange={(event) => updateVariationRule(groupIndex, variation, numberValue(event.target.value))} className="w-14 rounded border p-1" />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="space-y-2">
                    {group.opcoes.map((item, optionIndex) => (
                      <div key={item.id || optionIndex} className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full min-w-[1540px] text-xs">
                          <thead>
                            <tr className="text-left text-gray-500">
                              <th className="p-2">Opção</th>
                              <th className="p-2">Descrição</th>
                              <th className="p-2">Uso <InfoHint text="Define se a opção aparece só como adicional, como card de produto, ou nas duas formas." /></th>
                              <th className="p-2">Categoria do card <InfoHint text="Categoria onde o card de produto dessa opção será listado. Se vazio, usa a categoria do item principal." /></th>
                              <th className="p-2">Imagem do card <InfoHint text="Imagem usada no card individual gerado por essa opção-produto." /></th>
                              {group.tipo_selecao !== "fracionada" && (
                                <th className="p-2">Qtd. máx. <InfoHint text="Máximo de unidades dessa mesma opção quando o grupo permite quantidade." /></th>
                              )}
                              <th className="p-2">Preço padrão</th>
                              <th className="p-2">Promo padrão</th>
                              <th className="p-2">Promo até</th>
                              {configuration.variacoes.map((variation) => <th key={variation.id || variation.chave_cliente} className="p-2">{variation.nome}</th>)}
                              <th className="p-2">Status</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                      <tr className="align-top">
                        <td className="p-2"><input value={item.nome} onChange={(event) => updateOption(groupIndex, optionIndex, { nome: event.target.value })} className="w-44 rounded border p-2" /></td>
                        <td className="p-2"><textarea value={item.descricao || ""} onChange={(event) => updateOption(groupIndex, optionIndex, { descricao: event.target.value })} placeholder="Descrição do sabor/opção" className="h-20 w-56 rounded border p-2" /></td>
                        <td className="p-2">
                          <select
                            value={item.tipo_item || "adicional"}
                            onChange={(event) => updateOption(groupIndex, optionIndex, { tipo_item: event.target.value as OptionItemType })}
                            className="w-40 rounded border p-2"
                          >
                            <option value="adicional">Só adicional</option>
                            <option value="produto">Só produto</option>
                            <option value="produto_e_adicional">Produto e adicional</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={item.produto_categoria_id || ""}
                            onChange={(event) => updateOption(groupIndex, optionIndex, { produto_categoria_id: event.target.value || null })}
                            className="w-44 rounded border p-2"
                            disabled={(item.tipo_item || "adicional") === "adicional"}
                          >
                            <option value="">Usar categoria do item</option>
                            {categories.map((category) => <option key={category.id} value={category.id}>{category.nome}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          {(item.tipo_item || "adicional") === "adicional" ? (
                            <span className="text-[11px] text-gray-400">Disponível para opção-produto</span>
                          ) : (
                            <ConfigurationOptionImageUpload
                              file={optionImageFiles.get(optionImageKey(groupIndex, optionIndex))}
                              imageUrl={item.imagem_url}
                              disabled={!canManageImages}
                              onSelect={(file) => selectOptionImage(groupIndex, optionIndex, file)}
                            />
                          )}
                        </td>
                        {group.tipo_selecao !== "fracionada" && (
                          <td className="p-2"><input type="number" min="1" step="1" value={item.quantidade_maxima} onChange={(event) => updateOption(groupIndex, optionIndex, { quantidade_maxima: numberValue(event.target.value) })} className="w-20 rounded border p-2" /></td>
                        )}
                        <td className="p-2"><input type="number" min="0" step="0.01" value={item.preco_adicional} onChange={(event) => updateOption(groupIndex, optionIndex, { preco_adicional: numberValue(event.target.value) })} className="w-24 rounded border p-2" /></td>
                        <td className="p-2"><input type="number" min="0" step="0.01" value={item.preco_promocional ?? ""} onChange={(event) => updateOption(groupIndex, optionIndex, { preco_promocional: nullableNumberValue(event.target.value) })} placeholder="Sem promo" className="w-28 rounded border p-2" /></td>
                        <td className="p-2"><input type="datetime-local" value={dateTimeLocalValue(item.promocao_ate)} onChange={(event) => updateOption(groupIndex, optionIndex, { promocao_ate: dateTimePayloadValue(event.target.value) })} className="w-44 rounded border p-2" /></td>
                        {configuration.variacoes.map((variation) => {
                          const variationPrice = item.precos_variacao.find((price) =>
                            variation.id ? price.variacao_produto_loja_id === variation.id : price.variacao_chave_cliente === variation.chave_cliente
                          );
                          return (
                            <td key={variation.id || variation.chave_cliente} className="p-2">
                              <div className="w-44 space-y-1 rounded-lg border bg-gray-50 p-2">
                                <label className="block text-[10px] font-semibold uppercase text-gray-500">
                                  Preço
                                  <input type="number" min="0" step="0.01" value={variationPrice?.preco_adicional ?? item.preco_adicional} onChange={(event) => updateOptionVariationOverride(groupIndex, optionIndex, variation, { preco_adicional: numberValue(event.target.value) })} className="mt-1 w-full rounded border bg-white p-1.5 text-xs font-normal text-gray-900" />
                                </label>
                                <label className="block text-[10px] font-semibold uppercase text-gray-500">
                                  Promo
                                  <input type="number" min="0" step="0.01" value={variationPrice?.preco_promocional ?? ""} onChange={(event) => updateOptionVariationOverride(groupIndex, optionIndex, variation, { preco_promocional: nullableNumberValue(event.target.value) })} placeholder="Sem promo" className="mt-1 w-full rounded border bg-white p-1.5 text-xs font-normal text-gray-900" />
                                </label>
                                <label className="block text-[10px] font-semibold uppercase text-gray-500">
                                  Até
                                  <input type="datetime-local" value={dateTimeLocalValue(variationPrice?.promocao_ate)} onChange={(event) => updateOptionVariationOverride(groupIndex, optionIndex, variation, { promocao_ate: dateTimePayloadValue(event.target.value) })} className="mt-1 w-full rounded border bg-white p-1.5 text-xs font-normal text-gray-900" />
                                </label>
                                <label className="flex items-center gap-1 text-[11px] text-gray-600">
                                  <input type="checkbox" checked={variationPrice?.disponivel ?? true} onChange={(event) => updateOptionVariationOverride(groupIndex, optionIndex, variation, { disponivel: event.target.checked })} />
                                  Disponível
                                </label>
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-2">
                          <label className="flex items-center gap-1 text-gray-600">
                            <input type="checkbox" checked={item.ativa} onChange={(event) => updateOption(groupIndex, optionIndex, { ativa: event.target.checked })} />
                            Ativa
                          </label>
                        </td>
                        <td className="p-2"><button onClick={() => updateGroup(groupIndex, { opcoes: group.opcoes.filter((_, currentIndex) => currentIndex !== optionIndex) })} className="text-red-500"><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                          </tbody>
                        </table>
                      </div>
                    ))}
                </div>
              </div>
              <button
                onClick={() => updateGroup(groupIndex, {
                  opcoes: [
                    ...group.opcoes,
                    {
                      ...option(
                        undefined,
                        group.tipo_selecao === "fracionada" ? "produto_e_adicional" : "adicional",
                      ),
                      ordem_exibicao: group.opcoes.length,
                    },
                  ],
                })}
                className="mt-3 flex items-center gap-1 text-xs font-bold"
                style={{ color: PRIMARY }}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar opção
              </button>
            </section>
          ))}

          {itemType === "adicionais" && configuration.grupos.length === 0 && (
            <p className="mx-auto w-full max-w-[1500px] rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Este produto será adicionado pelo cliente com quantidade e campo de observação, sem adicionais.
            </p>
          )}

          <button
            onClick={() => setConfiguration((current) => ({
              ...current,
              grupos: [...current.grupos, {
                nome: "Novo grupo",
                tipo_selecao: "multipla",
                minimo_selecoes: 0,
                maximo_selecoes: 5,
                permite_quantidade: false,
                substitui_preco_base: false,
                ativo: true,
                ordem_exibicao: current.grupos.length,
                regras_variacao: [],
                opcoes: [option()],
              }],
            }))}
            className="mx-auto flex w-full max-w-[1500px] items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-600"
          >
            <Plus className="h-4 w-4" /> Adicionar grupo de opções
          </button>
        </div>

        <footer className="flex justify-end gap-3 border-t px-5 py-4">
          <button onClick={onClose} className="rounded-lg border px-5 py-2.5 text-sm">Cancelar</button>
          <button disabled={saving} onClick={save} className="rounded-lg px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: PRIMARY }}>{saving ? "Salvando..." : "Salvar cardápio"}</button>
        </footer>
      </div>
    </div>
  );
}
