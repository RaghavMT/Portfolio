import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  await requireAdminPage();
  return (
    <section>
      <h1 className="text-2xl font-semibold">Projects</h1>
      <p className="mt-2 text-muted-foreground">
        Editing arrives in a later phase.
      </p>
    </section>
  );
}
