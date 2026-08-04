import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, Clock3, FileImage,
  FileText, Loader2, Plus, RefreshCw, Save, Sparkles, Trash2, Upload, XCircle,
} from 'lucide-react';
import { menuImportsService } from '../services/menuImportsService';
import type {
  ExtractedField, MenuImport, MenuImportAvailability, MenuImportProduct, MenuImportReview,
} from '../types/menuImport';

const PRIMARY = '#122a4c';
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  processando: 'Processando',
  aguardando_revisao: 'Aguardando revisão',
  confirmando: 'Publicando',
  concluida: 'Concluída',
  falhou: 'Falhou',
  cancelada: 'Cancelada',
};

const field = <T,>(valor: T): ExtractedField<T> => ({
  valor,
  confianca: 1,
  inferido: false,
  origem: null,
  avisos: [],
});

const errorMessage = (error: any) => (
  error?.response?.data?.error?.message
  || error?.response?.data?.message
  || error?.message
  || 'Não foi possível concluir a operação.'
);

function Confidence({ data }: { data?: ExtractedField<any> | null }) {
  if (!data) return null;
  const percent = Math.round((Number(data.confianca) || 0) * 100);
  const color = percent >= 80 ? 'text-emerald-700 bg-emerald-50' : percent >= 60 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
      <span className={`rounded-full px-2 py-0.5 font-semibold ${color}`}>{percent}% de confiança</span>
      {data.inferido && <span className="rounded-full bg-violet-50 px-2 py-0.5 font-medium text-violet-700">Inferido</span>}
      {data.origem?.pagina && <span className="text-gray-500">Página {data.origem.pagina}</span>}
      {data.origem?.trecho && <span className="max-w-full truncate text-gray-500">“{data.origem.trecho}”</span>}
    </div>
  );
}

function TextInput({
  label, data, onChange, multiline = false, type = 'text', required = false,
}: {
  label: string;
  data: ExtractedField<any>;
  onChange: (value: any) => void;
  multiline?: boolean;
  type?: string;
  required?: boolean;
}) {
  const common = {
    value: data?.valor ?? '',
    onChange: (event: any) => onChange(type === 'number' ? (event.target.value === '' ? null : Number(event.target.value)) : event.target.value),
    className: 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100',
  };
  return (
    <label className="block min-w-0 text-xs font-medium text-gray-600">
      {label}{required ? ' *' : ''}
      {multiline ? <textarea {...common} rows={2} className={`${common.className} mt-1 resize-y`} /> : <input {...common} type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? '0.01' : undefined} className={`${common.className} mt-1`} />}
      <Confidence data={data} />
    </label>
  );
}

