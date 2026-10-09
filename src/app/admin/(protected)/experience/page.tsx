import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Experience" };

export default async function ExperiencePage() {
  await requireAdminPage();
  return (
    <section>
      <h1 className="text-2xl font-semibold">Experience</h1>
      <p className="mt-2 text-muted-foreground">
        Editing arrives in a later phase.
      </p>
    </section>
  );
}
