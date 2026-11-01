import { Badge } from "@/components/site";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { setUserRole } from "@/app/admin/actions";

export const metadata = { title: "Users and roles" };
export const dynamic = "force-dynamic";

const PER_PAGE = 200;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; page?: string }> }) {
  const sp = await searchParams;
  const { user: me } = await requireAdmin();
  const admin = createAdminClient();
  const page = Math.max(1, Number(sp.page) || 1);
  const { data: list } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
  const { data: profiles } = await admin.from("profiles").select("id, display_name, role");
  const roleBy = new Map((profiles ?? []).map((p) => [p.id, p]));

  const needle = sp.q?.trim().toLowerCase();
  const rank = (r: string) => (r === "admin" ? 0 : r === "reviewer" ? 1 : 2);
  const rows = (list?.users ?? [])
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: roleBy.get(u.id)?.display_name ?? "",
      role: roleBy.get(u.id)?.role ?? "owner",
      created: u.created_at,
      last: u.last_sign_in_at ?? null,
    }))
    .filter((u) => (!needle || u.email.toLowerCase().includes(needle) || u.name.toLowerCase().includes(needle)) && (!sp.role || u.role === sp.role))
    .sort((a, b) => rank(a.role) - rank(b.role) || a.email.localeCompare(b.email));

  return (
    <div>
      <h1 className="section-title">Users and roles</h1>
      <div className="prose-plain mt-2 space-y-1 text-sm">
        <p>Ask the person to create an account on the site first, then set their role here. Role changes are recorded in the audit log.</p>
        <p>
          <strong>Owner</strong>: uses their own reports only. <strong>Reviewer</strong>: reviews all cases, records, matches and information; exports one case at a time.{" "}
          <strong>Administrator</strong>: reviewer rights plus bulk export, bulk print and this page.
        </p>
      </div>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Email or name" className="input max-w-xs" />
        <select name="role" defaultValue={sp.role ?? ""} className="input max-w-44">
          <option value="">All roles</option>
          <option value="admin">Administrator</option>
          <option value="reviewer">Reviewer</option>
          <option value="owner">Owner</option>
        </select>
        <button className="btn-secondary btn-sm">Filter</button>
      </form>

      <ul className="mt-5 space-y-2">
        {rows.map((u) => (
          <li key={u.id} className="card !p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="break-all font-semibold">
                  {u.email}
                  {u.id === me.id && <span className="ml-2 text-xs font-normal text-ink-500">(you)</span>}
                </p>
                <p className="text-xs text-ink-500">
                  {u.name || "no name"} | joined {formatDateTime(u.created)} | last sign-in {u.last ? formatDateTime(u.last) : "never"}
                </p>
              </div>
              <Badge tone={u.role === "admin" ? "good" : u.role === "reviewer" ? "info" : "neutral"}>{u.role}</Badge>
            </div>
            <form action={setUserRole} className="mt-2 flex flex-wrap gap-2">
              <input type="hidden" name="id" value={u.id} />
              <select name="role" defaultValue={u.role} className="input max-w-52" aria-label={`Role for ${u.email}`}>
                <option value="owner">Owner</option>
                <option value="reviewer">Reviewer</option>
                <option value="admin">Administrator</option>
              </select>
              <button className="btn-secondary btn-sm">Set role</button>
            </form>
          </li>
        ))}
        {rows.length === 0 && <li className="card text-ink-500">No users match.</li>}
      </ul>
      {(list?.users.length ?? 0) === PER_PAGE && (
        <p className="mt-4 text-sm"><a className="underline" href={`/admin/users?page=${page + 1}`}>Next page</a></p>
      )}
    </div>
  );
}
