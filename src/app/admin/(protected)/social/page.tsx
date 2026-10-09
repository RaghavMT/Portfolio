import { SocialLinksManager } from "@/components/admin/social-links-manager";
import { listSocialLinks } from "@/server/admin/queries";
import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Social links" };

export default async function SocialLinksPage() {
  await requireAdminPage();
  const links = await listSocialLinks();
  return (
    <section className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Social links</h1>
      <p className="mt-1 mb-6 text-muted-foreground">
        Where recruiters can find you. Drag to reorder; the eye hides a link
        without deleting it.
      </p>
      <SocialLinksManager links={links} />
    </section>
  );
}
