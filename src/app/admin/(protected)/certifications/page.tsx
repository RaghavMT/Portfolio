import { CertificationsManager } from "@/components/admin/certifications-manager";
import { listCertifications } from "@/server/admin/queries";
import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Certifications" };

export default async function CertificationsPage() {
  await requireAdminPage();
  const items = await listCertifications();
  return (
    <section className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Certifications</h1>
      <p className="mt-1 mb-6 text-muted-foreground">
        Certificates, awards and achievements. Drag to reorder; the eye hides an
        entry without deleting it.
      </p>
      <CertificationsManager items={items} />
    </section>
  );
}
