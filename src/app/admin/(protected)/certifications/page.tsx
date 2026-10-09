import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Certifications" };

export default async function CertificationsPage() {
  await requireAdminPage();
  return (
    <section>
      <h1 className="text-2xl font-semibold">Certifications</h1>
      <p className="mt-2 text-muted-foreground">
        Editing arrives in a later phase.
      </p>
    </section>
  );
}
