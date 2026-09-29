import { createFileRoute } from "@tanstack/react-router";
import { HydrateIdentity } from "@/components/identity/hydrate-identity";
import { AppShell } from "@/components/layout/app-shell";
import { CardsPage } from "@/components/identity/cards-page";

export const Route = createFileRoute("/cards/")({ component: Page });

function Page() {
  return (
    <HydrateIdentity>
      <AppShell>
        <CardsPage />
      </AppShell>
    </HydrateIdentity>
  );
}
