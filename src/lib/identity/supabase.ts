import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type DbMember = {
  uid: string;
  member_id: string;
  name: string;
  role: string;
  session: string;
  status: "active" | "suspended" | "revoked";
  card_status: "none" | "issued" | "reissued" | "revoked";
  photo: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  card_issued_at: string | null;
  last_verified_at: string | null;
  archived: boolean;
};

export type DbActivity = {
  id: string;
  action: string;
  member_id: string;
  member_name: string;
  detail: string | null;
  timestamp: string;
};

export type DbSettings = {
  id: number;
  club_name: string;
  current_session: string;
  default_role: string;
  next_id_counter: number;
};

let client: SupabaseClient | null = null;

/** True when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return Boolean(url && key && url.startsWith("http"));
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}
