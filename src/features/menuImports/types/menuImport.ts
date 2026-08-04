export type ExtractedField<T> = {
  valor: T;
  confianca: number;
  inferido: boolean;
  origem?: {
    arquivo_id?: string | null;
    arquivo_ordem?: number | null;
    pagina?: number | null;
    trecho?: string | null;
  } | null;
  avisos: string[];
};

export type MenuImportAvailability = {
  feature_key: string;
  enabled: boolean;
  config: {
    monthly_limit: number;
    max_files: number;
    max_image_mb: number;
    max_pdf_mb: number;
  };
  uso_mensal: number;
  restante_mensal: number;
};

export type MenuImportProduct = Record<string, any> & {
  chave: string;
  acao: 'criar' | 'atualizar' | 'ignorar' | 'manter_variacao';
  produto_existente_id: string | null;
  nome: ExtractedField<string>;
  descricao: ExtractedField<string | null>;
  preco: ExtractedField<number | null>;
  categoria_resolvida_id: string | null;
  nova_categoria?: { nome: string; categoria_pai_id?: string | null } | null;
  tamanhos: Array<Record<string, any>>;
  sabores: Array<Record<string, any>>;
  grupos_adicionais: Array<Record<string, any>>;
  duplicatas: Array<Record<string, any>>;
};

export type MenuImportReview = {
  versao: 1;
  produtos: MenuImportProduct[];
  avisos: string[];
};

export type MenuImport = Record<string, any> & {
  id: string;
  status: 'pendente' | 'processando' | 'aguardando_revisao' | 'confirmando' | 'concluida' | 'falhou' | 'cancelada';
  criado_em: string;
  atualizado_em: string;
  quantidade_arquivos?: number;
  resultado_normalizado_json?: MenuImportReview | null;
  resultado_revisado_json?: MenuImportReview | null;
  categorias_disponiveis?: Array<{ id: string; nome: string; caminho: string; categoria_pai_id?: string | null }>;
  erros_json?: Array<{ mensagem?: string; tipo?: string }>;
  avisos_json?: string[];
};
