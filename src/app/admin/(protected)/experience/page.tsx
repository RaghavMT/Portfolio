import { ExperienceManager } from "@/components/admin/experience-manager";
import { listExperiences } from "@/server/admin/queries";
import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Experience" };

export default async function ExperiencePage() {
  await requireAdminPage();
  const items = await listExperiences();
  return (
    <section className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Experience</h1>
      <p className="mt-1 mb-6 text-muted-foreground">
        Your work history. Drag to reorder; the eye hides an entry without
        deleting it.
      </p>
      <ExperienceManager items={items} />
    </section>
  );
}
