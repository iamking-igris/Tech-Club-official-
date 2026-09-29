import { createFileRoute } from "@tanstack/react-router";
import { HydrateIdentity } from "@/components/identity/hydrate-identity";
import { AppShell } from "@/components/layout/app-shell";
import { MembersPage } from "@/components/identity/members-page";

export const Route = createFileRoute("/members/")({ component: Page });

function Page() {
  return (
    <HydrateIdentity>
      <AppShell>
        <MembersPage />
      </AppShell>
    </HydrateIdentity>
  );
}
