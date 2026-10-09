import { Code, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { TagList } from "@/components/public/section";
import type { getPublishedProjects } from "@/server/queries/public";

type Project = Awaited<ReturnType<typeof getPublishedProjects>>[number];

/**
 * The title link's ::after covers the whole card (so the card is one click target), while the
 * Live/Code icon buttons sit above it with z-10; no links are nested inside links.
 */
export function ProjectCard({
  project,
  priority = false,
}: {
  project: Project;
  priority?: boolean;
}) {
  return (
    <article className="relative flex w-full flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-brand">
      {project.coverImageUrl && (
        <div className="relative aspect-video w-full bg-muted">
          <Image
            src={project.coverImageUrl}
            alt={project.coverImageAlt ?? ""}
            fill
            sizes="(min-width: 1024px) 350px, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            className="object-cover"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-lg font-semibold">
          <Link
            href={`/projects/${project.slug}`}
            className="after:absolute after:inset-0"
          >
            {project.title}
          </Link>
        </h3>
        <p className="text-sm text-muted-foreground">{project.summary}</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <TagList tags={project.tech} limit={5} />
          <div className="relative z-10 flex gap-1">
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${project.title}: live site`}
                className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="size-4" aria-hidden />
              </a>
            )}
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${project.title}: source code`}
                className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Code className="size-4" aria-hidden />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
