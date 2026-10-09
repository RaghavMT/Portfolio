import { EducationManager } from "@/components/admin/education-manager";
import { listEducation } from "@/server/admin/queries";
import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Education" };

export default async function EducationPage() {
  await requireAdminPage();
  const items = await listEducation();
  return (
    <section className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Education</h1>
      <p className="mt-1 mb-6 text-muted-foreground">
        Your degrees and schools. Drag to reorder; the eye hides an entry
        without deleting it.
      </p>
      <EducationManager items={items} />
    </section>
  );
}
