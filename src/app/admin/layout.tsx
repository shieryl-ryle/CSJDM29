import Link from "next/link";
import { PageShell } from "@/components/site";
import { requireReviewer } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireReviewer();
  const links = [
    ["/admin", "Dashboard"],
    ["/admin/cases", "Owner cases"],
    ["/admin/pets", "Recovered pets"],
    ["/admin/videos", "Source videos"],
    ["/admin/matches", "Potential matches"],
    ["/admin/witness", "Information received"],
    ["/admin/export", "Export and print"],
    ["/admin/audit", "Audit log"],
  ];
  return (
    <PageShell>
      <div className="no-print mb-6 rounded-2xl border border-sand-200 bg-white p-3">
        <p className="text-xs text-ink-500">Reviewer area · signed in as {profile.display_name ?? "reviewer"} ({profile.role}). Every action is logged.</p>
        <nav aria-label="Reviewer" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="py-1.5 text-brand-700 hover:underline">{label}</Link>
          ))}
        </nav>
      </div>
      {children}
    </PageShell>
  );
}
