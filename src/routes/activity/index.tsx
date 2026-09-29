import { createFileRoute } from "@tanstack/react-router";
import { HydrateIdentity } from "@/components/identity/hydrate-identity";
import { AppShell } from "@/components/layout/app-shell";
import { ActivityPage } from "@/components/identity/activity-page";

export const Route = createFileRoute("/activity/")({ component: Page });

function Page() {
  return (
    <HydrateIdentity>
      <AppShell>
        <ActivityPage />
      </AppShell>
    </HydrateIdentity>
  );
}
