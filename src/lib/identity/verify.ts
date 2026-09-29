import { normalizeDisplayId, parseMemberId } from "./ids";
import { useIdentity } from "./store";
import type { Member, VerificationResult } from "./types";
import { cardVerifyUrl as buildUrl, decodePayload, encodePayload } from "@/lib/payload";

/** Public-safe subset for verification display */
export function publicMember(m: Member) {
  return {
    memberId: m.memberId,
    name: m.name,
    role: m.role,
    session: m.session,
    status: m.status,
  };
}

/**
 * Single source of truth for verification rules.
 * Used by /verify page, Scanner, and any future API.
 */
export function verifyMemberId(rawId: string): VerificationResult {
  const id = normalizeDisplayId(rawId.trim());
  if (!parseMemberId(id)) {
    return {
      ok: false,
      reason: "invalid",
      message: "Invalid member ID format.",
    };
  }

  const member = useIdentity.getState().getByMemberId(id);

  if (!member) {
    return {
      ok: false,
      reason: "not_found",
      message: "No Tech Club member found for this ID.",
    };
  }

  if (member.archived) {
    return {
      ok: false,
      reason: "archived",
      member: publicMember(member),
      message: "This membership record is no longer active.",
    };
  }

  if (member.status === "revoked" || member.cardStatus === "revoked") {
    return {
      ok: false,
      reason: "revoked",
      member: publicMember(member),
      message: "This card is no longer valid.",
    };
  }

  if (member.status === "suspended") {
    return {
      ok: false,
      reason: "suspended",
      member: publicMember(member),
      message: "This membership is currently suspended.",
    };
  }

  // Record successful verification (async — non-blocking)
  void useIdentity.getState().recordVerification(id);

  return {
    ok: true,
    status: "active",
    member: publicMember(member),
    message: "Verified member",
  };
}

/** Verify from a QR payload token or a plain member ID / URL path */
export function verifyFromTokenOrId(raw: string): VerificationResult {
  const value = raw.trim();
  if (!value) {
    return { ok: false, reason: "invalid", message: "Empty verification data." };
  }

  // Full URL?
  try {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const url = new URL(value);
      const p = url.searchParams.get("p");
      if (p) {
        const payload = decodePayload(p);
        if (payload?.i) return verifyMemberId(payload.i);
      }
      // /verify/001 or /verify?id=001
      const pathMatch = url.pathname.match(/\/verify\/?(\d{1,3})?$/);
      if (pathMatch?.[1]) return verifyMemberId(pathMatch[1]);
      const idParam = url.searchParams.get("id");
      if (idParam) return verifyMemberId(idParam);
    }
  } catch {
    // not a URL
  }

  // Encoded payload
  const payload = decodePayload(value);
  if (payload?.i) return verifyMemberId(payload.i);

  // Plain ID or TECH####
  return verifyMemberId(value);
}

/** Build the QR value for a member (verification URL preferred) */
export function memberVerifyUrl(origin: string, member: Pick<Member, "name" | "memberId" | "role" | "session">): string {
  return buildUrl(origin, {
    n: member.name,
    i: member.memberId,
    r: member.role,
    s: member.session,
  });
}

export function memberVerifyToken(member: Pick<Member, "name" | "memberId" | "role" | "session">): string {
  return encodePayload({
    n: member.name,
    i: member.memberId,
    r: member.role,
    s: member.session,
  });
}
