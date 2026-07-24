import type { UserPrinterReadiness } from "@/features/printing/types/printing";

export const PRINT_AGENT_RESUME_REQUIRED_CODE = "PRINT_AGENT_RESUME_REQUIRED";

export type PrintAgentResumeAlert = Pick<
  UserPrinterReadiness,
  "operational_status" | "reason" | "printer" | "agent"
>;

const asResumeAlert = (value: any): PrintAgentResumeAlert | null => {
  if (!value?.printer || !value?.reason) return null;
  if (value.reason !== "inactive" && value.reason !== "suspended_schedule") {
    return null;
  }

  return {
    operational_status: value.operational_status || value.reason,
    reason: value.reason,
    printer: value.printer,
    agent: value.agent || null,
  };
};

export const getResumeAlertFromReadiness = (
  readiness: UserPrinterReadiness,
): PrintAgentResumeAlert | null => {
  if (!readiness?.requires_resume) return null;
  return asResumeAlert(readiness);
};

export const getResumeAlertFromError = (
  error: any,
): PrintAgentResumeAlert | null => {
  const payload = error?.response?.data?.error;
  if (payload?.code !== PRINT_AGENT_RESUME_REQUIRED_CODE) return null;
  return asResumeAlert(payload.details);
};
