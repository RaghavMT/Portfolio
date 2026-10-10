"use client";

import { Copy, ExternalLink, Pencil, Plus, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteProject,
  duplicateProject,
  reorderProjects,
  setProjectFeatured,
  setProjectStatus,
} from "@/server/actions/admin/projects";
import type { AdminProjectRow } from "@/server/admin/queries";
import { ConfirmDialog } from "./confirm-dialog";
import { SortableList } from "./sortable-list";
import { VisibilityToggle } from "./visibility-toggle";

type Filter = "all" | "published" | "draft";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
];

function StatusPill({ status }: { status: AdminProjectRow["status"] }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        status === "published"
          ? "bg-primary/15 text-foreground"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {status === "published" ? "Published" : "Draft"}
    </span>
  );
}

function FeaturedToggle({ project }: { project: AdminProjectRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const disabled = project.status !== "published";

  function toggle() {
    start(async () => {
      const result = await setProjectFeatured(project.id, !project.featured);
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      disabled={pending || disabled}
      aria-pressed={project.featured}
      aria-label={`${project.title}: ${project.featured ? "Featured" : "Not featured"}. ${
        disabled ? "Publish it to feature it" : "Click to toggle"
      }`}
      title={disabled ? "Publish to feature" : "Featured"}
    >
      <Star
        aria-hidden
        className={project.featured ? "fill-current" : undefined}
      />
    </Button>
  );
}

/** Project list (SPEC §9.5): filters, search, reorder, quick toggles, edit, view, duplicate, delete. */
export function ProjectsManager({ projects }: { projects: AdminProjectRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<AdminProjectRow | null>(null);
  const [pending, setPending] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const search = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          (filter === "all" || p.status === filter) &&
          (!search || p.title.toLowerCase().includes(search)),
      ),
    [projects, filter, search],
  );
  const reorderable = filter === "all" && !search;

  async function confirmDelete() {
    if (!deleting) return;
    setPending(true);
    const result = await deleteProject(deleting.id);
    setPending(false);
    if (result.ok) {
      toast.success("Deleted — gone from your site");
      setDeleting(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function duplicate(project: AdminProjectRow) {
    setDuplicating(true);
    const result = await duplicateProject(project.id);
    setDuplicating(false);
    if (result.ok) {
      toast.success("Duplicated as a draft");
      router.push(`/admin/projects/${result.data.id}`);
    } else {
      toast.error(result.error);
    }
  }

  const addButton = (
    <Button asChild size="lg">
      <Link href="/admin/projects/new">
        <Plus aria-hidden /> Add project
      </Link>
    </Button>
  );

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="font-medium">No projects yet</p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Projects are the first thing recruiters look at. Start with one you
          are proud of.
        </p>
        {addButton}
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filter projects" className="flex gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              type="button"
              size="lg"
              variant={filter === f.value ? "default" : "outline"}
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title"
          aria-label="Search projects by title"
          className="h-9 max-w-56 min-w-40 flex-1"
        />
        <div className="ml-auto">{addButton}</div>
      </div>

      {reorderable ? null : (
        <p className="mb-3 text-sm text-muted-foreground">
          Clear the filter and search to reorder projects.
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No projects match.
        </p>
      ) : (
        <SortableList
          items={filtered}
          noun="project"
          getLabel={(p) => p.title}
          onReorder={reorderProjects}
          reorderable={reorderable}
          renderItem={(p) => (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/projects/${p.id}`}
                  className="truncate font-medium hover:underline"
                >
                  {p.title}
                </Link>
                <StatusPill status={p.status} />
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {p.summary}
              </p>
              <p className="text-xs text-muted-foreground">
                Updated {p.updatedAt.toISOString().slice(0, 10)}
              </p>
            </div>
          )}
          renderActions={(p) => (
            <>
              <FeaturedToggle project={p} />
              <VisibilityToggle
                visible={p.status === "published"}
                label={p.title}
                onLabel="Published"
                offLabel="Draft"
                onChange={(published) =>
                  setProjectStatus(p.id, published ? "published" : "draft")
                }
              />
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label={`Edit ${p.title}`}
              >
                <Link href={`/admin/projects/${p.id}`}>
                  <Pencil aria-hidden />
                </Link>
              </Button>
              {p.status === "published" ? (
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  aria-label={`View ${p.title} on site`}
                >
                  <a
                    href={`/projects/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink aria-hidden />
                  </a>
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={duplicating}
                onClick={() => void duplicate(p)}
                aria-label={`Duplicate ${p.title}`}
              >
                <Copy aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setDeleting(p)}
                aria-label={`Delete ${p.title}`}
              >
                <Trash2 aria-hidden />
              </Button>
            </>
          )}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.title ?? ""}”?`}
        description="The project and its gallery are removed and disappear from your site immediately."
        requireTyped={deleting?.title}
        pending={pending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