function ProductReviewCard({
  product, index, categories, onChange,
}: {
  product: MenuImportProduct;
  index: number;
  categories: MenuImport['categorias_disponiveis'];
  onChange: (mutator: (draft: MenuImportProduct) => void) => void;
}) {
  const categoryValue = product.nova_categoria ? '__new__' : product.categoria_resolvida_id || '';
  const setProductField = (key: string, value: any) => onChange((draft) => {
    draft[key] = { ...(draft[key] || field(null)), valor: value };
  });
  const configurable = product.tamanhos.length > 0 || product.sabores.length > 0 || product.grupos_adicionais.length > 0;

  return (
    <details open className={`rounded-xl border bg-white shadow-sm ${product.requer_revisao ? 'border-amber-300' : 'border-gray-200'}`}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <span className="text-sm font-bold">{index + 1}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-gray-900">{product.nome?.valor || 'Produto sem nome'}</div>
          <div className="text-xs text-gray-500">{configurable ? 'Item configurável' : 'Produto simples'}</div>
        </div>
        {product.requer_revisao && <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Revisar</span>}
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </summary>

      <div className="space-y-5 border-t border-gray-100 p-4">
        {product.avisos?.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {product.avisos.map((warning: string, warningIndex: number) => <div key={warningIndex}>• {warning}</div>)}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-medium text-gray-600">
            Ação
            <select
              value={product.acao}
              onChange={(event) => onChange((draft) => { draft.acao = event.target.value as MenuImportProduct['acao']; })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="criar">Criar novo</option>
              <option value="atualizar">Atualizar existente</option>
              <option value="manter_variacao">Manter como variação</option>
              <option value="ignorar">Ignorar</option>
            </select>
          </label>
          {['atualizar', 'manter_variacao'].includes(product.acao) && (
            <label className="text-xs font-medium text-gray-600 md:col-span-2">
              Produto existente
              <select
                value={product.produto_existente_id || ''}
                onChange={(event) => onChange((draft) => { draft.produto_existente_id = event.target.value || null; })}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Selecione uma correspondência</option>
                {(product.duplicatas || []).map((candidate: any) => (
                  <option key={candidate.produto_loja_id} value={candidate.produto_loja_id}>
                    {candidate.nome} — {Math.round(candidate.confianca * 100)}% ({candidate.motivo.replaceAll('_', ' ')})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {product.acao !== 'ignorar' && (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <TextInput label="Nome" data={product.nome} required onChange={(value) => setProductField('nome', value)} />
              <TextInput label="Preço (R$)" data={product.preco} type="number" required onChange={(value) => setProductField('preco', value)} />
              <div className="md:col-span-2"><TextInput label="Descrição" data={product.descricao} multiline onChange={(value) => setProductField('descricao', value)} /></div>
              <TextInput label="Marca" data={product.marca} onChange={(value) => setProductField('marca', value)} />
              <TextInput label="Código de barras" data={product.codigo_barras} onChange={(value) => setProductField('codigo_barras', value)} />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-xs font-medium text-gray-600">
                Unidade de venda
                <select
                  value={product.unidade_venda?.valor || 'UN'}
                  onChange={(event) => setProductField('unidade_venda', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="UN">Unidade</option>
                  <option value="KG">Quilograma</option>
                </select>
                <Confidence data={product.unidade_venda} />
              </label>
              <TextInput label="Quantidade da embalagem" data={product.quantidade_embalagem} type="number" onChange={(value) => setProductField('quantidade_embalagem', value)} />
              <TextInput label="Unidade da embalagem" data={product.unidade_embalagem} onChange={(value) => setProductField('unidade_embalagem', value)} />
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <label className="text-xs font-medium text-gray-600">Categoria *</label>
              <select
                value={categoryValue}
                onChange={(event) => onChange((draft) => {
                  if (event.target.value === '__new__') {
                    draft.categoria_resolvida_id = null;
                    draft.nova_categoria = { nome: draft.categoria?.nome || '', categoria_pai_id: null };
                  } else {
                    draft.categoria_resolvida_id = event.target.value || null;
                    draft.nova_categoria = null;
                  }
                })}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Selecione uma categoria</option>
                {(categories || []).map((category) => <option key={category.id} value={category.id}>{category.caminho || category.nome}</option>)}
                <option value="__new__">Criar uma nova categoria</option>
              </select>
              {product.nova_categoria && (
                <input
                  value={product.nova_categoria.nome}
                  onChange={(event) => onChange((draft) => { if (draft.nova_categoria) draft.nova_categoria.nome = event.target.value; })}
                  placeholder="Nome da nova categoria"
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                />
              )}
              <div className="mt-1 text-[11px] text-gray-500">
                Sugestão da IA: {product.categoria?.caminho || product.categoria?.caminho_sugerido || product.categoria?.nome} ({Math.round((product.categoria?.confianca || 0) * 100)}%)
              </div>
              {product.candidatos_categoria?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.candidatos_categoria.map((candidate: any) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => onChange((draft) => {
                        draft.categoria_resolvida_id = candidate.id;
                        draft.nova_categoria = null;
                      })}
                      className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                    >
                      {candidate.caminho || candidate.nome} · {Math.round((candidate.similaridade || 0) * 100)}%
                    </button>
                  ))}
                </div>
              )}
            </div>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Tamanhos</h3>
                <button type="button" onClick={() => onChange((draft) => draft.tamanhos.push({ nome: field(''), preco: field(Number(product.preco?.valor || 0)) }))} className="flex items-center gap-1 text-xs font-semibold text-blue-700"><Plus className="h-3.5 w-3.5" />Adicionar</button>
              </div>
              {product.tamanhos.map((size: any, sizeIndex: number) => (
                <div key={sizeIndex} className="grid gap-2 rounded-lg border border-gray-100 p-2 md:grid-cols-[1fr_160px_36px]">
                  <input value={size.nome?.valor || ''} onChange={(event) => onChange((draft) => { draft.tamanhos[sizeIndex].nome.valor = event.target.value; })} placeholder="Nome do tamanho" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  <input type="number" min="0" step="0.01" value={size.preco?.valor ?? ''} onChange={(event) => onChange((draft) => { draft.tamanhos[sizeIndex].preco.valor = event.target.value === '' ? null : Number(event.target.value); })} placeholder="Preço" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  <button type="button" onClick={() => onChange((draft) => draft.tamanhos.splice(sizeIndex, 1))} className="flex items-center justify-center text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Sabores</h3>
                <button type="button" onClick={() => onChange((draft) => draft.sabores.push({ nome: field(''), descricao: field(null), preco_adicional: field(0), disponivel: field(true) }))} className="flex items-center gap-1 text-xs font-semibold text-blue-700"><Plus className="h-3.5 w-3.5" />Adicionar</button>
              </div>
              {product.sabores.map((flavor: any, flavorIndex: number) => (
                <div key={flavorIndex} className="grid gap-2 rounded-lg border border-gray-100 p-2 md:grid-cols-[1fr_160px_36px]">
                  <input value={flavor.nome?.valor || ''} onChange={(event) => onChange((draft) => { draft.sabores[flavorIndex].nome.valor = event.target.value; })} placeholder="Nome do sabor" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  <input type="number" min="0" step="0.01" value={flavor.preco_adicional?.valor ?? 0} onChange={(event) => onChange((draft) => { draft.sabores[flavorIndex].preco_adicional.valor = Number(event.target.value || 0); })} placeholder="Adicional" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  <button type="button" onClick={() => onChange((draft) => draft.sabores.splice(flavorIndex, 1))} className="flex items-center justify-center text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Grupos de adicionais</h3>
                <button type="button" onClick={() => onChange((draft) => draft.grupos_adicionais.push({ nome: field('Adicionais'), tipo_selecao: field('multipla'), minimo_selecoes: field(0), maximo_selecoes: field(1), opcoes: [] }))} className="flex items-center gap-1 text-xs font-semibold text-blue-700"><Plus className="h-3.5 w-3.5" />Novo grupo</button>
              </div>
              {product.grupos_adicionais.map((group: any, groupIndex: number) => (
                <div key={groupIndex} className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="grid gap-2 md:grid-cols-[1fr_150px_90px_90px_36px]">
                    <input value={group.nome?.valor || ''} onChange={(event) => onChange((draft) => { draft.grupos_adicionais[groupIndex].nome.valor = event.target.value; })} placeholder="Nome do grupo" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                    <select value={group.tipo_selecao?.valor || 'multipla'} onChange={(event) => onChange((draft) => { draft.grupos_adicionais[groupIndex].tipo_selecao.valor = event.target.value; })} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm"><option value="unica">Escolha única</option><option value="multipla">Múltipla</option></select>
                    <input type="number" min="0" value={group.minimo_selecoes?.valor ?? 0} onChange={(event) => onChange((draft) => { draft.grupos_adicionais[groupIndex].minimo_selecoes.valor = Number(event.target.value || 0); })} title="Mínimo" className="rounded-lg border border-gray-200 px-2 py-2 text-sm" />
                    <input type="number" min="1" value={group.maximo_selecoes?.valor ?? 1} onChange={(event) => onChange((draft) => { draft.grupos_adicionais[groupIndex].maximo_selecoes.valor = Number(event.target.value || 1); })} title="Máximo" className="rounded-lg border border-gray-200 px-2 py-2 text-sm" />
                    <button type="button" onClick={() => onChange((draft) => draft.grupos_adicionais.splice(groupIndex, 1))} className="flex items-center justify-center text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {group.opcoes.map((option: any, optionIndex: number) => (
                    <div key={optionIndex} className="grid gap-2 pl-3 md:grid-cols-[1fr_150px_36px]">
                      <input value={option.nome?.valor || ''} onChange={(event) => onChange((draft) => { draft.grupos_adicionais[groupIndex].opcoes[optionIndex].nome.valor = event.target.value; })} placeholder="Nome do adicional" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                      <input type="number" min="0" step="0.01" value={option.preco_adicional?.valor ?? 0} onChange={(event) => onChange((draft) => { draft.grupos_adicionais[groupIndex].opcoes[optionIndex].preco_adicional.valor = Number(event.target.value || 0); })} placeholder="Preço" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                      <button type="button" onClick={() => onChange((draft) => draft.grupos_adicionais[groupIndex].opcoes.splice(optionIndex, 1))} className="flex items-center justify-center text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => onChange((draft) => draft.grupos_adicionais[groupIndex].opcoes.push({ nome: field(''), descricao: field(null), preco_adicional: field(0), disponivel: field(true) }))} className="ml-3 flex items-center gap-1 text-xs font-semibold text-blue-700"><Plus className="h-3.5 w-3.5" />Adicionar opção</button>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </details>
  );
}

export function MenuImportScreen() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [availability, setAvailability] = useState<MenuImportAvailability | null>(null);
  const [imports, setImports] = useState<MenuImport[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MenuImport | null>(null);
  const [review, setReview] = useState<MenuImportReview | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const loadImports = useCallback(async () => {
    const data = await menuImportsService.list();
    setImports(data);
    return data;
  }, []);

  const loadDetail = useCallback(async (id: string, replaceReview = true) => {
    const data = await menuImportsService.getById(id);
    setDetail(data);
    if (replaceReview && (data.resultado_revisado_json || data.resultado_normalizado_json)) {
      setReview(structuredClone(data.resultado_revisado_json || data.resultado_normalizado_json));
    }
    return data;
  }, []);

  useEffect(() => {
    let active = true;
    menuImportsService.getAvailability()
      .then(async (data) => {
        if (!active) return;
        setAvailability(data);
        if (data.enabled) {
          const history = await loadImports();
          if (active && history[0]) setSelectedId(history[0].id);
        }
      })
      .catch((error) => active && setMessage({ type: 'error', text: errorMessage(error) }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [loadImports]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setReview(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!detail || !['pendente', 'processando', 'confirmando'].includes(detail.status)) return;
    const timer = window.setInterval(async () => {
      const updated = await loadDetail(detail.id, false).catch(() => null);
      if (updated && !['pendente', 'processando', 'confirmando'].includes(updated.status)) {
        await loadDetail(detail.id, true);
        await loadImports();
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [detail?.id, detail?.status, loadDetail, loadImports]);

  const fileLimits = availability?.config;
  const addFiles = (incoming: FileList | File[]) => {
    const next = Array.from(incoming).filter((file) => ACCEPTED_TYPES.includes(file.type));
    setFiles((current) => [...current, ...next].slice(0, fileLimits?.max_files || 10));
    if (next.length !== Array.from(incoming).length) setMessage({ type: 'error', text: 'Alguns arquivos foram ignorados porque não são JPEG, PNG, WebP ou PDF.' });
  };

  const upload = async () => {
    if (files.length === 0) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const created = await menuImportsService.create(files);
      setFiles([]);
      setSelectedId(created.id);
      await Promise.all([loadImports(), loadDetail(created.id)]);
      setMessage({ type: 'success', text: 'Cardápio enviado. O processamento ocorre em segundo plano.' });
    } catch (error) {
      setMessage({ type: 'error', text: errorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  const mutateProduct = (index: number, mutator: (draft: MenuImportProduct) => void) => {
    setReview((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      mutator(next.produtos[index]);
      return next;
    });
  };

  const save = async () => {
    if (!detail || !review) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const saved = await menuImportsService.saveReview(detail.id, review);
      setDetail(saved);
      setReview(structuredClone(saved.resultado_revisado_json || review));
      setMessage({ type: 'success', text: 'Revisão salva com sucesso.' });
    } catch (error) {
      setMessage({ type: 'error', text: errorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  const confirm = async () => {
    if (!detail || !review || !window.confirm('Deseja publicar os itens revisados no cardápio da loja?')) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await menuImportsService.saveReview(detail.id, review);
      await menuImportsService.confirm(detail.id);
      await Promise.all([loadDetail(detail.id), loadImports()]);
      setMessage({ type: 'success', text: 'Cardápio publicado com sucesso.' });
    } catch (error) {
      setMessage({ type: 'error', text: errorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  const totalReview = useMemo(() => review?.produtos.length || 0, [review]);

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-700" /></div>;
  if (!availability?.enabled) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 p-6">
        <div className="max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <Sparkles className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Importação inteligente indisponível</h1>
          <p className="mt-2 text-sm text-gray-600">Este recurso não está habilitado para sua loja. Entre em contato com o suporte ou com o administrador do plano.</p>
          <button onClick={() => navigate('/products')} className="mt-6 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>Voltar para produtos</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => navigate('/products')} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><Sparkles className="h-5 w-5 text-violet-600" />Importação inteligente de cardápio</h1>
            <p className="text-xs text-gray-500">A IA cria um rascunho. Nada é publicado sem sua confirmação.</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-right text-xs text-gray-500"><strong className="block text-sm text-gray-800">{availability.restante_mensal}</strong>importações restantes</div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 p-4">
        {message && <div className={`rounded-lg border p-3 text-sm ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{message.text}</div>}

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Upload className="h-5 w-5" /></div>
            <div className="min-w-[220px] flex-1"><h2 className="text-sm font-semibold text-gray-900">Enviar fotos ou PDF</h2><p className="text-xs text-gray-500">Até {fileLimits?.max_files} arquivos; {fileLimits?.max_image_mb} MB por imagem e {fileLimits?.max_pdf_mb} MB por PDF.</p></div>
            <button onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Escolher arquivos</button>
            <button onClick={upload} disabled={files.length === 0 || submitting} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: PRIMARY }}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Processar com IA</button>
            <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(event) => event.target.files && addFiles(event.target.files)} />
          </div>
          {files.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">{file.type === 'application/pdf' ? <FileText className="h-4 w-4 text-red-600" /> : <FileImage className="h-4 w-4 text-blue-600" />}<span className="max-w-52 truncate">{file.name}</span><button onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><XCircle className="h-4 w-4 text-gray-400" /></button></div>)}</div>}
        </section>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3"><h2 className="text-sm font-semibold text-gray-900">Importações</h2><button onClick={() => void loadImports()} className="text-gray-400 hover:text-gray-700"><RefreshCw className="h-4 w-4" /></button></div>
            <div className="max-h-[680px] overflow-y-auto p-2">
              {imports.length === 0 && <p className="p-4 text-center text-xs text-gray-500">Nenhuma importação realizada.</p>}
              {imports.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`mb-1 w-full rounded-lg border p-3 text-left ${selectedId === item.id ? 'border-blue-200 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}><div className="flex items-center justify-between"><span className="text-xs font-semibold text-gray-800">{statusLabels[item.status]}</span><span className="text-[10px] text-gray-400">{new Date(item.criado_em).toLocaleDateString('pt-BR')}</span></div><div className="mt-1 text-[11px] text-gray-500">{item.quantidade_arquivos || 0} arquivo(s){item.confidence_score != null ? ` • ${Math.round(Number(item.confidence_score) * 100)}%` : ''}</div></button>)}
            </div>
          </aside>

          <section className="min-w-0 space-y-4">
            {!detail && <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">Envie um cardápio ou selecione uma importação anterior.</div>}
            {detail && ['pendente', 'processando', 'confirmando'].includes(detail.status) && <div className="rounded-xl border border-blue-200 bg-white p-10 text-center shadow-sm"><Loader2 className="mx-auto h-9 w-9 animate-spin text-blue-700" /><h2 className="mt-4 text-base font-semibold text-gray-900">{statusLabels[detail.status]}</h2><p className="mt-1 text-sm text-gray-500">Você pode sair desta tela. O processamento continuará em segundo plano.</p></div>}
            {detail?.status === 'falhou' && <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm"><XCircle className="h-8 w-8 text-red-600" /><h2 className="mt-3 font-semibold text-gray-900">Não foi possível processar</h2><p className="mt-1 text-sm text-red-700">{detail.erros_json?.[0]?.mensagem || 'Revise os arquivos e tente uma nova importação.'}</p></div>}
            {detail?.status === 'cancelada' && <div className="rounded-xl border border-gray-200 bg-white p-8 text-center"><p className="text-sm text-gray-600">Esta importação foi cancelada.</p></div>}
            {detail?.status === 'concluida' && <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm"><CheckCircle2 className="h-9 w-9 text-emerald-600" /><h2 className="mt-3 text-lg font-semibold text-gray-900">Cardápio publicado</h2><p className="mt-1 text-sm text-gray-600">Os itens confirmados já estão disponíveis pelo fluxo atual do catálogo.</p><button onClick={() => navigate('/products')} className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>Ver produtos</button></div>}

            {detail?.status === 'aguardando_revisao' && review && (
              <>
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><div className="flex-1"><h2 className="text-base font-semibold text-gray-900">Revise {totalReview} item(ns)</h2><p className="text-xs text-gray-500">Campos amarelos ou com baixa confiança merecem atenção especial.</p></div><button onClick={save} disabled={submitting} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700"><Save className="h-4 w-4" />Salvar revisão</button><button onClick={confirm} disabled={submitting} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Publicar cardápio</button></div>
                {review.avisos?.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><div className="mb-1 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Avisos gerais</div>{review.avisos.map((warning, index) => <div key={index}>• {warning}</div>)}</div>}
                <div className="space-y-3">{review.produtos.map((product, index) => <ProductReviewCard key={product.chave} product={product} index={index} categories={detail.categorias_disponiveis} onChange={(mutator) => mutateProduct(index, mutator)} />)}</div>
                <div className="sticky bottom-0 flex items-center justify-between rounded-xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur"><div className="flex items-center gap-2 text-xs text-gray-500"><Clock3 className="h-4 w-4" />Nada será publicado antes da confirmação.</div><button onClick={confirm} disabled={submitting} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: PRIMARY }}>Confirmar e publicar</button></div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
