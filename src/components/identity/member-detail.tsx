import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Copy,
  Download,
  Printer,
  RefreshCw,
  ShieldOff,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AccessCard } from "@/components/access-card";
import { CardStage } from "@/components/card-stage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ROLES,
  memberVerifyUrl,
  useIdentity,
  type MemberStatus,
} from "@/lib/identity";
import { downloadDataUrl, elementToPng, safeFilePart } from "@/lib/export-card";
import { preloadSignatures } from "@/lib/signatures";
import { useOrigin } from "@/lib/use-origin";
import { MemberStatusBadge, CardStatusBadge } from "./status-badge";

export function MemberDetailPage({ uid }: { uid: string }) {
  const navigate = useNavigate();
  const origin = useOrigin();
  const members = useIdentity((s) => s.members);
  const activitiesAll = useIdentity((s) => s.activities);
  const member = useMemo(() => members.find((m) => m.uid === uid), [members, uid]);
  const updateMember = useIdentity((s) => s.updateMember);
  const reissueCard = useIdentity((s) => s.reissueCard);
  const revokeCard = useIdentity((s) => s.revokeCard);
  const setStatus = useIdentity((s) => s.setStatus);
  const activities = useMemo(
    () => activitiesAll.filter((a) => a.memberId === member?.memberId).slice(0, 12),
    [activitiesAll, member?.memberId],
  );

  const cardRef = useRef<HTMLElement>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [session, setSession] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void preloadSignatures();
  }, []);

  useEffect(() => {
    if (member) {
      setName(member.name);
      setRole(member.role);
      setSession(member.session);
    }
  }, [member]);

  if (!member) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted">Member not found.</p>
        <Button asChild variant="secondary" className="mt-4" size="sm">
          <Link to="/members">Back to members</Link>
        </Button>
      </div>
    );
  }

  const verifyUrl = memberVerifyUrl(origin, member);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    await updateMember(member!.uid, { name, role, session });
    toast.success(`Member ${member!.memberId} updated.`);
    setEditing(false);
  }

  async function onDownload() {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await elementToPng(cardRef.current, 4);
      downloadDataUrl(
        dataUrl,
        `tech-club-${safeFilePart(member!.memberId)}-${safeFilePart(member!.name)}.png`,
      );
      toast.success("Card downloaded");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function onCopyLink() {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      toast.success("Verification link copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted">
          <Link to="/members">
            <ArrowLeft className="size-4" />
            Members
          </Link>
        </Button>
      </div>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-navy">
              {member.name}
            </h1>
            <MemberStatusBadge status={member.status} />
            <CardStatusBadge status={member.cardStatus} />
          </div>
          <p className="mt-1 font-mono text-sm tabular-nums text-muted">
            ID {member.memberId}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await reissueCard(member.uid);
              toast.success(`Card reissued for ${member.memberId}`);
            }}
          >
            <RefreshCw className="size-3.5" />
            Reissue
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              if (confirm("Revoke this card and membership?")) {
                await revokeCard(member.uid);
                toast.message(`Card revoked for ${member.memberId}`);
              }
            }}
          >
            <ShieldOff className="size-3.5" />
            Revoke
          </Button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
        <div className="space-y-6">
          {/* Identity */}
          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Identity
            </h2>
            {editing ? (
              <form onSubmit={onSave} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Session</Label>
                    <Input value={session} onChange={(e) => setSession(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select
                    value={member.status}
                    onChange={(e) => {
                      void setStatus(member.uid, e.target.value as MemberStatus);
                    }}
                    className="flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="revoked">Revoked</option>
                  </select>
                </div>
                <p className="text-xs text-subtle">
                  Member ID <strong className="tabular-nums">{member.memberId}</strong> cannot be
                  changed.
                </p>
                <Button type="submit" size="sm">
                  Save changes
                </Button>
              </form>
            ) : (
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-subtle">Name</dt>
                  <dd className="font-medium">{member.name}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-subtle">Member ID</dt>
                  <dd className="font-mono font-semibold tabular-nums">{member.memberId}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-subtle">Role</dt>
                  <dd>{member.role}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-subtle">Session</dt>
                  <dd>{member.session}</dd>
                </div>
              </dl>
            )}
          </section>

          {/* Activity for this member */}
          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Activity
            </h2>
            {activities.length === 0 ? (
              <p className="text-sm text-muted">No activity recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {activities.map((a) => (
                  <li key={a.id} className="flex justify-between gap-2 text-muted">
                    <span>
                      {a.action.replace(/_/g, " ")}
                      {a.detail ? ` — ${a.detail}` : ""}
                    </span>
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
          </section>
        </div>

        {/* Card column */}
        <div className="space-y-4">
          <CardStage>
            <AccessCard
              ref={cardRef}
              data={{
                name: member.name,
                memberId: member.memberId,
                role: member.role,
                session: member.session,
                verifyUrl,
              }}
            />
          </CardStage>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={onDownload} disabled={exporting}>
              <Download className="size-3.5" />
              {exporting ? "Exporting…" : "Download PNG"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                navigate({
                  to: "/print",
                  search: { ids: member.uid },
                })
              }
            >
              <Printer className="size-3.5" />
              Print
            </Button>
            <Button size="sm" variant="secondary" onClick={onCopyLink}>
              <Copy className="size-3.5" />
              Copy link
            </Button>
          </div>
          <p className="text-center text-[11px] text-subtle">
            Last verified:{" "}
            {member.lastVerifiedAt
              ? new Date(member.lastVerifiedAt).toLocaleString()
              : "Never"}
          </p>
        </div>
      </div>
    </div>
  );
}
