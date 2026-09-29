/** 3-digit sequential member IDs: 001 … 999 */

const PAD = 3;
const MAX = 999;

/** Format a number as zero-padded member ID */
export function formatMemberId(n: number): string {
  if (n < 1 || n > MAX) throw new Error(`Member ID out of range: ${n}`);
  return String(n).padStart(PAD, "0");
}

/** Parse a display ID back to number (accepts "001", "1", " 12 ") */
export function parseMemberId(raw: string): number | null {
  const cleaned = raw.trim().replace(/^0+/, "") || "0";
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (n < 1 || n > MAX) return null;
  return n;
}

/** Highest numeric ID currently in use (from display IDs) */
export function maxUsedId(ids: string[]): number {
  let max = 0;
  for (const id of ids) {
    const n = parseMemberId(id);
    if (n !== null && n > max) max = n;
  }
  return max;
}

/**
 * Next sequential ID. Never reuses gaps by default.
 * `counter` is the high-water mark stored in the snapshot.
 */
export function nextSequentialId(
  existingIds: string[],
  counter: number,
): { memberId: string; nextCounter: number } {
  const fromExisting = maxUsedId(existingIds);
  const base = Math.max(fromExisting, counter);
  const next = base + 1;
  if (next > MAX) {
    throw new Error("Member ID capacity reached (999)");
  }
  return {
    memberId: formatMemberId(next),
    nextCounter: next,
  };
}

/** Normalize user input / legacy TECH#### IDs to 3-digit form when possible */
export function normalizeDisplayId(raw: string): string {
  const tech = /^TECH(\d+)$/i.exec(raw.trim());
  if (tech) {
    const n = Number(tech[1]);
    if (n >= 1 && n <= MAX) return formatMemberId(n);
  }
  const n = parseMemberId(raw);
  if (n !== null) return formatMemberId(n);
  return raw.trim();
}
