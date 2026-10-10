import { notFound } from "next/navigation";
import { ProjectForm } from "@/components/admin/project-form";
import { getAdminProject, listProjectTechTags } from "@/server/admin/queries";
import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Edit project" };

export default async function EditProjectPage({
  params,
}: PageProps<"/admin/projects/[id]">) {
  await requireAdminPage();
  const { id } = await params;
  const [project, tagSuggestions] = await Promise.all([
    getAdminProject(id),
    listProjectTechTags(),
  ]);
  if (!project) notFound();
  return (
    <section>
      <h1 className="text-2xl font-semibold">Edit project</h1>
      <p className="mt-1 mb-6 max-w-2xl text-muted-foreground">
        {project.status === "published"
          ? "This project is live. Changes show on your site within seconds."
          : "This project is a draft and is not visible on your site."}
      </p>
      <ProjectForm
        key={project.id}
        project={project}
        tagSuggestions={tagSuggestions}
      />
    </section>
  );
}
