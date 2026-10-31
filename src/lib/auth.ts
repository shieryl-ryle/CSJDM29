import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export interface Session {
  supabase: SupabaseClient;
  user: User;
  profile: Profile;
}

export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("id, display_name, role").eq("id", user.id).maybeSingle();
  return { supabase, user, profile: (profile as Profile) ?? { id: user.id, display_name: null, role: "owner" } };
}

export const isReviewerRole = (role: string | undefined) => role === "reviewer" || role === "admin";

export async function requireUser(next?: string): Promise<Session> {
  const s = await getSession();
  if (!s) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return s;
}

export async function requireReviewer(): Promise<Session> {
  const s = await requireUser("/admin");
  if (!isReviewerRole(s.profile.role)) redirect("/?error=not-authorized");
  return s;
}

export async function requireAdmin(): Promise<Session> {
  const s = await requireUser("/admin");
  if (s.profile.role !== "admin") redirect("/admin?error=admin-only");
  return s;
}
