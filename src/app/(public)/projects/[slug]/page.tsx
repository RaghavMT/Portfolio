import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectArticle } from "@/components/public/project-article";
import { pageMetadata } from "@/lib/metadata";
import { getProjectBySlug, getPublishedSlugs } from "@/server/queries/public";

export async function generateStaticParams() {
  const rows = await getPublishedSlugs();
  // Cache Components needs at least one param; an unknown slug 404s anyway.
  return rows.length > 0
    ? rows.map(({ slug }) => ({ slug }))
    : [{ slug: "not-found" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProjectBySlug(slug);
  if (!data) return {};
  const { project } = data;
  return pageMetadata({
    title: project.title,
    description: project.summary,
    path: `/projects/${project.slug}`,
    image: project.coverImageUrl,
    type: "article",
  });
}

// `params` is awaited INSIDE <Suspense>: with Partial Prefetching that is what lets Next serve the
// App Shell and then render a slug that wasn't known at build time (e.g. a project published later
// from the admin). Awaiting it at the top level made such slugs fail with a 500.
export default function ProjectPage(props: PageProps<"/projects/[slug]">) {
  return (
    <Suspense
      fallback={
        <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
          <p className="text-muted-foreground">Loading project…</p>
        </article>
      }
    >
      <ProjectContent params={props.params} />
    </Suspense>
  );
}

async function ProjectContent({
  params,
}: Pick<PageProps<"/projects/[slug]">, "params">) {
  const { slug } = await params;
  const data = await getProjectBySlug(slug);
  if (!data) notFound();
  return <ProjectArticle {...data} />;
}
