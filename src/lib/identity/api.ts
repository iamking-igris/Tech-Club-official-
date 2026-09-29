/**
 * Data access layer — UI talks only to this module.
 * When Supabase is configured, it is the source of truth.
 * Otherwise falls back to the in-memory/localStorage store.
 */
import type {
  ActivityEntry,
  ClubSettings,
  Member,
  MemberInput,
  MemberStatus,
  CardStatus,
} from "./types";
import { DEFAULT_SESSION } from "./types";
import { nextSequentialId, normalizeDisplayId } from "./ids";
import {
  getSupabase,
  isSupabaseConfigured,
  type DbActivity,
  type DbMember,
  type DbSettings,
} from "./supabase";

function fromDb(row: DbMember): Member {
  return {
    uid: row.uid,
    memberId: row.member_id,
    name: row.name,
    role: row.role,
    session: row.session,
    status: row.status,
    cardStatus: row.card_status,
    photo: row.photo,
    email: row.email,
    phone: row.phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    cardIssuedAt: row.card_issued_at,
    lastVerifiedAt: row.last_verified_at,
    archived: row.archived,
  };
}

function activityFromDb(row: DbActivity): ActivityEntry {
  return {
    id: row.id,
    action: row.action as ActivityEntry["action"],
    memberId: row.member_id,
    memberName: row.member_name,
    detail: row.detail ?? undefined,
    timestamp: row.timestamp,
  };
}

export type IdentityBundle = {
  members: Member[];
  activities: ActivityEntry[];
  settings: ClubSettings;
  nextIdCounter: number;
  source: "supabase" | "local";
};

export async function fetchAll(): Promise<IdentityBundle | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const [membersRes, activitiesRes, settingsRes] = await Promise.all([
    sb.from("members").select("*").order("member_id", { ascending: true }),
    sb.from("activities").select("*").order("timestamp", { ascending: false }).limit(500),
    sb.from("club_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  if (membersRes.error) throw new Error(membersRes.error.message);
  if (activitiesRes.error) throw new Error(activitiesRes.error.message);

  const settingsRow = settingsRes.data as DbSettings | null;
  const settings: ClubSettings = {
    clubName: settingsRow?.club_name ?? "Tech Club",
    currentSession: settingsRow?.current_session ?? DEFAULT_SESSION,
    defaultRole: settingsRow?.default_role ?? "Member",
  };

  return {
    members: ((membersRes.data as DbMember[]) ?? []).map(fromDb),
    activities: ((activitiesRes.data as DbActivity[]) ?? []).map(activityFromDb),
    settings,
    nextIdCounter: settingsRow?.next_id_counter ?? 0,
    source: "supabase",
  };
}

export async function createMember(
  input: MemberInput,
  existingIds: string[],
  counter: number,
  defaults: ClubSettings,
): Promise<{ member: Member; nextCounter: number }> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");

  const { memberId, nextCounter } = nextSequentialId(existingIds, counter);
  const ts = new Date().toISOString();
  const row = {
    member_id: memberId,
    name: input.name.trim(),
    role: (input.role || defaults.defaultRole).trim() || "Member",
    session: (input.session || defaults.currentSession).trim() || DEFAULT_SESSION,
    status: (input.status || "active") as MemberStatus,
    card_status: "issued" as CardStatus,
    photo: input.photo ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    created_at: ts,
    updated_at: ts,
    card_issued_at: ts,
    last_verified_at: null,
    archived: false,
  };

  const { data, error } = await sb.from("members").insert(row).select("*").single();
  if (error) throw new Error(error.message);

  await sb.from("club_settings").upsert({
    id: 1,
    next_id_counter: nextCounter,
    club_name: defaults.clubName,
    current_session: defaults.currentSession,
    default_role: defaults.defaultRole,
  });

  const member = fromDb(data as DbMember);
  await insertActivity("member_created", member);
  await insertActivity("card_issued", member);
  return { member, nextCounter };
}

export async function updateMemberDb(
  uid: string,
  patch: Partial<MemberInput & { status?: MemberStatus; cardStatus?: CardStatus }>,
): Promise<Member> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) updates.name = patch.name.trim();
  if (patch.role !== undefined) updates.role = patch.role.trim();
  if (patch.session !== undefined) updates.session = patch.session.trim();
  if (patch.photo !== undefined) updates.photo = patch.photo;
  if (patch.email !== undefined) updates.email = patch.email;
  if (patch.phone !== undefined) updates.phone = patch.phone;
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.cardStatus !== undefined) updates.card_status = patch.cardStatus;

  const { data, error } = await sb
    .from("members")
    .update(updates)
    .eq("uid", uid)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return fromDb(data as DbMember);
}

