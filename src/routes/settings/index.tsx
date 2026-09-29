import { createFileRoute } from "@tanstack/react-router";
import { HydrateIdentity } from "@/components/identity/hydrate-identity";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsPage } from "@/components/identity/settings-page";

export const Route = createFileRoute("/settings/")({ component: Page });

function Page() {
  return (
    <HydrateIdentity>
      <AppShell>
        <SettingsPage />
      </AppShell>
    </HydrateIdentity>
  );
}
