import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileText, Upload, X } from "lucide-react";
import { showSystemNotice } from "@/shared/components/SystemNoticeModal";
import { productsService } from "../services/productsService";

const PRIMARY = "#122a4c";

const templateCsv = [
  "slug,preco,preco_promocional,sku",
  "arroz-branco-1kg,7.99,,ARROZ-001",
  "feijao-carioca-1kg,8.49,7.99,FEIJAO-001",
  "leite-integral-1l,5.69,,",
].join("\n");

type ImportResult = {
  total_linhas: number;
  importados: number;
  ignorados: number;
  ja_existentes: number;
  nao_encontrados: number;
  invalidos: number;
  erros: Array<{ linha: number; slug: string | null; motivo: string }>;
};

export function ProductCsvImportScreen() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const downloadTemplate = () => {
    const blob = new Blob([templateCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo-vinculo-produtos-loja.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const chooseFile = (file?: File | null) => {
    if (!file) return;

    const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type.includes("csv");
    if (!isCsv) {
      showSystemNotice("Selecione um arquivo CSV.");
      return;
    }

    setSelectedFile(file);
    setResult(null);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      showSystemNotice("Selecione um CSV para importar.");
      return;
    }

    try {
      setLoading(true);
      const importResult = await productsService.importStoreProductsCSV(selectedFile);
      setResult(importResult);
      showSystemNotice("Importação concluída.");
    } catch (error: any) {
      console.error("Error importing store products CSV", error);
      showSystemNotice(error.response?.data?.message || "Erro ao importar CSV.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Importar produtos por CSV</h1>
            <p className="mt-1 text-sm text-gray-500">
              Vincule produtos globais à loja usando apenas slug e preço. Colunas extras serão ignoradas.
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            <Download className="h-4 w-4" />
            Modelo CSV
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3">
              <div className="text-sm font-semibold text-gray-800">Arquivo</div>
            </div>
            <div className="p-4">
              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  chooseFile(event.dataTransfer.files?.[0]);
                }}
                className={`flex min-h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  dragging ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {selectedFile ? selectedFile.name : "Selecionar CSV"}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Obrigatórias: slug e preco. Opcionais: preco_promocional e sku.
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    <Upload className="h-4 w-4" />
                    Escolher arquivo
                  </button>
                  {selectedFile && (
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setResult(null);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      <X className="h-4 w-4" />
                      Remover
                    </button>
                  )}
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => chooseFile(event.target.files?.[0])}
                />
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-100 px-4 py-3">
              <button
                onClick={handleImport}
                disabled={!selectedFile || loading}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: PRIMARY }}
              >
                {loading ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Importar
              </button>
            </div>
          </section>

          <aside className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3">
              <div className="text-sm font-semibold text-gray-800">Padrões aplicados</div>
            </div>
            <div className="space-y-3 p-4 text-sm">
              {[
                ["Ativo", "Sim"],
                ["Destaque", "Não"],
                ["Consumo imediato", "Não"],
                ["Categoria", "Produto global"],
                ["Estoque", "0"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {result && (
          <section className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3">
              <div className="text-sm font-semibold text-gray-800">Resultado</div>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Linhas", result.total_linhas, "text-gray-800"],
                ["Importados", result.importados, "text-green-700"],
                ["Ignorados", result.ignorados, "text-amber-700"],
                ["Existentes", result.ja_existentes, "text-blue-700"],
                ["Inválidos", result.invalidos + result.nao_encontrados, "text-red-700"],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="text-xs font-medium text-gray-500">{label}</div>
                  <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
                </div>
              ))}
            </div>

            {result.erros?.length > 0 && (
              <div className="border-t border-gray-100 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  Linhas não importadas
                </div>
                <div className="max-h-72 overflow-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Linha</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Slug</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {result.erros.map((error, index) => (
                        <tr key={`${error.linha}-${error.slug}-${index}`}>
                          <td className="px-3 py-2 text-gray-600">{error.linha}</td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-700">{error.slug || "-"}</td>
                          <td className="px-3 py-2 text-gray-600">{error.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result.importados > 0 && result.erros?.length === 0 && (
              <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-3 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Todos os vínculos foram criados.
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
