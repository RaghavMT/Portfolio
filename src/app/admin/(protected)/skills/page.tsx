import { SkillsManager } from "@/components/admin/skills-manager";
import { listSkillGroups } from "@/server/admin/queries";
import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Skills" };

export default async function SkillsPage() {
  await requireAdminPage();
  const groups = await listSkillGroups();
  return (
    <section className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Skills</h1>
      <p className="mt-1 mb-6 text-muted-foreground">
        Group your skills as chips. Drag groups to reorder; use the arrows on a
        chip to reorder skills within a group. No self-rated levels — recruiters
        don&apos;t trust them.
      </p>
      <SkillsManager groups={groups} />
    </section>
  );
}
