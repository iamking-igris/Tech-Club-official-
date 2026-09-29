import { useIdentity, type ActivityAction } from "@/lib/identity";

const LABELS: Record<ActivityAction, string> = {
  member_created: "Member added",
  member_edited: "Member updated",
  member_archived: "Member archived",
  member_restored: "Member restored",
  status_changed: "Status changed",
  card_issued: "Card issued",
  card_reissued: "Card reissued",
  card_revoked: "Card revoked",
  verification: "Verified",
};

export function ActivityPage() {
  const activities = useIdentity((s) => s.activities);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-navy">
          Activity
        </h1>
        <p className="mt-1 text-sm text-muted">Recent identity and card events</p>
      </header>

      {activities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold text-navy">No activity yet</p>
          <p className="mt-2 text-sm text-muted">
            Creating members, issuing cards, and verifications will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {activities.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-4 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg">{LABELS[a.action]}</p>
                <p className="mt-0.5 text-sm text-muted">
                  <span className="font-mono tabular-nums">{a.memberId}</span>
                  {" · "}
                  {a.memberName}
                  {a.detail ? (
                    <span className="text-subtle"> — {a.detail}</span>
                  ) : null}
                </p>
              </div>
              <time className="shrink-0 text-xs tabular-nums text-subtle">
                {new Date(a.timestamp).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
