import { SettingsSections } from "@/components/admin/settings-sections";
import {
  AppearanceForm,
  ContactFormToggle,
  LogoutAllDevices,
  SeoForm,
} from "@/components/admin/settings-forms";
import { getAdminSettings } from "@/server/admin/queries";
import { requireAdminPage } from "@/server/auth/require-admin";
import type { Accent } from "@/lib/validation/site-settings";

export const metadata = { title: "Settings" };

function Block({
  id,
  title,
  hint,
  children,
}: {
  id?: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-4 space-y-3 border-t pt-6 first:border-t-0 first:pt-0"
    >
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  await requireAdminPage();
  const settings = await getAdminSettings();
  if (!settings) {
    return (
      <section>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p role="alert" className="mt-2 text-destructive">
          Settings row not found. Run the database seed.
        </p>
      </section>
    );
  }
  return (
    <section className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          How your site is laid out, coloured and found.
        </p>
      </div>

      <Block
        title="Sections"
        hint="Reorder the home page and hide sections. The hero always comes first and the footer last."
      >
        <SettingsSections sections={settings.sections} />
      </Block>

      <Block
        title="Appearance"
        hint="Pick an accent colour for buttons and links."
      >
        <AppearanceForm accent={settings.accent as Accent} />
      </Block>

      <Block
        id="seo"
        title="SEO"
        hint="How your site appears in search results."
      >
        <SeoForm settings={settings} />
      </Block>

      <Block title="Contact form">
        <ContactFormToggle enabled={settings.contactFormEnabled} />
      </Block>

      <Block
        title="Session"
        hint="Signs out every browser that is logged in to this admin panel."
      >
        <LogoutAllDevices />
      </Block>
    </section>
  );
}
