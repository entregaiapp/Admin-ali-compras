import { useEffect, useMemo, useState } from "react";
import { Archive, Laptop, Link, Printer, RefreshCw, TestTube2, Trash2 } from "lucide-react";
import { showSystemNotice } from "@/shared/components/SystemToast";
import { formatBrasiliaDate } from "@/shared/lib/dateTime";
import api from "@/shared/lib/api";
import { printingService } from "@/features/printing/services/printingService";
import type { ConfigurableItemsPrintLayout, PairingCode, PrintAgent, PrintAutomationSetting, Printer as PrinterType, PrintSource, UserPrinterPreference } from "@/features/printing/types/printing";
import { PrintStatusBadge } from "./PrintStatusBadge";

const PRIMARY = "#122a4c";
export type StorePrintMode = "agent_silencioso" | "navegador_windows" | "agent_com_fallback";

const SOURCE_OPTIONS: Array<{ value: PrintSource; label: string; description: string }> = [
  { value: "delivery", label: "Pedidos Delivery", description: "Pedidos de entrega criados pelo cliente." },
  { value: "retirada", label: "Pedidos para Retirada", description: "Pedidos retirados no balcão." },
  { value: "salao", label: "Pedidos do Salão", description: "Pedidos de consumo no salão." },
  { value: "admin", label: "Pedidos criados pelo Admin", description: "Pedidos lançados manualmente no painel." },
  { value: "mesa", label: "Impressões de Mesa", description: "Comandas e impressões vinculadas às mesas." },
];

const AUTOMATION_LABELS: Record<PrintAutomationSetting["source"], string> = {
  delivery: "Delivery",
  retirada: "Retirada",
  admin: "Pix por link administrativo",
};

const DEFAULT_CONFIGURABLE_ITEMS_LAYOUT: ConfigurableItemsPrintLayout = {
  uppercase_product: true,
  show_variation: true,
  variation_label: "TAMANHO",
  uppercase_variation: true,
  show_group_titles: true,
  uppercase_group_titles: true,
  uppercase_options: true,
  show_fractions: true,
  fraction_format: "symbol",
  show_option_quantities: true,
  show_configuration_divider: true,
  observation_style: "box",
  observation_title: "OBSERVAÇÃO",
  uppercase_observation: true,
  font_scale: "normal",
};

type PrintingSettingsPanelProps = {
  printMode: StorePrintMode;
  onPrintModeChange: (mode: StorePrintMode) => void;
};

type PrintSettingsTab = "printers" | "user-printers";
type PrinterStatusTab = "active" | "inactive";

