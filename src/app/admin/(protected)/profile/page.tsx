import { ProfileForm } from "@/components/admin/profile-form";
import { ResumeField } from "@/components/admin/resume-field";
import { getAdminSettings } from "@/server/admin/queries";
import { requireAdminPage } from "@/server/auth/require-admin";
import { blobSize } from "@/server/blob";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  await requireAdminPage();
  const settings = await getAdminSettings();
  const resumeSize = settings ? await blobSize(settings.resumeUrl) : null;
  return (
    <section>
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-1 mb-6 max-w-2xl text-muted-foreground">
        The text at the top of your site. Recruiters read the headline and the
        first lines of About first, so keep them specific.
      </p>
      {settings ? (
        <div className="max-w-2xl space-y-10">
          <ProfileForm settings={settings} />
          <div className="border-t pt-8">
            <ResumeField
              url={settings.resumeUrl}
              updatedAt={settings.resumeUpdatedAt?.toISOString() ?? null}
              size={resumeSize}
            />
          </div>
        </div>
      ) : (
        <p role="alert" className="text-destructive">
          Settings row not found. Run the database seed.
        </p>
      )}
    </section>
  );
}
