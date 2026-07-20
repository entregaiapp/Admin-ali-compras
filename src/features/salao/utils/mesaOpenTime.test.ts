import { describe, expect, it } from "vitest";
import { parseMesaOpenedAt } from "./mesaOpenTime";

describe("mesaOpenTime", () => {
  it("uses the opening timestamp returned by the backend", () => {
    expect(parseMesaOpenedAt("2026-07-20T12:30:00.000Z")).toBe(
      Date.parse("2026-07-20T12:30:00.000Z"),
    );
  });

  it("rejects missing and invalid opening timestamps", () => {
    expect(parseMesaOpenedAt(null)).toBeNull();
    expect(parseMesaOpenedAt("invalid")).toBeNull();
  });
});
