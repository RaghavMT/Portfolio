import { Suspense } from "react";
import { SiteShell } from "@/components/public/site-shell";
import { requireAdminPage } from "@/server/auth/require-admin";

// Same guard as the (protected) group (SPEC §12.3 #3), but the page is framed like the public site
// instead of the admin sidebar, so a draft preview looks exactly like what visitors will see.
async function Guard({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return children;
}

export default function PreviewLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={null}>
      <Guard>
        <SiteShell>{children}</SiteShell>
      </Guard>
    </Suspense>
  );
}
