import { createFileRoute } from "@tanstack/react-router";
import { HydrateIdentity } from "@/components/identity/hydrate-identity";
import { AppShell } from "@/components/layout/app-shell";
import { MemberDetailPage } from "@/components/identity/member-detail";

export const Route = createFileRoute("/members/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  return (
    <HydrateIdentity>
      <AppShell>
        <MemberDetailPage uid={id} />
      </AppShell>
    </HydrateIdentity>
  );
}
