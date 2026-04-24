import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/modules/staff/current";
import { AdminSubNav } from "./admin-sub-nav";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["owner", "admin"]);

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getCurrentStaff();
  if (!staff) return null;
  if (!ALLOWED.has(staff.role)) redirect("/staff/mutfak");

  return (
    <div>
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="max-w-4xl mx-auto px-5 py-3">
          <AdminSubNav />
        </div>
      </div>
      {children}
    </div>
  );
}
