import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/modules/staff/current";
import { StaffNav } from "./staff-nav";
import { SignOutButton } from "./sign-out-button";

export const dynamic = "force-dynamic";

export default async function StaffAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getCurrentStaff();

  if (!staff) {
    // Middleware normalde redirect eder; profili olmayan auth user için fallback.
    redirect("/staff/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500">
                Alman Usulü
              </p>
              <p className="text-sm font-semibold text-neutral-900">Personel</p>
            </div>
            <StaffNav role={staff.role} />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-neutral-900">{staff.fullName}</p>
              <p className="text-[11px] text-neutral-500 uppercase tracking-wide">
                {staff.role}
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
