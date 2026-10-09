import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdminPage } from "@/server/auth/require-admin";

// requireAdmin() reads cookies (runtime data), which Cache Components requires inside <Suspense>.
async function Guard({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return children;
}

export default function ProtectedLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminNav />
      <main id="main" className="min-w-0 flex-1 p-4 md:p-8">
        <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
          <Guard>{children}</Guard>
        </Suspense>
      </main>
    </div>
  );
}
