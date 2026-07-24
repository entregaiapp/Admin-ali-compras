import { describe, expect, it } from "vitest";
import {
  getResumeAlertFromError,
  getResumeAlertFromReadiness,
} from "@/features/printing/utils/printAvailability";
import type { UserPrinterReadiness } from "@/features/printing/types/printing";

const suspendedReadiness: UserPrinterReadiness = {
  assigned: true,
  available: false,
  requires_resume: true,
  operational_status: "suspended_schedule",
  reason: "suspended_schedule",
  printer: {
    id: "printer-1",
    display_name: "Impressora do João",
    device_name: "EPSON-TM20",
  },
  agent: {
    id: "agent-1",
    name: "Caixa 01",
  },
};

describe("printAvailability", () => {
  it("builds the modal details from the readiness preflight", () => {
    expect(getResumeAlertFromReadiness(suspendedReadiness)).toEqual({
      operational_status: "suspended_schedule",
      reason: "suspended_schedule",
      printer: suspendedReadiness.printer,
      agent: suspendedReadiness.agent,
    });
  });

  it("recognizes the structured backend race-condition error", () => {
    const error = {
      response: {
        data: {
          error: {
            code: "PRINT_AGENT_RESUME_REQUIRED",
            details: suspendedReadiness,
          },
        },
      },
    };

    expect(getResumeAlertFromError(error)?.printer?.display_name).toBe(
      "Impressora do João",
    );
  });

  it("does not intercept unrelated printing errors", () => {
    const error = {
      response: {
        data: {
          error: {
            code: "PRINTER_NOT_FOUND",
            details: suspendedReadiness,
          },
        },
      },
    };

    expect(getResumeAlertFromError(error)).toBeNull();
  });

  it("does not show the alert for an available assigned printer", () => {
    expect(
      getResumeAlertFromReadiness({
        ...suspendedReadiness,
        available: true,
        requires_resume: false,
        operational_status: "ready",
        reason: null,
      }),
    ).toBeNull();
  });
});
