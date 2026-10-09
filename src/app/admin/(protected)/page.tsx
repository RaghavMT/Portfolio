import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  await requireAdminPage();
  return (
    <section>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Signed in. Dashboard cards arrive in a later phase.
      </p>
    </section>
  );
}