export async function setMemberFlags(
  uid: string,
  flags: {
    status?: MemberStatus;
    cardStatus?: CardStatus;
    archived?: boolean;
    cardIssuedAt?: string | null;
    lastVerifiedAt?: string | null;
  },
): Promise<Member> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (flags.status !== undefined) updates.status = flags.status;
  if (flags.cardStatus !== undefined) updates.card_status = flags.cardStatus;
  if (flags.archived !== undefined) updates.archived = flags.archived;
  if (flags.cardIssuedAt !== undefined) updates.card_issued_at = flags.cardIssuedAt;
  if (flags.lastVerifiedAt !== undefined) updates.last_verified_at = flags.lastVerifiedAt;

  const { data, error } = await sb
    .from("members")
    .update(updates)
    .eq("uid", uid)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return fromDb(data as DbMember);
}

export async function insertActivity(
  action: string,
  member: Pick<Member, "memberId" | "name">,
  detail?: string,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("activities").insert({
    action,
    member_id: member.memberId,
    member_name: member.name,
    detail: detail ?? null,
    timestamp: new Date().toISOString(),
  });
}

export async function saveSettings(
  settings: ClubSettings,
  nextIdCounter?: number,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const row: Record<string, unknown> = {
    id: 1,
    club_name: settings.clubName,
    current_session: settings.currentSession,
    default_role: settings.defaultRole,
  };
  if (typeof nextIdCounter === "number") row.next_id_counter = nextIdCounter;
  const { error } = await sb.from("club_settings").upsert(row);
  if (error) throw new Error(error.message);
}

export async function bulkCreateMembers(
  rows: MemberInput[],
  existing: Member[],
  counter: number,
  defaults: ClubSettings,
): Promise<{ created: number; skipped: number; nextCounter: number }> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");

  let created = 0;
  let skipped = 0;
  let nextCounter = counter;
  const usedNames = new Set(
    existing.filter((m) => !m.archived).map((m) => m.name.trim().toLowerCase()),
  );
  const usedIds = existing.filter((m) => !m.archived).map((m) => m.memberId);

  for (const row of rows) {
    const name = row.name.trim();
    if (!name || usedNames.has(name.toLowerCase())) {
      skipped++;
      continue;
    }
    const seq = nextSequentialId(usedIds, nextCounter);
    nextCounter = seq.nextCounter;
    usedIds.push(seq.memberId);
    usedNames.add(name.toLowerCase());
    const ts = new Date().toISOString();
    const { data, error } = await sb
      .from("members")
      .insert({
        member_id: seq.memberId,
        name,
        role: (row.role || defaults.defaultRole).trim() || "Member",
        session: (row.session || defaults.currentSession).trim() || DEFAULT_SESSION,
        status: "active",
        card_status: "issued",
        created_at: ts,
        updated_at: ts,
        card_issued_at: ts,
        archived: false,
      })
      .select("*")
      .single();
    if (error) {
      skipped++;
      continue;
    }
    const member = fromDb(data as DbMember);
    await insertActivity("member_created", member, "Bulk import");
    await insertActivity("card_issued", member);
    created++;
  }

  await saveSettings(defaults, nextCounter);
  return { created, skipped, nextCounter };
}

export async function findMemberByDisplayId(raw: string): Promise<Member | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const id = normalizeDisplayId(raw);
  const { data, error } = await sb
    .from("members")
    .select("*")
    .eq("member_id", id)
    .eq("archived", false)
    .maybeSingle();
  if (error || !data) return null;
  return fromDb(data as DbMember);
}

export { isSupabaseConfigured };
