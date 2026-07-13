import type { ReactNode } from "react";
import { SystemToastHost } from "@/shared/components/SystemToast";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <>
      {children}
      <SystemToastHost />
    </>
  );
}
