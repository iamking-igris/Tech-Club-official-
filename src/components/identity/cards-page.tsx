import { Link } from "@tanstack/react-router";
import { Copy, Download, Eye, Printer, RefreshCw } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AccessCard } from "@/components/access-card";
import { Button } from "@/components/ui/button";
import { memberVerifyUrl, useIdentity } from "@/lib/identity";
import { downloadDataUrl, elementToPng, safeFilePart } from "@/lib/export-card";
import { useOrigin } from "@/lib/use-origin";
import { CardStatusBadge, MemberStatusBadge } from "./status-badge";
import { CardStage } from "@/components/card-stage";

export function CardsPage() {
  const members = useIdentity((s) => s.members);
  const reissueCard = useIdentity((s) => s.reissueCard);
  const origin = useOrigin();
  const activeMembers = useMemo(
    () => members.filter((m) => !m.archived),
    [members],
  );
  const [previewUid, setPreviewUid] = useState<string | null>(
    activeMembers[0]?.uid ?? null,
  );
  const cardRef = useRef<HTMLElement>(null);
  const [exporting, setExporting] = useState(false);

  const sorted = useMemo(
    () => [...activeMembers].sort((a, b) => a.memberId.localeCompare(b.memberId)),
    [activeMembers],
  );
  const preview = sorted.find((m) => m.uid === previewUid) ?? sorted[0];

  async function downloadOne(uid: string) {
    const m = members.find((x) => x.uid === uid);
    if (!m || !cardRef.current) return;
    setPreviewUid(uid);
    // wait a tick for re-render
    await new Promise((r) => setTimeout(r, 50));
    setExporting(true);
    try {
      const dataUrl = await elementToPng(cardRef.current, 4);
      downloadDataUrl(
        dataUrl,
        `tech-club-${safeFilePart(m.memberId)}-${safeFilePart(m.name)}.png`,
      );
      toast.success(`Downloaded card ${m.memberId}`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  if (sorted.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="font-display text-lg font-semibold text-navy">No cards yet</p>
        <p className="mt-2 text-sm text-muted">
          Add members to issue Tech Club identity cards.
        </p>
        <Button asChild className="mt-5" size="sm">
          <Link to="/members">Go to Members</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-navy">Cards</h1>
        <p className="mt-1 text-sm text-muted">
          Issued membership cards · {sorted.length} total
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-subtle">
                <th className="px-4 py-2.5 font-medium">ID</th>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Member</th>
                <th className="px-4 py-2.5 font-medium">Card</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => (
                <tr
                  key={m.uid}
                  className={`border-b border-border last:border-0 hover:bg-paper/60 ${
                    preview?.uid === m.uid ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="px-4 py-2 font-mono text-xs font-semibold tabular-nums">
                    {m.memberId}
                  </td>
                  <td className="px-4 py-2 font-medium">{m.name}</td>
                  <td className="px-4 py-2">
                    <MemberStatusBadge status={m.status} />
                  </td>
                  <td className="px-4 py-2">
                    <CardStatusBadge status={m.cardStatus} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title="Preview"
                        className="grid size-8 place-items-center rounded-md text-muted hover:bg-paper hover:text-fg"
                        onClick={() => setPreviewUid(m.uid)}
                      >
                        <Eye className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Download"
                        className="grid size-8 place-items-center rounded-md text-muted hover:bg-paper hover:text-fg"
                        onClick={() => void downloadOne(m.uid)}
                        disabled={exporting}
                      >
                        <Download className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Reissue"
                        className="grid size-8 place-items-center rounded-md text-muted hover:bg-paper hover:text-fg"
                        onClick={async () => {
                          await reissueCard(m.uid);
                          toast.success(`Reissued ${m.memberId}`);
                        }}
                      >
                        <RefreshCw className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Copy verification link"
                        className="grid size-8 place-items-center rounded-md text-muted hover:bg-paper hover:text-fg"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              memberVerifyUrl(origin, m),
                            );
                            toast.success("Link copied");
                          } catch {
                            toast.error("Copy failed");
                          }
                        }}
                      >
                        <Copy className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {preview && (
          <div className="space-y-3">
            <CardStage>
              <AccessCard
                ref={cardRef}
                data={{
                  name: preview.name,
                  memberId: preview.memberId,
                  role: preview.role,
                  session: preview.session,
                  verifyUrl: memberVerifyUrl(origin, preview),
                }}
              />
            </CardStage>
            <div className="flex justify-center gap-2">
              <Button asChild size="sm" variant="secondary">
                <Link to="/members/$id" params={{ id: preview.uid }}>
                  Open member
                </Link>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  window.open(
                    `/print?ids=${encodeURIComponent(preview.uid)}`,
                    "_blank",
                  )
                }
              >
                <Printer className="size-3.5" />
                Print
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
