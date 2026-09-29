import { Link } from "@tanstack/react-router";
import {
  Archive,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ROLES,
  useIdentity,
  type Member,
  type MemberStatus,
} from "@/lib/identity";
import { MemberStatusBadge, CardStatusBadge } from "./status-badge";
import { cn } from "@/lib/utils";

function parseCsv(text: string, fallbackRole: string, fallbackSession: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0]?.toLowerCase() ?? "";
  const start = header.includes("name") ? 1 : 0;
  const rows: { name: string; role?: string; session?: string }[] = [];
  for (const line of lines.slice(start)) {
    const parts: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        quoted = !quoted;
        continue;
      }
      if (ch === "," && !quoted) {
        parts.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    parts.push(cur.trim());
    const name = parts[0] ?? "";
    if (!name) continue;
    rows.push({
      name,
      role: parts[1] || fallbackRole,
      session: parts[2] || fallbackSession,
    });
  }
  return rows;
}

export function MembersPage() {
  const members = useIdentity((s) => s.members);
  const settings = useIdentity((s) => s.settings);
  const addMember = useIdentity((s) => s.addMember);
  const importMembers = useIdentity((s) => s.importMembers);
  const archiveMember = useIdentity((s) => s.archiveMember);
  const setStatus = useIdentity((s) => s.setStatus);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MemberStatus>("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<
    { name: string; role?: string; session?: string }[]
  >([]);

  // Add form
  const [name, setName] = useState("");
  const [role, setRole] = useState(settings.defaultRole);
  const [session, setSession] = useState(settings.currentSession);
  const [status, setStatusLocal] = useState<MemberStatus>("active");
  const [saving, setSaving] = useState(false);

  const live = useMemo(() => {
    return members
      .filter((m) => (showArchived ? m.archived : !m.archived))
      .filter((m) => {
        if (statusFilter !== "all" && m.status !== statusFilter) return false;
        if (roleFilter !== "all" && m.role !== roleFilter) return false;
        if (!query.trim()) return true;
        const q = query.trim().toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.memberId.includes(q) ||
          m.role.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.memberId.localeCompare(b.memberId));
  }, [members, query, statusFilter, roleFilter, showArchived]);

  function resetAdd() {
    setName("");
    setRole(settings.defaultRole);
    setSession(settings.currentSession);
    setStatusLocal("active");
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Full name is required");
      return;
    }
    setSaving(true);
    try {
      const m = await addMember({
        name: name.trim(),
        role,
        session,
        status,
      });
      toast.success(`Member ${m.memberId} created successfully.`);
      resetAdd();
      setAddOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save member.");
    } finally {
      setSaving(false);
    }
  }

  function onImportPreview() {
    const rows = parseCsv(importText, settings.defaultRole, settings.currentSession);
    setImportPreview(rows);
    if (rows.length === 0) toast.message("No rows found in CSV");
  }

  async function onImportCommit() {
    if (importPreview.length === 0) return;
    const { created, skipped } = await importMembers(importPreview);
    toast.success(
      `Imported ${created} member${created === 1 ? "" : "s"}${
        skipped ? ` (${skipped} skipped)` : ""
      }.`,
    );
    setImportText("");
    setImportPreview([]);
    setImportOpen(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-navy">
            Members
          </h1>
          <p className="mt-1 text-sm text-muted">
            {live.length} shown · Manage identities and card eligibility
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm">
                <Upload className="size-4" />
                Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Bulk import</DialogTitle>
                <DialogDescription>
                  CSV columns: name, role, session. IDs are assigned automatically.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"name,role,session\nBakare Oluwaferanmi Pelumi,Member,2026 / 2027"}
                rows={8}
                className="font-mono text-xs"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={onImportPreview}>
                  Preview
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={importPreview.length === 0}
                  onClick={onImportCommit}
                >
                  Import {importPreview.length || ""} members
                </Button>
              </div>
              {importPreview.length > 0 && (
                <ul className="max-h-40 overflow-auto rounded-md border border-border text-xs">
                  {importPreview.map((r, i) => (
                    <li key={i} className="border-b border-border px-3 py-1.5 last:border-0">
                      {r.name} · {r.role} · {r.session}
                    </li>
                  ))}
                </ul>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" />
                Add member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add member</DialogTitle>
                <DialogDescription>
                  A sequential ID (e.g. 001) is assigned automatically.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={onAdd} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="m-name">Full name</Label>
                  <Input
                    id="m-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Bakare Oluwaferanmi Pelumi"
                    autoFocus
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-role">Role</Label>
                    <select
                      id="m-role"
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
                    <Label htmlFor="m-session">Session</Label>
                    <Input
                      id="m-session"
                      value={session}
                      onChange={(e) => setSession(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-status">Status</Label>
                  <select
                    id="m-status"
                    value={status}
                    onChange={(e) => setStatusLocal(e.target.value as MemberStatus)}
                    className="flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="revoked">Revoked</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setAddOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? "Saving…" : "Create member"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or ID…"
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | MemberStatus)}
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="revoked">Revoked</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
        >
          <option value="all">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-border"
          />
          Archived
        </label>
      </div>

      {live.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold text-navy">No members yet</p>
          <p className="mt-2 text-sm text-muted">
            Add your first Tech Club member to begin issuing identity cards.
          </p>
          <Button className="mt-5" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add member
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-subtle">
                <th className="px-4 py-2.5 font-medium">ID</th>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Session</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Card</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {live.map((m) => (
                <MemberRow
                  key={m.uid}
                  member={m}
                  onArchive={async () => {
                    if (confirm(`Archive member ${m.memberId} ${m.name}?`)) {
                      await archiveMember(m.uid);
                      toast.success(`Member ${m.memberId} archived.`);
                    }
                  }}
                  onSuspend={async () => {
                    await setStatus(m.uid, "suspended");
                    toast.message(`Member ${m.memberId} suspended.`);
                  }}
                  onActivate={async () => {
                    await setStatus(m.uid, "active");
                    toast.success(`Member ${m.memberId} restored to active.`);
                  }}
                  onRevoke={async () => {
                    if (confirm(`Revoke membership for ${m.memberId}?`)) {
                      await setStatus(m.uid, "revoked");
                      toast.message(`Member ${m.memberId} revoked.`);
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member: m,
  onArchive,
  onSuspend,
  onActivate,
  onRevoke,
}: {
  member: Member;
  onArchive: () => void;
  onSuspend: () => void;
  onActivate: () => void;
  onRevoke: () => void;
}) {
  const [menu, setMenu] = useState(false);

  return (
    <tr
      className={cn(
        "border-b border-border last:border-0 hover:bg-paper/60",
        m.archived && "opacity-60",
      )}
    >
      <td className="px-4 py-2.5 font-mono text-xs font-semibold tabular-nums text-navy">
        <Link to="/members/$id" params={{ id: m.uid }} className="hover:text-primary">
          {m.memberId}
        </Link>
      </td>
      <td className="px-4 py-2.5">
        <Link
          to="/members/$id"
          params={{ id: m.uid }}
          className="font-medium text-fg hover:text-primary"
        >
          {m.name}
        </Link>
      </td>
      <td className="px-4 py-2.5 text-muted">{m.role}</td>
      <td className="px-4 py-2.5 text-muted">{m.session}</td>
      <td className="px-4 py-2.5">
        <MemberStatusBadge status={m.status} />
      </td>
      <td className="px-4 py-2.5">
        <CardStatusBadge status={m.cardStatus} />
      </td>
      <td className="relative px-4 py-2.5 text-right">
        <div className="inline-flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
            <Link to="/members/$id" params={{ id: m.uid }}>
              View
            </Link>
          </Button>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-md text-muted hover:bg-paper hover:text-fg"
            onClick={() => setMenu((v) => !v)}
            aria-label="More actions"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>
        {menu && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setMenu(false)}
              aria-label="Close"
            />
            <div className="absolute right-4 top-full z-20 mt-1 w-40 rounded-md border border-border bg-surface py-1 text-left text-sm shadow-lg">
              {m.status !== "active" && (
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left hover:bg-paper"
                  onClick={() => {
                    setMenu(false);
                    onActivate();
                  }}
                >
                  Set active
                </button>
              )}
              {m.status === "active" && (
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left hover:bg-paper"
                  onClick={() => {
                    setMenu(false);
                    onSuspend();
                  }}
                >
                  Suspend
                </button>
              )}
              {m.status !== "revoked" && (
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left hover:bg-paper"
                  onClick={() => {
                    setMenu(false);
                    onRevoke();
                  }}
                >
                  Revoke
                </button>
              )}
              {!m.archived && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-danger hover:bg-paper"
                  onClick={() => {
                    setMenu(false);
                    onArchive();
                  }}
                >
                  <Archive className="size-3.5" />
                  Archive
                </button>
              )}
            </div>
          </>
        )}
      </td>
    </tr>
  );
}
