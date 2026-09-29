import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyMemberId, type VerificationResult } from "@/lib/identity";
import { VerifyResultView } from "./verify-result";

export function VerificationPage() {
  const [id, setId] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id.trim()) return;
    setResult(verifyMemberId(id.trim()));
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-navy">
          Verification
        </h1>
        <p className="mt-1 text-sm text-muted">
          Look up a member by ID without scanning
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="mb-8 flex gap-2 rounded-lg border border-border bg-surface p-4"
      >
        <Input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="001"
          className="font-mono tabular-nums"
          inputMode="numeric"
          autoFocus
        />
        <Button type="submit" size="sm">
          Verify
        </Button>
      </form>

      {result && (
        <div className="flex justify-center">
          <VerifyResultView result={result} />
        </div>
      )}
    </div>
  );
}
