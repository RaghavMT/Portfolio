import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProjectGrid } from "@/components/public/project-grid";
import { pageMetadata } from "@/lib/metadata";
import { getPublishedProjects, getSettings } from "@/server/queries/public";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const name = settings?.fullName ?? "Portfolio";
  return pageMetadata({
    title: `Projects — ${name}`,
    description: `Projects built by ${name}: what each one does, how it was built and what came out of it.`,
    path: "/projects",
  });
}

/** Tag chips are plain links (?tag=react), so filtering works without JS and is shareable. */
async function Filtered({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ tag: raw }, projects] = await Promise.all([
    searchParams,
    getPublishedProjects(),
  ]);
  const active = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase();

  const tags = new Map<string, string>();
  for (const p of projects)
    for (const t of p.tech)
      if (!tags.has(t.toLowerCase())) tags.set(t.toLowerCase(), t);

  const shown = active
    ? projects.filter((p) => p.tech.some((t) => t.toLowerCase() === active))
    : projects;

  return (
    <>
      {tags.size > 0 && (
        <nav aria-label="Filter by technology" className="mb-8">
          <ul className="flex flex-wrap gap-2">
            {[["", "All"], ...tags].map(([key, label]) => {
              const current = (active ?? "") === key;
              return (
                <li key={key}>
                  <Link
                    href={
                      key
                        ? `/projects?tag=${encodeURIComponent(key)}`
                        : "/projects"
                    }
                    aria-current={current ? "true" : undefined}
                    className={`inline-flex min-h-9 items-center rounded-full border px-3 text-sm transition-colors ${
                      current
                        ? "bg-brand text-brand-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      <ProjectGrid projects={shown} />
    </>
  );
}

export default async function ProjectsPage({
  searchParams,
}: PageProps<"/projects">) {
  // The unfiltered grid is the static shell; the filter is applied once the request is known.
  const all = await getPublishedProjects();
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-12 sm:py-16">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Projects</h1>
      <Suspense fallback={<ProjectGrid projects={all} />}>
        <Filtered searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
