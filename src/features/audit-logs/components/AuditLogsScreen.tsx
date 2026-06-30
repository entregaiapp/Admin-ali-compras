import { useState, useEffect } from 'react';
import { ClipboardList, RefreshCw, Eye, Search, AlertCircle, Calendar } from 'lucide-react';
import api from '@/shared/lib/api';
import { formatBrasiliaDate } from '@/shared/lib/dateTime';

interface AuditLog {
  id: string;
  usuario_id: string;
  tabela_afetada: string;
  registro_id: string;
  acao: 'insercao' | 'atualizacao' | 'exclusao';
  dados_anteriores: any;
  dados_novos: any;
  criado_em: string;
}

export function AuditLogsScreen() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/logs_auditoria');
      if (response.data?.success) {
        const payloadData = response.data.data;
        setLogs(Array.isArray(payloadData) ? payloadData : payloadData?.data || []);
      } else {
        setLogs(response.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar os logs de auditoria');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionColor = (acao: string) => {
    switch (acao) {
      case 'insercao': return 'bg-green-100 text-green-800 border-green-200';
      case 'atualizacao': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'exclusao': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionLabel = (acao: string) => {
    switch (acao) {
      case 'insercao': return 'Criação';
      case 'atualizacao': return 'Atualização';
      case 'exclusao': return 'Exclusão';
      default: return acao;
    }
  };

  const filteredLogs = logs.filter(log => 
    log.tabela_afetada?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.acao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-auto bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-[#122a4c]" />
              Logs de Auditoria
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Registro completo de todas as ações e modificações no sistema.
            </p>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#122a4c] disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por módulo, ação ou ID do log..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#122a4c]/20 focus:border-[#122a4c] transition-all"
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading && logs.length === 0 ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Carregando logs de auditoria...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum log encontrado</h3>
              <p className="text-gray-500">
                {searchTerm ? 'Sua busca não retornou resultados.' : 'Não há registros de auditoria no sistema.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação / Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Módulo (Tabela)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário ID</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border w-fit ${getActionColor(log.acao)}`}>
                            {getActionLabel(log.acao)}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            {formatBrasiliaDate(log.criado_em, { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 capitalize">
                          {log.tabela_afetada.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5" title="ID do Registro">
                          {log.registro_id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 font-mono" title={log.usuario_id}>
                          {log.usuario_id.substring(0, 13)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-[#122a4c] hover:text-[#1a3d6e] bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors inline-flex items-center justify-center"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900/50 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />

            <div className="relative inline-block w-full max-w-4xl p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    Detalhes da Operação
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionColor(selectedLog.acao)}`}>
                      {getActionLabel(selectedLog.acao)}
                    </span>
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Log gerado em {formatBrasiliaDate(selectedLog.criado_em, { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <span className="sr-only">Fechar</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Módulo</div>
                  <div className="text-sm font-medium text-gray-900 capitalize">{selectedLog.tabela_afetada.replace(/_/g, ' ')}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">ID do Registro</div>
                  <div className="text-sm font-mono text-gray-900 break-all">{selectedLog.registro_id}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 md:col-span-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">ID do Usuário Responsável</div>
                  <div className="text-sm font-mono text-gray-900 break-all">{selectedLog.usuario_id}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    Dados Anteriores
                  </h4>
                  <div className="bg-gray-900 rounded-xl p-4 overflow-auto max-h-[400px]">
                    <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-all">
                      {selectedLog.dados_anteriores ? JSON.stringify(selectedLog.dados_anteriores, null, 2) : 'Nenhum dado anterior (Nova Inserção)'}
                    </pre>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    Dados Novos
                  </h4>
                  <div className="bg-gray-900 rounded-xl p-4 overflow-auto max-h-[400px]">
                    <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-all">
                      {selectedLog.dados_novos ? JSON.stringify(selectedLog.dados_novos, null, 2) : 'Nenhum dado novo (Exclusão)'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
