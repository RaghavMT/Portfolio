import { ArrowLeft, Code, ExternalLink, FileText } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TagList } from "@/components/public/section";
import { formatMonth } from "@/lib/format";
import { Markdown } from "@/lib/markdown";
import { getProjectBySlug, getPublishedSlugs } from "@/server/queries/public";

export async function generateStaticParams() {
  const rows = await getPublishedSlugs();
  // Cache Components needs at least one param; an unknown slug 404s anyway.
  return rows.length > 0
    ? rows.map(({ slug }) => ({ slug }))
    : [{ slug: "not-found" }];
}

const linkClass =
  "inline-flex min-h-10 items-center gap-2 rounded-md border px-4 text-sm transition-colors hover:bg-muted";

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const data = await getProjectBySlug(slug);
  if (!data) notFound();
  const { project, images, previous, next } = data;

  const sections = [
    ["Problem", project.problemMd],
    ["Approach", project.approachMd],
    ["Outcome", project.outcomeMd],
  ].filter(([, md]) => md.trim());

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
      <Link
        href="/projects"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All projects
      </Link>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {project.title}
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">{project.summary}</p>
      <p className="mt-3 text-sm text-muted-foreground">
        {[
          project.role,
          project.startedOn &&
            `${formatMonth(project.startedOn)} – ${project.endedOn ? formatMonth(project.endedOn) : "Ongoing"}`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <div className="mt-4">
        <TagList tags={project.tech} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {project.liveUrl && (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            <ExternalLink className="size-4" aria-hidden />
            Live site
          </a>
        )}
        {project.repoUrl && (
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            <Code className="size-4" aria-hidden />
            Source code
          </a>
        )}
        {project.caseStudyUrl && (
          <a
            href={project.caseStudyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            <FileText className="size-4" aria-hidden />
            Case study
          </a>
        )}
      </div>

      {project.coverImageUrl && (
        <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-xl bg-muted">
          <Image
            src={project.coverImageUrl}
            alt={project.coverImageAlt ?? ""}
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            priority
            className="object-cover"
          />
        </div>
      )}

      {sections.map(([heading, md]) => (
        <section key={heading} className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">{heading}</h2>
          <Markdown>{md}</Markdown>
        </section>
      ))}

      {images.length > 0 && (
        <section className="mt-10" aria-labelledby="gallery-heading">
          <h2 id="gallery-heading" className="mb-3 text-xl font-semibold">
            Gallery
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {images.map((img) => (
              <li key={img.id}>
                <figure>
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={img.url}
                      alt={img.alt}
                      fill
                      sizes="(min-width: 768px) 372px, 100vw"
                      className="object-cover"
                    />
                  </div>
                  {img.caption && (
                    <figcaption className="mt-1 text-sm text-muted-foreground">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(previous || next) && (
        <nav
          aria-label="More projects"
          className="mt-14 flex justify-between gap-4 border-t pt-6 text-sm"
        >
          {previous ? (
            <Link
              href={`/projects/${previous.slug}`}
              className="hover:underline"
            >
              ← {previous.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/projects/${next.slug}`}
              className="text-right hover:underline"
            >
              {next.title} →
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}
