import { ProfileForm } from "@/components/admin/profile-form";
import { getAdminSettings } from "@/server/admin/queries";
import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  await requireAdminPage();
  const settings = await getAdminSettings();
  return (
    <section>
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-1 mb-6 max-w-2xl text-muted-foreground">
        The text at the top of your site. Recruiters read the headline and the
        first lines of About first, so keep them specific.
      </p>
      {settings ? (
        <ProfileForm settings={settings} />
      ) : (
        <p role="alert" className="text-destructive">
          Settings row not found. Run the database seed.
        </p>
      )}
    </section>
  );
}
