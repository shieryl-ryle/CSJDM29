import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuditEntry {
  actorId: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  previous?: unknown;
  next?: unknown;
}

/**
 * Application-level audit entry (service role). Used for operations that do not run under the
 * user's own JWT — evidence upload, file access, hashing, anonymous submissions — and for
 * events that are not row changes (e.g. evidence downloaded). Row changes made under the
 * user's JWT are captured by DB triggers (see 0001_init.sql: audit_row()).
 * Never throws: an audit failure must not lose the user's data, but it is logged loudly.
 */
export async function logAudit(e: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("audit_logs").insert({
      actor_id: e.actorId,
      actor_role: e.actorRole ?? null,
      action: e.action,
      entity_type: e.entityType,
      entity_id: e.entityId ?? null,
      previous_value: e.previous ?? null,
      new_value: e.next ?? null,
    });
    if (error) console.error("AUDIT WRITE FAILED", e.action, error.message);
  } catch (err) {
    console.error("AUDIT WRITE FAILED", e.action, err);
  }
}
