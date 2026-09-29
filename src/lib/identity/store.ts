import { create } from "zustand";
import { uid } from "@/lib/utils";
import {
  formatMemberId,
  maxUsedId,
  nextSequentialId,
  normalizeDisplayId,
  parseMemberId,
} from "./ids";
import type {
  ActivityAction,
  ActivityEntry,
  ClubSettings,
  IdentitySnapshot,
  Member,
  MemberInput,
  MemberStatus,
  CardStatus,
} from "./types";
import { DEFAULT_SESSION, ROLES } from "./types";
import * as api from "./api";
import { isSupabaseConfigured } from "./supabase";

const STORAGE_KEY = "tech-club-identity-v2";

const defaultSettings: ClubSettings = {
  clubName: "Tech Club",
  currentSession: DEFAULT_SESSION,
  defaultRole: "Member",
};

function now() {
  return new Date().toISOString();
}

function makeActivity(
  action: ActivityAction,
  member: Pick<Member, "memberId" | "name">,
  detail?: string,
): ActivityEntry {
  return {
    id: uid(),
    action,
    memberId: member.memberId,
    memberName: member.name,
    detail,
    timestamp: now(),
  };
}

function migrateLegacyMember(raw: Record<string, unknown>, index: number): Member {
  const legacyId = String(raw.memberId ?? "");
  let memberId = normalizeDisplayId(legacyId);
  if (!parseMemberId(memberId)) {
    memberId = formatMemberId(index + 1);
  }
  const ts = now();
  return {
    uid: String(raw.uid ?? uid()),
    memberId,
    name: String(raw.name ?? "Unknown"),
    role: String(raw.role ?? "Member"),
    session: String(raw.session ?? DEFAULT_SESSION),
    status: (raw.status as MemberStatus) || "active",
    cardStatus: (raw.cardStatus as CardStatus) || "issued",
    photo: (raw.photo as string) ?? null,
    email: (raw.email as string) ?? null,
    phone: (raw.phone as string) ?? null,
    createdAt: String(raw.createdAt ?? ts),
    updatedAt: String(raw.updatedAt ?? ts),
    cardIssuedAt: (raw.cardIssuedAt as string) ?? ts,
    lastVerifiedAt: (raw.lastVerifiedAt as string) ?? null,
    archived: Boolean(raw.archived),
  };
}

type IdentityState = {
  members: Member[];
  activities: ActivityEntry[];
  settings: ClubSettings;
  nextIdCounter: number;
  ready: boolean;
  source: "supabase" | "local" | "loading";
  error: string | null;

  refresh: () => Promise<void>;
  addMember: (input: MemberInput) => Promise<Member>;
  updateMember: (
    memberUid: string,
    patch: Partial<MemberInput & { status?: MemberStatus }>,
  ) => Promise<void>;
  setStatus: (memberUid: string, status: MemberStatus) => Promise<void>;
  archiveMember: (memberUid: string) => Promise<void>;
  restoreMember: (memberUid: string) => Promise<void>;
  issueCard: (memberUid: string) => Promise<void>;
  reissueCard: (memberUid: string) => Promise<void>;
  revokeCard: (memberUid: string) => Promise<void>;
  recordVerification: (memberId: string) => Promise<void>;
  importMembers: (rows: MemberInput[]) => Promise<{ created: number; skipped: number }>;
  updateSettings: (patch: Partial<ClubSettings>) => Promise<void>;

  getByUid: (id: string) => Member | undefined;
  getByMemberId: (memberId: string) => Member | undefined;
  activeMembers: () => Member[];

  hydrate: (snap: IdentitySnapshot & { source?: "supabase" | "local" }) => void;
  setReady: (v: boolean) => void;
};

