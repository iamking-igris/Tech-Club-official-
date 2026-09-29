import { AlertTriangle, ShieldCheck, ShieldX, UserX } from "lucide-react";
import type { VerificationResult } from "@/lib/identity";
import { cn } from "@/lib/utils";

export function VerifyResultView({ result }: { result: VerificationResult }) {
  if (result.ok) {
    const m = result.member;
    return (
      <div className="w-full max-w-md rounded-xl border border-emerald-200 bg-emerald-50/80 p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <ShieldCheck className="size-7" strokeWidth={1.75} />
        </div>
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
          Verified Member
        </p>
        <h2 className="mt-2 font-display text-xl font-bold text-navy">{m.name}</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-left text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-subtle">ID</dt>
            <dd className="font-semibold tabular-nums text-fg">{m.memberId}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-subtle">Role</dt>
            <dd className="font-semibold text-fg">{m.role}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-subtle">Session</dt>
            <dd className="font-semibold text-fg">{m.session}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-subtle">Status</dt>
            <dd className="font-semibold uppercase text-emerald-700">{m.status}</dd>
          </div>
        </dl>
      </div>
    );
  }

  const isSuspended = result.reason === "suspended";
  const isRevoked = result.reason === "revoked";
  const Icon = isSuspended ? AlertTriangle : isRevoked ? UserX : ShieldX;
  const tone = isSuspended
    ? "border-amber-200 bg-amber-50/80 text-amber-900"
    : "border-red-200 bg-red-50/80 text-red-900";
  const iconTone = isSuspended ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  const title = isSuspended
    ? "Membership Suspended"
    : isRevoked
      ? "Card Revoked"
      : result.reason === "not_found"
        ? "Member Not Found"
        : "Invalid Card";

  return (
    <div className={cn("w-full max-w-md rounded-xl border p-6 text-center shadow-sm", tone)}>
      <div className={cn("mx-auto mb-4 grid size-14 place-items-center rounded-full", iconTone)}>
        <Icon className="size-7" strokeWidth={1.75} />
      </div>
      <p className="font-display text-xs font-bold uppercase tracking-[0.2em]">{title}</p>
      {result.member && (
        <h2 className="mt-2 font-display text-lg font-bold text-navy">{result.member.name}</h2>
      )}
      <p className="mt-3 text-sm opacity-90">{result.message}</p>
      {result.member && (
        <p className="mt-2 font-mono text-sm tabular-nums opacity-70">ID {result.member.memberId}</p>
      )}
    </div>
  );
}
