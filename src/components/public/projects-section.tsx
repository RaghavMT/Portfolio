import Link from "next/link";
import { ProjectCard } from "@/components/public/project-card";
import { Section } from "@/components/public/section";
import type { getPublishedProjects } from "@/server/queries/public";

type Project = Awaited<ReturnType<typeof getPublishedProjects>>[number];

export function ProjectsSection({
  projects,
  hasMore,
}: {
  projects: Project[];
  hasMore: boolean;
}) {
  return (
    <Section
      id="projects"
      title="Projects"
      action={
        hasMore ? (
          <Link
            href="/projects"
            className="text-sm text-brand underline-offset-4 hover:underline"
          >
            See all projects →
          </Link>
        ) : undefined
      }
    >
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, i) => (
          <li key={project.id} className="flex">
            <ProjectCard project={project} priority={i === 0} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
