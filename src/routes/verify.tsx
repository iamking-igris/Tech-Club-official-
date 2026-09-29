import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HydrateIdentity } from "@/components/identity/hydrate-identity";
import { VerifyResultView } from "@/components/identity/verify-result";
import { Button } from "@/components/ui/button";
import {
  verifyFromTokenOrId,
  type VerificationResult,
} from "@/lib/identity";

type VerifySearch = { p?: string; id?: string };

export const Route = createFileRoute("/verify")({
  validateSearch: (search: Record<string, unknown>): VerifySearch => ({
    p: typeof search.p === "string" ? search.p : undefined,
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  component: VerifyRoute,
});

function VerifyRoute() {
  return (
    <HydrateIdentity>
      <VerifyPage />
    </HydrateIdentity>
  );
}

function VerifyPage() {
  const { p, id } = Route.useSearch();
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    const raw = p || id;
    if (!raw) {
      setResult({
        ok: false,
        reason: "invalid",
        message: "The QR code is missing or invalid. Scan a Tech Club access card to try again.",
      });
      return;
    }
    setResult(verifyFromTokenOrId(raw));
  }, [p, id]);

  return (
    <main className="min-h-dvh bg-bg px-4 py-10 text-fg">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6">
        <p className="font-display text-sm font-bold uppercase tracking-[0.22em] text-muted">
          Tech Club verification
        </p>
        {result ? <VerifyResultView result={result} /> : null}
        <Button asChild variant="secondary" size="sm">
          <Link to="/">Open identity system</Link>
        </Button>
      </div>
    </main>
  );
}
