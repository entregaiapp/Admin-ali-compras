import api from "@/shared/lib/api";
import type { PairingCode, PrintAgent, Printer } from "@/features/printing/types/printing";

const unwrap = <T,>(response: { data: any }): T => response.data?.data ?? response.data;

export const printingService = {
  async generatePairingCode() {
    return unwrap<PairingCode>(await api.post("/printing/pairing-codes", {}));
  },

  async listAgents() {
    return unwrap<PrintAgent[]>(await api.get("/printing/agents"));
  },

  async updateAgent(id: string, nome: string) {
    return unwrap<PrintAgent>(await api.patch(`/printing/agents/${id}`, { nome }));
  },

  async revokeAgent(id: string) {
    return unwrap<PrintAgent>(await api.post(`/printing/agents/${id}/revoke`, {}));
  },

  async listPrinters() {
    return unwrap<Printer[]>(await api.get("/printing/printers"));
  },

  async updatePrinter(id: string, data: Partial<Pick<Printer, "display_name" | "paper_width_mm" | "sector" | "is_default" | "active">>) {
    return unwrap<Printer>(await api.patch(`/printing/printers/${id}`, data));
  },

  async testPrint(printerId?: string) {
    return unwrap(await api.post("/printing/test-print", { printer_id: printerId || null }));
  },

  async printOrder(orderId: string, data: { mode: "cozinha" | "cliente" | "cliente_cozinha"; item_ids?: string[]; reprint?: boolean }) {
    return unwrap(await api.post(`/printing/orders/${orderId}/print`, data));
  },
};
