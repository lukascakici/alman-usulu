import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/modules/staff/current";
import { StaffNav } from "./staff-nav";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function StaffAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/staff/login");

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black text-neutral-900 dark:text-neutral-50">
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 dark:bg-black/75 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 min-w-0">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 font-semibold">
                Alman Usulü
              </p>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">Personel</p>
            </div>
            <StaffNav role={staff.role} />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 leading-tight">
                {staff.fullName}
              </p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.12em]">
                {staff.role}
              </p>
            </div>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
