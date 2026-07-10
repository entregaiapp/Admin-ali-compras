export type Product = Record<string, any>;

export type ProductFilters = {
  search: string;
  category: string;
  status: string;
};

export type ProductStorePayload = {
  preco: number | null;
  preco_promocional: number | null;
  estoque: number;
  produto_id: string;
  categoria_id: string | null;
  ativo_na_loja: boolean;
  destaque: boolean;
  consumo_imediato: boolean;
  codigo_interno: string;
  tipo_venda: "unidade" | "peso";
  quantidade_minima_compra: number;
  incremento_quantidade: number;
  modo_compra?: "simples" | "configuravel";
  modo_estoque?: "quantidade" | "disponibilidade";
};

export type ConfigurableVariation = {
  id?: string;
  chave_cliente?: string;
  variacao_produto_id?: string;
  nome: string;
  sku?: string | null;
  preco: number;
  preco_promocional?: number | null;
  promocao_ate?: string | null;
  ativa: boolean;
  ordem_exibicao: number;
};

export type ConfigurableOption = {
  id?: string;
  nome: string;
  descricao?: string | null;
  tipo_item?: "adicional" | "produto" | "produto_e_adicional";
  imagem_url?: string | null;
  produto_categoria_id?: string | null;
  preco_adicional: number;
  preco_promocional?: number | null;
  promocao_ate?: string | null;
  quantidade_maxima: number;
  ativa: boolean;
  ordem_exibicao: number;
  precos_variacao: Array<{
    variacao_produto_loja_id?: string;
    variacao_chave_cliente?: string;
    preco_adicional?: number | null;
    preco_promocional?: number | null;
    promocao_ate?: string | null;
    disponivel: boolean;
  }>;
};

export type ConfigurableGroup = {
  id?: string;
  nome: string;
  descricao?: string | null;
  tipo_selecao: "unica" | "multipla" | "fracionada";
  minimo_selecoes: number;
  maximo_selecoes: number;
  permite_quantidade: boolean;
  substitui_preco_base: boolean;
  ativo: boolean;
  ordem_exibicao: number;
  regras_variacao: Array<{
    variacao_produto_loja_id?: string;
    variacao_chave_cliente?: string;
    minimo_selecoes: number;
    maximo_selecoes: number;
  }>;
  opcoes: ConfigurableOption[];
};

export type ProductConfiguration = {
  versao: number;
  variacoes: ConfigurableVariation[];
  grupos: ConfigurableGroup[];
};

export type ProductConfigurationPatch = {
  versao: number;
  variacoes?: ConfigurableVariation[];
  grupos?: ConfigurableGroup[];
};
