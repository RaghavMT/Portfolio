import { ArrowRight, Download, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SocialLinks } from "@/components/public/social-links";
import type { getSettings, getSocialLinks } from "@/server/queries/public";

type Settings = NonNullable<Awaited<ReturnType<typeof getSettings>>>;
type Socials = Awaited<ReturnType<typeof getSocialLinks>>;

export function Hero({
  settings,
  socials,
}: {
  settings: Settings;
  socials: Socials;
}) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 pb-10 pt-10 sm:flex-row sm:items-center sm:justify-between sm:pb-16 sm:pt-20"
    >
      <div className="flex max-w-2xl flex-col gap-4">
        {settings.openToWork && (
          <p className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm">
            <span className="size-2 rounded-full bg-brand" aria-hidden />
            {settings.openToWorkText ?? "Open to opportunities"}
          </p>
        )}
        <h1
          id="hero-heading"
          className="text-4xl font-bold tracking-tight sm:text-5xl"
        >
          {settings.fullName}
        </h1>
        <p className="text-xl text-muted-foreground sm:text-2xl">
          {settings.headline}
        </p>
        {settings.tagline && <p>{settings.tagline}</p>}
        {settings.location && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" aria-hidden />
            {settings.location}
          </p>
        )}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/#projects"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-5 font-medium text-brand-foreground transition-opacity hover:opacity-90"
          >
            View projects
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          {settings.resumeUrl && (
            <Link
              href="/resume"
              prefetch={false}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border px-5 font-medium transition-colors hover:bg-muted"
            >
              <Download className="size-4" aria-hidden />
              Download resume
            </Link>
          )}
        </div>
        <SocialLinks links={socials} className="pt-2" />
      </div>
      {settings.avatarUrl && (
        <Image
          src={settings.avatarUrl}
          alt={settings.avatarAlt ?? ""}
          width={192}
          height={192}
          sizes="192px"
          priority
          className="size-32 rounded-full object-cover sm:size-48"
        />
      )}
    </section>
  );
}
