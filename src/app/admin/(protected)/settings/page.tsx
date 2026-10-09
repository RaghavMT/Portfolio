import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdminPage();
  return (
    <section>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-2 text-muted-foreground">
        Settings arrive in a later phase.
      </p>
    </section>
  );
}
