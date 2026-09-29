import { cn } from "@/lib/utils";
import type { CardStatus, MemberStatus } from "@/lib/identity";

const memberStyles: Record<MemberStatus, string> = {
  active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  suspended: "bg-amber-50 text-amber-900 ring-amber-200",
  revoked: "bg-red-50 text-red-800 ring-red-200",
};

const cardStyles: Record<CardStatus, string> = {
  none: "bg-paper text-muted ring-border",
  issued: "bg-sky-50 text-sky-900 ring-sky-200",
  reissued: "bg-indigo-50 text-indigo-900 ring-indigo-200",
  revoked: "bg-red-50 text-red-800 ring-red-200",
};

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1",
        memberStyles[status],
      )}
    >
      {status}
    </span>
  );
}

export function CardStatusBadge({ status }: { status: CardStatus }) {
  const label =
    status === "none" ? "No card" : status === "reissued" ? "Reissued" : status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize tracking-wide ring-1",
        cardStyles[status],
      )}
    >
      {label}
    </span>
  );
}
