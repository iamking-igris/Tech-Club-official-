import { createFileRoute } from "@tanstack/react-router";
import { HydrateIdentity } from "@/components/identity/hydrate-identity";
import { AppShell } from "@/components/layout/app-shell";
import { ScannerPage } from "@/components/identity/scanner-page";

export const Route = createFileRoute("/scanner/")({ component: Page });

function Page() {
  return (
    <HydrateIdentity>
      <AppShell>
        <ScannerPage />
      </AppShell>
    </HydrateIdentity>
  );
}
