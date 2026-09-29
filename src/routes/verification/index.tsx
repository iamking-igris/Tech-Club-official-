import { createFileRoute } from "@tanstack/react-router";
import { HydrateIdentity } from "@/components/identity/hydrate-identity";
import { AppShell } from "@/components/layout/app-shell";
import { VerificationPage } from "@/components/identity/verification-page";

export const Route = createFileRoute("/verification/")({ component: Page });

function Page() {
  return (
    <HydrateIdentity>
      <AppShell>
        <VerificationPage />
      </AppShell>
    </HydrateIdentity>
  );
}
