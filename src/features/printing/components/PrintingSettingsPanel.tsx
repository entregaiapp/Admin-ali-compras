import { useEffect, useMemo, useState } from "react";
import { Laptop, Link, Printer, RefreshCw, TestTube2, Trash2 } from "lucide-react";
import { showSystemNotice } from "@/shared/components/SystemNoticeModal";
import { formatBrasiliaDate } from "@/shared/lib/dateTime";
import { printingService } from "@/features/printing/services/printingService";
import type { PairingCode, PrintAgent, Printer as PrinterType } from "@/features/printing/types/printing";
import { PrintStatusBadge } from "./PrintStatusBadge";

const PRIMARY = "#122a4c";
export type StorePrintMode = "agent_silencioso" | "navegador_windows" | "agent_com_fallback";

type PrintingSettingsPanelProps = {
  printMode: StorePrintMode;
  onPrintModeChange: (mode: StorePrintMode) => void;
};

function safeDate(value?: string | null) {
  if (!value) return "Nunca";
  return formatBrasiliaDate(value, { dateStyle: "short", timeStyle: "short" });
}

export function PrintingSettingsPanel({ printMode, onPrintModeChange }: PrintingSettingsPanelProps) {
  const [agents, setAgents] = useState<PrintAgent[]>([]);
  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [pairingCode, setPairingCode] = useState<PairingCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const hasOnlineAgent = useMemo(() => agents.some((agent) => agent.online), [agents]);

  const load = async () => {
    try {
      setLoading(true);
      const [nextAgents, nextPrinters] = await Promise.all([
        printingService.listAgents(),
        printingService.listPrinters(),
      ]);
      setAgents(nextAgents);
      setPrinters(nextPrinters);
    } catch {
      showSystemNotice("Não foi possível carregar as configurações de impressão.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const generateCode = async () => {
    try {
      setBusy(true);
      setPairingCode(await printingService.generatePairingCode());
    } catch {
      showSystemNotice("Não foi possível gerar o código de vinculação.");
    } finally {
      setBusy(false);
    }
  };

  const updatePrinter = async (printer: PrinterType, patch: Partial<PrinterType>) => {
    try {
      await printingService.updatePrinter(printer.id, patch as any);
      await load();
    } catch {
      showSystemNotice("Não foi possível atualizar a impressora.");
    }
  };

  const testPrint = async (printerId: string) => {
    try {
      await printingService.testPrint(printerId);
      showSystemNotice(hasOnlineAgent ? "Impressão de teste enviada." : "Teste adicionado à fila. O Print Agent imprimirá quando reconectar.");
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.response?.data?.error?.message || "Não foi possível enviar a impressão de teste.");
    }
  };

  const revokeAgent = async (agent: PrintAgent) => {
    if (!window.confirm(`Revogar o computador "${agent.nome}"?`)) return;
    try {
      await printingService.revokeAgent(agent.id);
      await load();
    } catch {
      showSystemNotice("Não foi possível revogar o agente.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900">Modo de impressão dos pedidos</h3>
        <p className="mt-1 text-sm text-gray-500">
          Escolha como o botão Imprimir do pedido deve funcionar no Admin.
        </p>

        <div className="mt-4 grid gap-3">
          {[
            {
              value: "agent_com_fallback" as StorePrintMode,
              title: "Print Agent com fallback para Windows",
              description: "Tenta imprimir silenciosamente no computador da loja. Se não houver Agent ou impressora configurada, usa a impressão normal deste computador.",
            },
            {
              value: "agent_silencioso" as StorePrintMode,
              title: "Somente Print Agent",
              description: "Usa apenas a fila remota silenciosa. Ideal para lojas já configuradas com o Agent.",
            },
            {
              value: "navegador_windows" as StorePrintMode,
              title: "Imprimir neste computador",
              description: "Usa a janela de impressão normal do navegador/Windows neste dispositivo.",
            },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
                printMode === option.value ? "border-[#122a4c] bg-blue-50" : "border-gray-200 bg-white"
              }`}
            >
              <input
                type="radio"
                name="impressao_pedido_modo"
                checked={printMode === option.value}
                onChange={() => onPrintModeChange(option.value)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-bold text-gray-900">{option.title}</span>
                <span className="mt-1 block text-xs font-medium text-gray-500">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Entregaí Print Agent</h3>
            <p className="text-sm text-gray-500">Computadores vinculados para impressão silenciosa da loja.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>
            <button type="button" disabled={busy} onClick={() => void generateCode()} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: PRIMARY }}>
              <Link className="h-4 w-4" />
              Gerar código de vinculação
            </button>
          </div>
        </div>

        {pairingCode && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase text-blue-700">Código de vinculação</p>
            <p className="mt-1 font-mono text-3xl font-black tracking-widest text-blue-950">{pairingCode.code}</p>
            <p className="mt-1 text-xs font-medium text-blue-700">Expira em {safeDate(pairingCode.expires_at)}.</p>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">Carregando...</div>
        ) : agents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">Nenhum computador vinculado.</div>
        ) : (
          <div className="grid gap-3">
            {agents.map((agent) => (
              <div key={agent.id} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                    <Laptop className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-gray-900">{agent.nome}</h4>
                      <PrintStatusBadge online={agent.online} revoked={Boolean(agent.revoked_at)} />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Última conexão: {safeDate(agent.last_seen_at)}</p>
                    <p className="text-xs text-gray-500">Versão: {agent.app_version || "Não informada"}</p>
                  </div>
                </div>
                {!agent.revoked_at && (
                  <button type="button" onClick={() => void revokeAgent(agent)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600">
                    <Trash2 className="h-4 w-4" />
                    Revogar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 font-semibold text-gray-900">Impressoras</h3>
        {printers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">Nenhuma impressora detectada.</div>
        ) : (
          <div className="grid gap-3">
            {printers.map((printer) => (
              <div key={printer.id} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Printer className="h-5 w-5 text-gray-500" />
                    <div>
                      <input
                        value={printer.display_name}
                        onChange={(event) => updatePrinter(printer, { display_name: event.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-900"
                      />
                      <p className="mt-1 text-xs text-gray-500">{printer.device_name}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => void testPrint(printer.id)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
                    <TestTube2 className="h-4 w-4" />
                    Imprimir teste
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <select value={printer.sector} onChange={(event) => updatePrinter(printer, { sector: event.target.value as any })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <option value="COZINHA">Cozinha</option>
                    <option value="BAR">Bar</option>
                    <option value="CAIXA">Caixa</option>
                    <option value="EXPEDICAO">Expedição</option>
                    <option value="GERAL">Geral</option>
                  </select>
                  <select value={printer.paper_width_mm} onChange={(event) => updatePrinter(printer, { paper_width_mm: Number(event.target.value) as 58 | 80 })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <option value={58}>58 mm</option>
                    <option value={80}>80 mm</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input type="checkbox" checked={printer.is_default} onChange={(event) => updatePrinter(printer, { is_default: event.target.checked })} />
                    Padrão
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input type="checkbox" checked={printer.active} onChange={(event) => updatePrinter(printer, { active: event.target.checked })} />
                    Ativa
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
