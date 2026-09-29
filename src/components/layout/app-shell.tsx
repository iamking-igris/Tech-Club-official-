import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  CreditCard,
  LayoutDashboard,
  Menu,
  QrCode,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useIdentity } from "@/lib/identity";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/members", label: "Members", icon: Users },
  { to: "/cards", label: "Cards", icon: CreditCard },
  { to: "/scanner", label: "Scanner", icon: QrCode },
  { to: "/verification", label: "Verification", icon: ShieldCheck },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const clubName = useIdentity((s) => s.settings.clubName);

  const isActive = (to: string, exact?: boolean) => {
    const path = pathname.replace(/\/$/, "") || "/";
    const target = to.replace(/\/$/, "") || "/";
    if (exact) return path === target;
    return path === target || path.startsWith(target + "/");
  };

  return (
    <div className="flex min-h-dvh bg-bg text-fg">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="font-display text-[15px] font-extrabold tracking-tight">
            <span className="text-primary">TECH</span>{" "}
            <span className="text-navy">CLUB</span>
          </span>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">
            Identity Management
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, "exact" in item ? item.exact : false);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-paper hover:text-fg",
                )}
              >
                <Icon className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border px-4 py-3">
          <p className="truncate text-xs text-subtle">{clubName}</p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="grid size-9 place-items-center rounded-md border border-border text-fg"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-extrabold tracking-tight">
              <span className="text-primary">TECH</span> CLUB
            </p>
            <p className="text-[11px] text-subtle">Identity Management</p>
          </div>
        </header>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-navy/30"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 top-0 flex h-full w-64 flex-col bg-surface shadow-xl">
              <div className="flex h-14 items-center justify-between border-b border-border px-4">
                <span className="font-display text-sm font-extrabold">
                  <span className="text-primary">TECH</span> CLUB
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid size-8 place-items-center rounded-md text-muted"
                >
                  <X className="size-4" />
                </button>
              </div>
              <nav className="flex flex-col gap-0.5 p-2">
                {NAV.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to, "exact" in item ? item.exact : false);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted hover:bg-paper hover:text-fg",
                      )}
                    >
                      <Icon className="size-4" strokeWidth={1.75} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
