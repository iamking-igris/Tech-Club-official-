import { useEffect, useState, type ReactNode } from "react";
import { bindIdentityPersistence, useIdentity } from "@/lib/identity";

export function HydrateIdentity({ children }: { children: ReactNode }) {
  const ready = useIdentity((s) => s.ready);
  const source = useIdentity((s) => s.source);
  const error = useIdentity((s) => s.error);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    void (async () => {
      unsub = await bindIdentityPersistence();
      setMounted(true);
    })();
    return () => unsub?.();
  }, []);

  if (!mounted || !ready) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg text-fg">
        <div className="flex flex-col items-center gap-3">
          <span className="font-display text-2xl font-extrabold tracking-tight">
            <span className="text-primary">TECH</span> CLUB
          </span>
          <p className="text-sm text-muted">Loading identity system…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
          Database: {error} — using local data until connection works.
        </div>
      )}
      {source === "supabase" && (
        <div className="sr-only" aria-live="polite">
          Connected to Supabase
        </div>
      )}
      {children}
    </>
  );
}
