import { ProjectCard } from "@/components/public/project-card";
import type { getPublishedProjects } from "@/server/queries/public";

type Project = Awaited<ReturnType<typeof getPublishedProjects>>[number];

export function ProjectGrid({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return <p className="text-muted-foreground">No projects match that tag.</p>;
  }
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, i) => (
        <li key={project.id} className="flex">
          <ProjectCard project={project} priority={i === 0} />
        </li>
      ))}
    </ul>
  );
}
