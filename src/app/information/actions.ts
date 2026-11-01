"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

export type WitnessResult =
  | { ok: true; submissionId: string; uploadKey: string }
  | { ok: false; error: string };

const schema = z.object({
  info_text: z.string().trim().min(10, "Describe the information").max(8000),
  links: z.string().max(4000).optional(),
  approx_date: z.string().trim().max(100).optional(),
  location: z.string().trim().max(300).optional(),
  how_obtained: z.string().trim().min(3, "State how the information was obtained").max(2000),
  contact: z.string().trim().max(300).optional(),
  anonymous: z.string().optional(),
  website: z.string().optional(), // honeypot
});

/**
 * Public "I have information" form. Works without an account.
 * Anonymous = submitted_by is NOT stored. The service role is used because anonymous visitors have no table access.
 * Abuse controls: honeypot, salted IP-hash rate limit (5/hour), length limits, link scheme check.
 */
export async function submitWitness(form: FormData): Promise<WitnessResult> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.website) return { ok: false, error: "Could not submit." }; // bot

  const links = (d.links ?? "")
    .split(/\s+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (links.length > 10 || links.some((l) => !/^https?:\/\/\S{3,500}$/i.test(l))) return { ok: false, error: "Links must start with http:// or https:// (max 10)." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const ipHash = createHash("sha256").update(`${process.env.IP_HASH_SALT ?? ""}:${ip}`).digest("hex");

  const admin = createAdminClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin.from("witness_submissions").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
  if ((count ?? 0) >= 5) return { ok: false, error: "Too many submissions from this connection. Try again later." };

  const anonymous = d.anonymous === "on" || d.anonymous === "true";
  const session = anonymous ? null : await getSession();

  const { data, error } = await admin
    .from("witness_submissions")
    .insert({
      submitted_by: session?.user.id ?? null,
      is_anonymous: anonymous,
      info_text: d.info_text,
      links,
      approx_date: d.approx_date || null,
      location: d.location || null,
      how_obtained: d.how_obtained,
      contact: d.contact || null, // optional; visible to reviewers only
      ip_hash: ipHash,
    })
    .select("id, upload_key")
    .single();
  if (error || !data) return { ok: false, error: "Could not submit. Try again." };

  await logAudit({ actorId: session?.user.id ?? null, actorRole: session ? session.profile.role : "anonymous", action: "witness_submissions.create", entityType: "witness_submissions", entityId: data.id, next: { anonymous, links: links.length } });
  return { ok: true, submissionId: data.id, uploadKey: data.upload_key };
}
