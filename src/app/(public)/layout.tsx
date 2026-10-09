import Link from "next/link";
import { CurrentYear } from "@/components/public/current-year";
import { SocialLinks } from "@/components/public/social-links";
import { ThemeToggle } from "@/components/public/theme-toggle";
import { formatMonth } from "@/lib/format";
import {
  getLastUpdated,
  getSettings,
  getSocialLinks,
} from "@/server/queries/public";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const [settings, socials, lastUpdated] = await Promise.all([
    getSettings(),
    getSocialLinks(),
    getLastUpdated(),
  ]);

  if (!settings) {
    return (
      <main className="mx-auto max-w-[1100px] px-4 py-24">
        <h1 className="text-2xl font-semibold">Coming soon</h1>
        <p className="mt-2 text-muted-foreground">
          This site hasn&apos;t been set up yet.
        </p>
      </main>
    );
  }

  const updated = lastUpdated
    ? formatMonth(lastUpdated.toISOString().slice(0, 10))
    : null;

  return (
    <div data-accent={settings.accent} className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-foreground"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-4">
          <Link href="/" className="font-semibold">
            {settings.fullName}
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1 text-sm">
            <Link
              href="/projects"
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              Projects
            </Link>
            <Link
              href="/#contact"
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p>
              © <CurrentYear /> {settings.fullName}
            </p>
            {updated && <p>Last updated {updated}</p>}
          </div>
          <SocialLinks links={socials} />
        </div>
      </footer>
    </div>
  );
}
