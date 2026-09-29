/** Tech Club Identity — core types */

export type MemberStatus = "active" | "suspended" | "revoked";
export type CardStatus = "none" | "issued" | "reissued" | "revoked";

export type MemberRole =
  | "Member"
  | "President"
  | "Vice President"
  | "Secretary"
  | "Treasurer"
  | "Public Relations"
  | "Head of Media"
  | "Coordinator"
  | "Mentor"
  | "Head of Club"
  | "General Manager"
  | "Executive";

export const ROLES: MemberRole[] = [
  "Member",
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Public Relations",
  "Head of Media",
  "Coordinator",
  "Mentor",
  "Head of Club",
  "General Manager",
  "Executive",
];

export const DEFAULT_SESSION = "2026 / 2027";

export type Member = {
  /** Internal UUID — never shown to users */
  uid: string;
  /** Human-facing 3-digit ID: "001" … "999" */
  memberId: string;
  name: string;
  role: string;
  session: string;
  status: MemberStatus;
  cardStatus: CardStatus;
  photo?: string | null;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
  cardIssuedAt?: string | null;
  lastVerifiedAt?: string | null;
  archived?: boolean;
};

export type ActivityAction =
  | "member_created"
  | "member_edited"
  | "member_archived"
  | "member_restored"
  | "status_changed"
  | "card_issued"
  | "card_reissued"
  | "card_revoked"
  | "verification";

export type ActivityEntry = {
  id: string;
  action: ActivityAction;
  memberId: string;
  memberName: string;
  detail?: string;
  timestamp: string;
};

export type ClubSettings = {
  clubName: string;
  currentSession: string;
  defaultRole: string;
};

export type IdentitySnapshot = {
  members: Member[];
  activities: ActivityEntry[];
  settings: ClubSettings;
  nextIdCounter: number;
};

export type VerificationResult =
  | {
      ok: true;
      status: "active";
      member: Pick<Member, "memberId" | "name" | "role" | "session" | "status">;
      message: string;
    }
  | {
      ok: false;
      reason: "not_found" | "suspended" | "revoked" | "invalid" | "archived";
      member?: Pick<Member, "memberId" | "name" | "role" | "session" | "status">;
      message: string;
    };

export type MemberInput = {
  name: string;
  role?: string;
  session?: string;
  status?: MemberStatus;
  photo?: string | null;
  email?: string | null;
  phone?: string | null;
};
