"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStaffProfile } from "@wokthai/shared";

export default function AdminSectionLayout({ children }: { children: React.ReactNode }) {
  const staff = useStaffProfile();
  const router = useRouter();

  useEffect(() => {
    if (staff.isLoading) return;
    if (!staff.data || staff.data.role !== "platform_admin") {
      router.replace("/orders");
    }
  }, [staff.isLoading, staff.data, router]);

  if (staff.isLoading || !staff.data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-stone-600 dark:text-zinc-400">
        Vérification des droits…
      </div>
    );
  }

  if (staff.data.role !== "platform_admin") {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="py-8">{children}</div>
    </div>
  );
}