export const useIdentity = create<IdentityState>((set, get) => ({
  members: [],
  activities: [],
  settings: { ...defaultSettings },
  nextIdCounter: 0,
  ready: false,
  source: "loading",
  error: null,

  refresh: async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const bundle = await api.fetchAll();
      if (!bundle) return;
      set({
        members: bundle.members,
        activities: bundle.activities,
        settings: bundle.settings,
        nextIdCounter: bundle.nextIdCounter,
        source: "supabase",
        error: null,
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to load from Supabase" });
    }
  },

  addMember: async (input) => {
    const state = get();
    if (state.source === "supabase") {
      const active = state.members.filter((m) => !m.archived);
      const { member, nextCounter } = await api.createMember(
        input,
        active.map((m) => m.memberId),
        state.nextIdCounter,
        state.settings,
      );
      await get().refresh();
      set({ nextIdCounter: nextCounter });
      return member;
    }
    const active = state.members.filter((m) => !m.archived);
    const { memberId, nextCounter } = nextSequentialId(
      active.map((m) => m.memberId),
      state.nextIdCounter,
    );
    const ts = now();
    const member: Member = {
      uid: uid(),
      memberId,
      name: input.name.trim(),
      role: (input.role || state.settings.defaultRole).trim() || "Member",
      session: (input.session || state.settings.currentSession).trim() || DEFAULT_SESSION,
      status: input.status || "active",
      cardStatus: "issued",
      photo: input.photo ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      createdAt: ts,
      updatedAt: ts,
      cardIssuedAt: ts,
      lastVerifiedAt: null,
      archived: false,
    };
    set({
      members: [...state.members, member],
      activities: [
        makeActivity("card_issued", member),
        makeActivity("member_created", member),
        ...state.activities,
      ].slice(0, 500),
      nextIdCounter: nextCounter,
    });
    return member;
  },

  updateMember: async (memberUid, patch) => {
    const state = get();
    const prev = state.members.find((m) => m.uid === memberUid);
    if (!prev || prev.archived) return;
    if (state.source === "supabase") {
      const updated = await api.updateMemberDb(memberUid, patch);
      await api.insertActivity("member_edited", updated);
      await get().refresh();
      return;
    }
    const updated: Member = {
      ...prev,
      name: patch.name !== undefined ? patch.name.trim() : prev.name,
      role: patch.role !== undefined ? patch.role.trim() : prev.role,
      session: patch.session !== undefined ? patch.session.trim() : prev.session,
      photo: patch.photo !== undefined ? patch.photo : prev.photo,
      email: patch.email !== undefined ? patch.email : prev.email,
      phone: patch.phone !== undefined ? patch.phone : prev.phone,
      status: patch.status !== undefined ? patch.status : prev.status,
      updatedAt: now(),
    };
    set({
      members: state.members.map((m) => (m.uid === memberUid ? updated : m)),
      activities: [makeActivity("member_edited", updated), ...state.activities].slice(0, 500),
    });
  },

  setStatus: async (memberUid, status) => {
    const state = get();
    const prev = state.members.find((m) => m.uid === memberUid);
    if (!prev || prev.archived) return;
    if (state.source === "supabase") {
      const flags: { status: MemberStatus; cardStatus?: CardStatus } = { status };
      if (status === "revoked") flags.cardStatus = "revoked";
      const updated = await api.setMemberFlags(memberUid, flags);
      await api.insertActivity(
        status === "active" ? "member_restored" : "status_changed",
        updated,
        `Status → ${status}`,
      );
      await get().refresh();
      return;
    }
    const updated: Member = { ...prev, status, updatedAt: now() };
    if (status === "revoked") updated.cardStatus = "revoked";
    set({
      members: state.members.map((m) => (m.uid === memberUid ? updated : m)),
      activities: [
        makeActivity(
          status === "active" ? "member_restored" : "status_changed",
          updated,
          `Status → ${status}`,
        ),
        ...state.activities,
      ].slice(0, 500),
    });
  },

  archiveMember: async (memberUid) => {
    const state = get();
    const prev = state.members.find((m) => m.uid === memberUid);
    if (!prev) return;
    if (state.source === "supabase") {
      const updated = await api.setMemberFlags(memberUid, { archived: true });
      await api.insertActivity("member_archived", updated);
      await get().refresh();
      return;
    }
    const updated = { ...prev, archived: true, updatedAt: now() };
    set({
      members: state.members.map((m) => (m.uid === memberUid ? updated : m)),
      activities: [makeActivity("member_archived", updated), ...state.activities].slice(0, 500),
    });
  },

  restoreMember: async (memberUid) => {
    const state = get();
    const prev = state.members.find((m) => m.uid === memberUid);
    if (!prev) return;
    if (state.source === "supabase") {
      const updated = await api.setMemberFlags(memberUid, { archived: false, status: "active" });
      await api.insertActivity("member_restored", updated);
      await get().refresh();
      return;
    }
    const updated = { ...prev, archived: false, status: "active" as const, updatedAt: now() };
    set({
      members: state.members.map((m) => (m.uid === memberUid ? updated : m)),
      activities: [makeActivity("member_restored", updated), ...state.activities].slice(0, 500),
    });
  },

  issueCard: async (memberUid) => {
    const state = get();
    const prev = state.members.find((m) => m.uid === memberUid);
    if (!prev || prev.archived) return;
    const ts = now();
    if (state.source === "supabase") {
      const updated = await api.setMemberFlags(memberUid, { cardStatus: "issued", cardIssuedAt: ts });
      await api.insertActivity("card_issued", updated);
      await get().refresh();
      return;
    }
    const updated: Member = { ...prev, cardStatus: "issued", cardIssuedAt: ts, updatedAt: ts };
    set({
      members: state.members.map((m) => (m.uid === memberUid ? updated : m)),
      activities: [makeActivity("card_issued", updated), ...state.activities].slice(0, 500),
    });
  },

  reissueCard: async (memberUid) => {
    const state = get();
    const prev = state.members.find((m) => m.uid === memberUid);
    if (!prev || prev.archived) return;
    const ts = now();
    if (state.source === "supabase") {
      const updated = await api.setMemberFlags(memberUid, { cardStatus: "reissued", cardIssuedAt: ts });
      await api.insertActivity("card_reissued", updated);
      await get().refresh();
      return;
    }
    const updated: Member = { ...prev, cardStatus: "reissued", cardIssuedAt: ts, updatedAt: ts };
    set({
      members: state.members.map((m) => (m.uid === memberUid ? updated : m)),
      activities: [makeActivity("card_reissued", updated), ...state.activities].slice(0, 500),
    });
  },

  revokeCard: async (memberUid) => {
    const state = get();
    const prev = state.members.find((m) => m.uid === memberUid);
    if (!prev || prev.archived) return;
    if (state.source === "supabase") {
      const updated = await api.setMemberFlags(memberUid, {
        cardStatus: "revoked",
        status: prev.status === "active" ? "revoked" : prev.status,
      });
      await api.insertActivity("card_revoked", updated);
      await get().refresh();
      return;
    }
    const updated: Member = {
      ...prev,
      cardStatus: "revoked",
      status: prev.status === "active" ? "revoked" : prev.status,
      updatedAt: now(),
    };
    set({
      members: state.members.map((m) => (m.uid === memberUid ? updated : m)),
      activities: [makeActivity("card_revoked", updated), ...state.activities].slice(0, 500),
    });
  },

  recordVerification: async (displayId) => {
    const state = get();
    const id = normalizeDisplayId(displayId);
    const prev = state.members.find((m) => !m.archived && m.memberId === id);
    if (!prev) return;
    if (state.source === "supabase") {
      await api.setMemberFlags(prev.uid, { lastVerifiedAt: now() });
      await api.insertActivity("verification", prev);
      await get().refresh();
      return;
    }
    const updated = { ...prev, lastVerifiedAt: now(), updatedAt: now() };
    set({
      members: state.members.map((m) => (m.uid === prev.uid ? updated : m)),
      activities: [makeActivity("verification", updated), ...state.activities].slice(0, 500),
    });
  },

  importMembers: async (rows) => {
    const state = get();
    if (state.source === "supabase") {
      const result = await api.bulkCreateMembers(rows, state.members, state.nextIdCounter, state.settings);
      await get().refresh();
      set({ nextIdCounter: result.nextCounter });
      return { created: result.created, skipped: result.skipped };
    }
    let created = 0;
    let skipped = 0;
    let members = [...state.members];
    let activities = [...state.activities];
    let counter = state.nextIdCounter;
    const existingNames = new Set(members.filter((m) => !m.archived).map((m) => m.name.trim().toLowerCase()));
    for (const row of rows) {
      const name = row.name.trim();
      if (!name || existingNames.has(name.toLowerCase())) { skipped++; continue; }
      const activeIds = members.filter((m) => !m.archived).map((m) => m.memberId);
      const { memberId, nextCounter } = nextSequentialId(activeIds, counter);
      counter = nextCounter;
      const ts = now();
      const member: Member = {
        uid: uid(), memberId, name,
        role: (row.role || state.settings.defaultRole).trim() || "Member",
        session: (row.session || state.settings.currentSession).trim() || DEFAULT_SESSION,
        status: row.status || "active", cardStatus: "issued",
        photo: row.photo ?? null, email: row.email ?? null, phone: row.phone ?? null,
        createdAt: ts, updatedAt: ts, cardIssuedAt: ts, lastVerifiedAt: null, archived: false,
      };
      members.push(member);
      existingNames.add(name.toLowerCase());
      activities = [makeActivity("card_issued", member), makeActivity("member_created", member, "Bulk import"), ...activities];
      created++;
    }
    set({ members, activities: activities.slice(0, 500), nextIdCounter: counter });
    return { created, skipped };
  },

  updateSettings: async (patch) => {
    const next = { ...get().settings, ...patch };
    if (get().source === "supabase") {
      await api.saveSettings(next);
      set({ settings: next });
      return;
    }
    set({ settings: next });
  },

  getByUid: (id) => get().members.find((m) => m.uid === id),
  getByMemberId: (displayId) => {
    const id = normalizeDisplayId(displayId);
    return get().members.find((m) => !m.archived && m.memberId === id);
  },
  activeMembers: () => get().members.filter((m) => !m.archived),

  hydrate: (snap) => {
    set({
      members: snap.members,
      activities: snap.activities,
      settings: { ...defaultSettings, ...snap.settings },
      nextIdCounter: snap.nextIdCounter,
      source: snap.source ?? "local",
    });
  },
  setReady: (v) => set({ ready: v }),
}));