function safeDate(value?: string | null) {
  if (!value) return "Nunca";
  return formatBrasiliaDate(value, { dateStyle: "short", timeStyle: "short" });
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const fullHex = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;
  const value = Number.parseInt(fullHex, 16);
  if (Number.isNaN(value)) return `rgba(18, 42, 76, ${alpha})`;
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function PrintTabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative isolate inline-flex min-w-max items-center justify-center gap-2 overflow-hidden border-b-2 px-4 py-3 text-sm font-semibold transition-all duration-200 ${
        active ? "text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
      style={active ? { borderBottomColor: PRIMARY, color: PRIMARY } : undefined}
    >
      {active && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-7"
            style={{
              background: `linear-gradient(to top, ${hexToRgba(PRIMARY, 0.13)} 0%, ${hexToRgba(PRIMARY, 0.055)} 38%, ${hexToRgba(PRIMARY, 0)} 100%)`,
            }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-3 bottom-0 h-1 blur-md"
            style={{ backgroundColor: hexToRgba(PRIMARY, 0.22) }}
          />
        </>
      )}
      <span className="relative z-10">{label}</span>
      {typeof count === "number" && (
        <span
          className="relative z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
          style={{ backgroundColor: active ? PRIMARY : "#94a3b8" }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

export function PrintingSettingsPanel({ printMode, onPrintModeChange }: PrintingSettingsPanelProps) {
  const [agents, setAgents] = useState<PrintAgent[]>([]);
  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [automationSettings, setAutomationSettings] = useState<PrintAutomationSetting[]>([]);
  const [preferences, setPreferences] = useState<UserPrinterPreference[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [pairingCode, setPairingCode] = useState<PairingCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<PrintSettingsTab>("printers");
  const [printerStatusTab, setPrinterStatusTab] = useState<PrinterStatusTab>("active");
  const [showArchivedAgents, setShowArchivedAgents] = useState(false);

  const activeAgents = useMemo(() => agents.filter((agent) => !agent.revoked_at), [agents]);
  const archivedAgents = useMemo(() => agents.filter((agent) => agent.revoked_at), [agents]);
  const hasOnlineAgent = useMemo(() => activeAgents.some((agent) => agent.online), [activeAgents]);
  const activePrinters = useMemo(() => printers.filter((printer) => printer.active), [printers]);
  const inactivePrinters = useMemo(() => printers.filter((printer) => !printer.active), [printers]);
  const visiblePrinters = printerStatusTab === "active" ? activePrinters : inactivePrinters;

  const load = async () => {
    try {
      setLoading(true);
      const [nextAgents, nextPrinters, nextAutomationSettings, nextPreferences, usersResponse] = await Promise.all([
        printingService.listAgents(),
        printingService.listPrinters(),
        printingService.listAutomationSettings(),
        printingService.listUserPrinterPreferences(),
        api.get("/usuarios", { params: { per_page: 200 } }).catch(() => null),
      ]);
      setAgents(nextAgents);
      setPrinters(nextPrinters);
      setAutomationSettings(nextAutomationSettings);
      setPreferences(nextPreferences);
      const rawUsers = usersResponse?.data?.data?.data || usersResponse?.data?.data || usersResponse?.data || [];
      setUsers(Array.isArray(rawUsers) ? rawUsers : []);
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
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.response?.data?.error?.message || "Não foi possível gerar o código de vinculação.");
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

  const updateAutomation = async (source: PrintAutomationSetting["source"], patch: Partial<PrintAutomationSetting>) => {
    try {
      const nextSettings = ["delivery", "retirada", "admin"].map((candidate) => {
        const current = automationSettings.find((item) => item.source === candidate) || {
          source: candidate as PrintAutomationSetting["source"],
          auto_print_paid: false,
          move_to_preparation: false,
        };
        return current.source === source ? { ...current, ...patch } : current;
      }) as PrintAutomationSetting[];
      setAutomationSettings(await printingService.updateAutomationSettings(nextSettings));
    } catch {
      showSystemNotice("Não foi possível atualizar a automação de impressão.");
    }
  };

  const togglePrinterChannel = async (printer: PrinterType, source: PrintSource, checked: boolean) => {
    const current = new Set(printer.channels || []);
    if (checked) current.add(source);
    else current.delete(source);
    await updatePrinter(printer, { channels: Array.from(current) as PrintSource[] } as any);
  };

  const configurableItemsLayout = (printer: PrinterType): ConfigurableItemsPrintLayout => ({
    ...DEFAULT_CONFIGURABLE_ITEMS_LAYOUT,
    ...(printer.layout_settings?.configurable_items || {}),
    fraction_format: "symbol",
  });

  const updateConfigurableItemsLayout = async (
    printer: PrinterType,
    patch: Partial<ConfigurableItemsPrintLayout>,
  ) => {
    await updatePrinter(printer, {
      layout_settings: {
        ...(printer.layout_settings || {}),
        configurable_items: {
          ...configurableItemsLayout(printer),
          ...patch,
        },
      },
    });
  };

  const updateUserPreference = async (usuarioId: string, printerId: string | null) => {
    try {
      await printingService.setUserPrinterPreference(usuarioId, printerId || null);
      setPreferences(await printingService.listUserPrinterPreferences());
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.response?.data?.error?.message || "Não foi possível atualizar a impressora do usuário.");
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
        ) : activeAgents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">Nenhum computador ativo vinculado.</div>
        ) : (
          <div className="grid gap-3">
            {activeAgents.map((agent) => (
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

        {!loading && archivedAgents.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setShowArchivedAgents((current) => !current)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              aria-expanded={showArchivedAgents}
            >
              <Archive className="h-4 w-4" />
              Agentes arquivados ({archivedAgents.length})
            </button>

            {showArchivedAgents && (
              <div className="mt-3 grid gap-3">
                {archivedAgents.map((agent) => (
                  <div key={agent.id} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-500">
                        <Laptop className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-gray-700">{agent.nome}</h4>
                          <PrintStatusBadge online={agent.online} revoked={Boolean(agent.revoked_at)} />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Última conexão: {safeDate(agent.last_seen_at)}</p>
                        <p className="text-xs text-gray-500">Versão: {agent.app_version || "Não informada"}</p>
                        <p className="text-xs text-gray-500">Revogado em: {safeDate(agent.revoked_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900">Automação de pedidos</h3>
        <p className="mt-1 text-sm text-gray-500">
          A automação usa apenas pedidos com pagamento online confirmado pelo backend.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(["delivery", "retirada"] as PrintAutomationSetting["source"][]).map((source) => {
            const setting = automationSettings.find((item) => item.source === source) || {
              source,
              auto_print_paid: false,
              move_to_preparation: false,
            };
            return (
              <div key={source} className="rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-bold text-gray-900">{AUTOMATION_LABELS[source]}</h4>
                <label className="mt-3 flex items-start gap-2 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={setting.auto_print_paid}
                    onChange={(event) => void updateAutomation(source, { auto_print_paid: event.target.checked })}
                    className="mt-1"
                  />
                  <span>Imprimir automaticamente pedidos pagos</span>
                </label>
                <label className="mt-3 flex items-start gap-2 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={setting.move_to_preparation}
                    onChange={(event) => void updateAutomation(source, { move_to_preparation: event.target.checked })}
                    className="mt-1"
                  />
                  <span>Alterar automaticamente para “Em preparação”</span>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4">
          <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Configurações de impressoras">
            <PrintTabButton
              active={activeTab === "printers"}
              label="Impressoras"
              count={printers.length}
              onClick={() => setActiveTab("printers")}
            />
            <PrintTabButton
              active={activeTab === "user-printers"}
              label="Impressoras por usuário"
              count={users.length}
              onClick={() => setActiveTab("user-printers")}
            />
          </div>
        </div>

        {activeTab === "printers" && (
          <div className="p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Impressoras conectadas</h3>
                <p className="text-sm text-gray-500">Gerencie as impressoras detectadas pelo Print Agent.</p>
              </div>
              <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Status das impressoras">
                <PrintTabButton
                  active={printerStatusTab === "active"}
                  label="Ativas"
                  count={activePrinters.length}
                  onClick={() => setPrinterStatusTab("active")}
                />
                <PrintTabButton
                  active={printerStatusTab === "inactive"}
                  label="Inativas"
                  count={inactivePrinters.length}
                  onClick={() => setPrinterStatusTab("inactive")}
                />
              </div>
            </div>

            {printers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">Nenhuma impressora detectada.</div>
            ) : visiblePrinters.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                {printerStatusTab === "active" ? "Nenhuma impressora ativa." : "Nenhuma impressora inativa."}
              </div>
            ) : (
              <div className="grid gap-3">
                {visiblePrinters.map((printer) => (
                  <div key={printer.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <Printer className="h-5 w-5 text-gray-500" />
                        <div>
                          <input
                            value={printer.display_name}
                            onChange={(event) => void updatePrinter(printer, { display_name: event.target.value })}
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
                      <label className="text-xs font-bold uppercase text-gray-500">
                        Setor operacional
                        <select value={printer.sector} onChange={(event) => void updatePrinter(printer, { sector: event.target.value as any })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium normal-case text-gray-700">
                          <option value="COZINHA">Cozinha</option>
                          <option value="BAR">Bar</option>
                          <option value="CAIXA">Caixa</option>
                          <option value="EXPEDICAO">Expedição</option>
                          <option value="GERAL">Geral</option>
                        </select>
                      </label>
                      <label className="text-xs font-bold uppercase text-gray-500">
                        Papel
                        <select value={printer.paper_width_mm} onChange={(event) => void updatePrinter(printer, { paper_width_mm: Number(event.target.value) as 58 | 80 })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium normal-case text-gray-700">
                          <option value={58}>58 mm</option>
                          <option value={80}>80 mm</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <input type="checkbox" checked={printer.is_default} onChange={(event) => void updatePrinter(printer, { is_default: event.target.checked })} />
                        Padrão de fallback
                      </label>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <input type="checkbox" checked={printer.active} onChange={(event) => void updatePrinter(printer, { active: event.target.checked })} />
                        Ativa
                      </label>
                    </div>

                    <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
                      <p className="text-sm font-bold text-gray-900">O que esta impressora imprime?</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {SOURCE_OPTIONS.map((source) => (
                          <label key={source.value} className="flex items-start gap-2 text-sm font-semibold text-gray-700">
                            <input
                              type="checkbox"
                              checked={(printer.channels || []).includes(source.value)}
                              onChange={(event) => void togglePrinterChannel(printer, source.value, event.target.checked)}
                              className="mt-1"
                            />
                            <span>
                              <span className="block">{source.label}</span>
                              <span className="block text-xs font-medium text-gray-500">{source.description}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
                      <p className="text-sm font-bold text-gray-900">Apresentação dos itens configuráveis</p>
                      <p className="mt-1 text-xs font-medium text-gray-500">
                        Personalize tamanhos, grupos, frações e observações nesta impressora.
                      </p>

                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <label className="text-xs font-bold uppercase text-gray-500">
                          Rótulo da variação
                          <input
                            key={`${printer.id}-${configurableItemsLayout(printer).variation_label}`}
                            defaultValue={configurableItemsLayout(printer).variation_label}
                            maxLength={40}
                            onBlur={(event) => {
                              const value = event.target.value.trim();
                              if (value && value !== configurableItemsLayout(printer).variation_label) {
                                void updateConfigurableItemsLayout(printer, { variation_label: value });
                              }
                            }}
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium normal-case text-gray-700"
                          />
                        </label>

                        <label className="text-xs font-bold uppercase text-gray-500">
                          Tamanho do texto
                          <select
                            value={configurableItemsLayout(printer).font_scale}
                            onChange={(event) => void updateConfigurableItemsLayout(printer, { font_scale: event.target.value as ConfigurableItemsPrintLayout["font_scale"] })}
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium normal-case text-gray-700"
                          >
                            <option value="compact">Compacto</option>
                            <option value="normal">Normal</option>
                            <option value="large">Grande</option>
                          </select>
                        </label>

                        <label className="text-xs font-bold uppercase text-gray-500">
                          Título da observação
                          <input
                            key={`${printer.id}-${configurableItemsLayout(printer).observation_title}`}
                            defaultValue={configurableItemsLayout(printer).observation_title}
                            maxLength={40}
                            onBlur={(event) => {
                              const value = event.target.value.trim();
                              if (value && value !== configurableItemsLayout(printer).observation_title) {
                                void updateConfigurableItemsLayout(printer, { observation_title: value });
                              }
                            }}
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium normal-case text-gray-700"
                          />
                        </label>

                        <label className="text-xs font-bold uppercase text-gray-500">
                          Estilo da observação
                          <select
                            value={configurableItemsLayout(printer).observation_style}
                            onChange={(event) => void updateConfigurableItemsLayout(printer, { observation_style: event.target.value as ConfigurableItemsPrintLayout["observation_style"] })}
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium normal-case text-gray-700"
                          >
                            <option value="box">Caixa com borda</option>
                            <option value="highlight">Destaque lateral</option>
                            <option value="plain">Texto simples</option>
                          </select>
                        </label>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {([
                          ["uppercase_product", "Nome do produto em maiúsculas"],
                          ["show_variation", "Exibir variação/tamanho"],
                          ["uppercase_variation", "Variação/tamanho em maiúsculas"],
                          ["show_group_titles", "Exibir títulos dos grupos"],
                          ["uppercase_group_titles", "Títulos dos grupos em maiúsculas"],
                          ["uppercase_options", "Nomes das opções em maiúsculas"],
                          ["show_fractions", "Exibir frações"],
                          ["show_option_quantities", "Exibir quantidades das opções"],
                          ["show_configuration_divider", "Separar detalhes com divisor"],
                          ["uppercase_observation", "Observação em maiúsculas"],
                        ] as Array<[keyof ConfigurableItemsPrintLayout, string]>).map(([field, label]) => (
                          <label key={field} className="flex items-start gap-2 text-sm font-semibold text-gray-700">
                            <input
                              type="checkbox"
                              checked={Boolean(configurableItemsLayout(printer)[field])}
                              onChange={(event) => void updateConfigurableItemsLayout(
                                printer,
                                { [field]: event.target.checked } as Partial<ConfigurableItemsPrintLayout>,
                              )}
                              className="mt-1"
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "user-printers" && (
          <div className="p-5">
            <h3 className="font-semibold text-gray-900">Impressora específica por usuário</h3>
            <p className="mt-1 text-sm text-gray-500">
              A impressão manual usa esta preferência antes do roteamento por canal.
            </p>
            {users.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                Nenhum usuário administrativo disponível para configurar.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {users.map((user) => {
                  const preference = preferences.find((item) => item.usuario_id === user.id);
                  return (
                    <div key={user.id} className="grid gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[1fr_280px] md:items-center">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{user.nome}</p>
                        <p className="text-xs text-gray-500">{user.email || "Sem e-mail"} • {user.perfil || "Perfil não informado"}</p>
                      </div>
                      <select
                        value={preference?.printer_id || ""}
                        onChange={(event) => void updateUserPreference(user.id, event.target.value || null)}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <option value="">Usar roteamento por canal</option>
                        {activePrinters.map((printer) => (
                          <option key={printer.id} value={printer.id}>{printer.display_name}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
