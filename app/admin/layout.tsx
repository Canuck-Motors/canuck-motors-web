import { Suspense } from "react";
import { AdminShell } from "@/components/AdminShell";
import { AdminSidebar } from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell
      sidebar={
        <Suspense fallback={<div className="h-11 lg:h-[440px]" aria-hidden="true" />}>
          <AdminSidebar />
        </Suspense>
      }
    >
      {children}
    </AdminShell>
  );
}
