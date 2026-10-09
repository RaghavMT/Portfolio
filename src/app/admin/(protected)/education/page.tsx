import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Education" };

export default async function EducationPage() {
  await requireAdminPage();
  return (
    <section>
      <h1 className="text-2xl font-semibold">Education</h1>
      <p className="mt-2 text-muted-foreground">
        Editing arrives in a later phase.
      </p>
    </section>
  );
}
