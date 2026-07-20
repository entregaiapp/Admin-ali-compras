import { describe, expect, it } from "vitest";
import { getMesaTransferMode } from "./MesaTransferModal";

describe("getMesaTransferMode", () => {
  const source = { id: "mesa-1" };

  it("allows free and reserved destinations", () => {
    expect(getMesaTransferMode(source, { id: "mesa-2", status: "livre" })).toBe("transferencia");
    expect(getMesaTransferMode(source, { id: "mesa-3", status: "reservada" })).toBe("transferencia");
  });

  it("joins only an open destination comanda", () => {
    expect(getMesaTransferMode(source, {
      id: "mesa-2",
      status: "ocupada",
      comanda_aberta: { id: "comanda-2", status: "aberta" },
    })).toBe("uniao");
    expect(getMesaTransferMode(source, {
      id: "mesa-3",
      status: "aguardando_conta",
      comanda_aberta: { id: "comanda-3", status: "aguardando_conta" },
    })).toBeNull();
    expect(getMesaTransferMode(source, {
      id: "mesa-4",
      status: "ocupada",
      comanda_aberta: { id: "comanda-4", status: "aberta" },
    }, { status: "aguardando_conta" })).toBeNull();
  });

  it("rejects the source, blocked tables and pending opening requests", () => {
    expect(getMesaTransferMode(source, { id: "mesa-1", status: "livre" })).toBeNull();
    expect(getMesaTransferMode(source, { id: "mesa-2", status: "bloqueada" })).toBeNull();
    expect(getMesaTransferMode(source, {
      id: "mesa-3",
      status: "livre",
      solicitacao_abertura: { id: "request-1" },
    })).toBeNull();
  });
});
