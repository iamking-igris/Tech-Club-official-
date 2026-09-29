import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLES, useIdentity } from "@/lib/identity";

export function SettingsPage() {
  const settings = useIdentity((s) => s.settings);
  const updateSettings = useIdentity((s) => s.updateSettings);
  const [clubName, setClubName] = useState(settings.clubName);
  const [session, setSession] = useState(settings.currentSession);
  const [defaultRole, setDefaultRole] = useState(settings.defaultRole);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    await updateSettings({
      clubName: clubName.trim() || "Tech Club",
      currentSession: session.trim() || "2026 / 2027",
      defaultRole: defaultRole.trim() || "Member",
    });
    toast.success("Settings saved");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-navy">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted">Club defaults for new members and cards</p>
      </header>

      <form
        onSubmit={onSave}
        className="space-y-5 rounded-lg border border-border bg-surface p-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="club">Club name</Label>
          <Input
            id="club"
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="session">Current session</Label>
          <Input
            id="session"
            value={session}
            onChange={(e) => setSession(e.target.value)}
            placeholder="2026 / 2027"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role">Default role</Label>
          <select
            id="role"
            value={defaultRole}
            onChange={(e) => setDefaultRole(e.target.value)}
            className="flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-subtle">
          Signature images are loaded from the card assets. Member IDs are assigned
          sequentially (001, 002, …) and are never reused automatically.
        </p>
        <Button type="submit" size="sm">
          Save settings
        </Button>
      </form>
    </div>
  );
}