export function snapshotOf(state: IdentityState): IdentitySnapshot {
  return {
    members: state.members,
    activities: state.activities,
    settings: state.settings,
    nextIdCounter: state.nextIdCounter,
  };
}

function isMember(v: unknown): v is Member {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  return typeof m.uid === "string" && typeof m.name === "string" && typeof m.memberId === "string";
}

const SEED: Member = {
  uid: "seed-bakare",
  memberId: "001",
  name: "Bakare Oluwaferanmi Pelumi",
  role: "Member",
  session: DEFAULT_SESSION,
  status: "active",
  cardStatus: "issued",
  photo: null, email: null, phone: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  cardIssuedAt: new Date().toISOString(),
  lastVerifiedAt: null,
  archived: false,
};

function loadLocal() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<IdentitySnapshot>;
      if (Array.isArray(parsed.members) && parsed.members.every(isMember)) {
        const counter = typeof parsed.nextIdCounter === "number" ? parsed.nextIdCounter : maxUsedId(parsed.members.map((m) => m.memberId));
        useIdentity.getState().hydrate({
          members: parsed.members,
          activities: Array.isArray(parsed.activities) ? parsed.activities : [],
          settings: { ...defaultSettings, ...(parsed.settings || {}) },
          nextIdCounter: counter,
          source: "local",
        });
        return;
      }
    }
    const legacy = window.localStorage.getItem("tech-club-cards-v1");
    if (legacy) {
      const parsed = JSON.parse(legacy) as { members?: Record<string, unknown>[] };
      if (Array.isArray(parsed.members) && parsed.members.length > 0) {
        const members = parsed.members.map((m, i) => migrateLegacyMember(m, i));
        useIdentity.getState().hydrate({
          members,
          activities: [makeActivity("member_created", members[0], "Migrated")],
          settings: defaultSettings,
          nextIdCounter: maxUsedId(members.map((m) => m.memberId)),
          source: "local",
        });
        return;
      }
    }
    useIdentity.getState().hydrate({
      members: [SEED],
      activities: [makeActivity("card_issued", SEED), makeActivity("member_created", SEED, "Initial member")],
      settings: defaultSettings,
      nextIdCounter: 1,
      source: "local",
    });
  } catch {
    useIdentity.getState().hydrate({
      members: [SEED], activities: [], settings: defaultSettings, nextIdCounter: 1, source: "local",
    });
  }
}

export async function bindIdentityPersistence() {
  if (typeof window === "undefined") return () => undefined;

  if (isSupabaseConfigured()) {
    try {
      const bundle = await api.fetchAll();
      if (bundle) {
        useIdentity.getState().hydrate({
          members: bundle.members,
          activities: bundle.activities,
          settings: bundle.settings,
          nextIdCounter: bundle.nextIdCounter,
          source: "supabase",
        });
      } else {
        loadLocal();
      }
    } catch (e) {
      useIdentity.setState({ error: e instanceof Error ? e.message : "Supabase connection failed" });
      loadLocal();
    }
    useIdentity.getState().setReady(true);
    return () => undefined;
  }

  loadLocal();
  useIdentity.getState().setReady(true);
  return useIdentity.subscribe((state) => {
    if (!state.ready || state.source === "supabase") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshotOf(state)));
    } catch { /* ignore */ }
  });
}

export { ROLES, DEFAULT_SESSION };
