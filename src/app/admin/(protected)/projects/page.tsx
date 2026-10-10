import { ProjectsManager } from "@/components/admin/projects-manager";
import { listProjects } from "@/server/admin/queries";
import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  await requireAdminPage();
  const projects = await listProjects();
  return (
    <section className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <p className="mt-1 mb-6 text-muted-foreground">
        Drafts stay private until you publish them. The star features a
        published project on your home page.
      </p>
      <ProjectsManager projects={projects} />
    </section>
  );
}
