import { createFileRoute } from "@tanstack/react-router";
import { HydrateIdentity } from "@/components/identity/hydrate-identity";
import { AppShell } from "@/components/layout/app-shell";
import { OverviewPage } from "@/components/identity/overview-page";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <HydrateIdentity>
      <AppShell>
        <OverviewPage />
      </AppShell>
    </HydrateIdentity>
  );
}
