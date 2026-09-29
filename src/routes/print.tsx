import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { HydrateIdentity } from "@/components/identity/hydrate-identity";
import { chunkMembers, PrintSheet } from "@/components/print-sheet";
import { Button } from "@/components/ui/button";
import { useIdentity } from "@/lib/identity";
import { downloadDataUrl, elementToPng, safeFilePart } from "@/lib/export-card";
import { preloadSignatures } from "@/lib/signatures";
import { useOrigin } from "@/lib/use-origin";

type PrintSearch = { ids?: string };

export const Route = createFileRoute("/print")({
  validateSearch: (s: Record<string, unknown>): PrintSearch => ({
    ids: typeof s.ids === "string" ? s.ids : undefined,
  }),
  component: PrintRoute,
});

function PrintRoute() {
  return (
    <HydrateIdentity>
      <PrintStudio />
    </HydrateIdentity>
  );
}

function PrintStudio() {
  const origin = useOrigin();
  const { ids } = Route.useSearch();
  const membersAll = useIdentity((s) => s.members);
  const all = useMemo(
    () => membersAll.filter((m) => !m.archived),
    [membersAll],
  );
  const members = useMemo(() => {
    if (!ids) return all;
    const set = new Set(ids.split(",").map((x) => x.trim()).filter(Boolean));
    return all.filter((m) => set.has(m.uid) || set.has(m.memberId));
  }, [all, ids]);
  const pages = chunkMembers(members);
  const sheetRefs = useRef<Array<HTMLElement | null>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void preloadSignatures();
  }, []);

  async function downloadSheets() {
    if (members.length === 0) {
      toast.error("Add cards before exporting sheets.");
      return;
    }
    setSaving(true);
    try {
      for (let i = 0; i < pages.length; i++) {
        const el = sheetRefs.current[i];
        if (!el) continue;
        const png = await elementToPng(el, 2);
        downloadDataUrl(png, `tech-club-a4-${safeFilePart(String(i + 1))}.png`);
      }
      toast.success("A4 sheet PNGs saved.");
    } catch {
      toast.error("Could not export the sheets.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="print-app">
      <div className="print-toolbar">
        <div className="flex items-center gap-3">
          <Button asChild variant="secondary" size="sm">
            <Link to="/members">
              <ArrowLeft />
              Members
            </Link>
          </Button>
          <div>
            <p className="text-sm font-semibold text-navy">A4 print layout</p>
            <p className="text-xs text-muted">
              {members.length} {members.length === 1 ? "card" : "cards"} · {pages.length}{" "}
              {pages.length === 1 ? "page" : "pages"} · 10 per sheet
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void downloadSheets()} disabled={saving} size="sm">
            <Download />
            {saving ? "Exporting…" : "Download PNG"}
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer />
            Print
          </Button>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="grid min-h-[50vh] place-items-center px-4">
          <div className="text-center">
            <p className="font-medium text-navy">No cards to print</p>
            <Button asChild variant="secondary" className="mt-4" size="sm">
              <Link to="/members">Back to members</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="print-stage">
          {pages.map((pageMembers, i) => (
            <PrintSheet
              key={`sheet-${i}`}
              ref={(node) => {
                sheetRefs.current[i] = node;
              }}
              members={pageMembers}
              origin={origin}
              pageNumber={i + 1}
              pageCount={pages.length}
            />
          ))}
        </div>
      )}
    </div>
  );
}
