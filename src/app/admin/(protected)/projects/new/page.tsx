import { ProjectForm } from "@/components/admin/project-form";
import { listProjectTechTags } from "@/server/admin/queries";
import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "New project" };

export default async function NewProjectPage() {
  await requireAdminPage();
  const tagSuggestions = await listProjectTechTags();
  return (
    <section>
      <h1 className="text-2xl font-semibold">New project</h1>
      <p className="mt-1 mb-6 max-w-2xl text-muted-foreground">
        Save a draft any time; it stays private until you publish.
      </p>
      <ProjectForm tagSuggestions={tagSuggestions} />
    </section>
  );
}
