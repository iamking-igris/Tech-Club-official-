import { Link } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { useMemo } from "react";
import { useIdentity, type ActivityAction } from "@/lib/identity";
import { Button } from "@/components/ui/button";

const ACTION_LABEL: Record<ActivityAction, string> = {
  member_created: "was added",
  member_edited: "was updated",
  member_archived: "was archived",
  member_restored: "was restored",
  status_changed: "status changed",
  card_issued: "card issued",
  card_reissued: "card reissued",
  card_revoked: "card revoked",
  verification: "was verified",
};

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function OverviewPage() {
  const members = useIdentity((s) => s.members);
  const activities = useIdentity((s) => s.activities);
  const session = useIdentity((s) => s.settings.currentSession);

  const stats = useMemo(() => {
    const live = members.filter((m) => !m.archived);
    return {
      total: live.length,
      active: live.filter((m) => m.status === "active").length,
      suspended: live.filter((m) => m.status === "suspended").length,
      revoked: live.filter((m) => m.status === "revoked").length,
      cards: live.filter((m) => m.cardStatus === "issued" || m.cardStatus === "reissued").length,
    };
  }, [members]);

  const recent = activities.slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-navy">Overview</h1>
          <p className="mt-1 text-sm text-muted">
            Session <span className="font-medium text-fg">{session}</span>
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/members">
            <Plus className="size-4" />
            Add member
          </Link>
        </Button>
      </header>

      {/* Restrained stats */}
      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total", value: stats.total },
          { label: "Active", value: stats.active },
          { label: "Suspended", value: stats.suspended },
          { label: "Revoked", value: stats.revoked },
          { label: "Cards issued", value: stats.cards },
          { label: "Session", value: session, text: true },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border bg-surface px-3 py-3"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">
              {s.label}
            </p>
            <p
              className={
                s.text
                  ? "mt-1 text-sm font-semibold text-fg"
                  : "mt-1 font-display text-2xl font-bold tabular-nums text-navy"
              }
            >
              {s.value}
            </p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-muted">
            Recent activity
          </h2>
          <Link
            to="/activity"
            className="text-xs font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center">
            <Users className="mx-auto size-8 text-subtle" strokeWidth={1.25} />
            <p className="mt-3 text-sm text-muted">No activity yet</p>
            <p className="mt-1 text-xs text-subtle">
              Actions on members and cards will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {recent.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-fg">
                    <span className="font-semibold tabular-nums">{a.memberId}</span>
                    {" · "}
                    <span className="font-medium">{a.memberName}</span>
                    {" "}
                    <span className="text-muted">{ACTION_LABEL[a.action]}</span>
                    {a.detail ? (
                      <span className="text-subtle"> — {a.detail}</span>
                    ) : null}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-subtle tabular-nums">
                  {formatTime(a.timestamp)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
