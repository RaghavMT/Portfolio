"use client";

import { ExternalLink, Eye, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { publishProblems } from "@/lib/admin/project";
import { isValidSlug, slugify } from "@/lib/slug";
import {
  projectFormSchema,
  type ProjectStatus,
} from "@/lib/validation/project";
import {
  checkProjectSlug,
  createProject,
  deleteProject,
  updateProject,
} from "@/server/actions/admin/projects";
import type { AdminProject } from "@/server/admin/queries";
import { ConfirmDialog } from "./confirm-dialog";
import { Field, useEntityForm } from "./entity-form";
import { SwitchRow } from "./form-parts";
import { GalleryField, type GalleryItem } from "./gallery-field";
import { ImageField } from "./image-field";
import { MarkdownField } from "./markdown-field";
import { TagInput } from "./tag-input";

const text = (v: string | null | undefined) => v ?? "";

const STORY_FIELDS = [
  {
    name: "problemMd",
    label: "Problem",
    max: 3000,
    help: "What problem did this solve, and for whom? Why did it matter?",
  },
  {
    name: "approachMd",
    label: "Approach",
    max: 5000,
    help: "What did you build and how? Name the key decisions and trade-offs.",
  },
  {
    name: "outcomeMd",
    label: "Outcome",
    max: 3000,
    help: "Results, numbers and what you learned. Recruiters look for impact.",
  },
] as const;

export function ProjectForm({
  project,
  tagSuggestions,
}: {
  /** Present when editing; absent for a new project. */
  project?: AdminProject;
  tagSuggestions: string[];
}) {
  const router = useRouter();
  const isPublished = project?.status === "published";
  // The slug follows the title until the user edits it themselves (SPEC §9.5).
  const [slugTouched, setSlugTouched] = useState(!!project);
  const [ongoing, setOngoing] = useState(project ? !project.endedOn : true);
  const [deleting, setDeleting] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const { form, onSubmit, pending } = useEntityForm({
    schema: projectFormSchema,
    defaultValues: {
      title: text(project?.title),
      slug: text(project?.slug),
      summary: text(project?.summary),
      role: text(project?.role),
      startedOn: text(project?.startedOn?.slice(0, 7)),
      endedOn: text(project?.endedOn?.slice(0, 7)),
      tech: project?.tech ?? [],
      coverImageUrl: text(project?.coverImageUrl),
      coverImageAlt: text(project?.coverImageAlt),
      gallery: (project?.gallery ?? []).map((g) => ({
        url: g.url,
        alt: g.alt,
        caption: text(g.caption),
      })),
      liveUrl: text(project?.liveUrl),
      repoUrl: text(project?.repoUrl),
      caseStudyUrl: text(project?.caseStudyUrl),
      problemMd: text(project?.problemMd),
      approachMd: text(project?.approachMd),
      outcomeMd: text(project?.outcomeMd),
      status: project?.status ?? "draft",
      featured: project?.featured ?? false,
    },
    submit: (values) =>
      project ? updateProject(project.id, values) : createProject(values),
    onSaved: (saved) => {
      if (!project) router.replace(`/admin/projects/${saved.id}`);
    },
    successMessage: "Saved — live on your site",
  });
  const {
    register,
    control,
    watch,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = form;
  const err = (name: keyof typeof errors) =>
    errors[name]?.message as string | undefined;

  const galleryErrors = errors.gallery as
    | Array<{ alt?: { message?: string }; caption?: { message?: string } }>
    | undefined;
  const slug = watch("slug");
  const status = watch("status");
  const slugChangedOnPublished =
    isPublished && !!project && slug.trim() !== project.slug;

  const titleField = register("title", {
    onChange: (e) => {
      if (!slugTouched) {
        setValue("slug", slugify(e.target.value), { shouldDirty: true });
        clearErrors("slug");
      }
    },
  });
  const slugField = register("slug", {
    onChange: () => {
      setSlugTouched(true);
      clearErrors("slug");
    },
    onBlur: async (e) => {
      const value = e.target.value.trim();
      if (!isValidSlug(value)) return;
      const result = await checkProjectSlug(value, project?.id);
      if (result.ok && !result.data.free) {
        setError("slug", {
          message: "Another project already uses that slug.",
        });
      }
    },
  });

  /** Save with an explicit status. Publishing re-checks the publish rule before calling the server. */
  async function submitAs(next: ProjectStatus) {
    if (next === "published") {
      const problems = publishProblems({
        summary: getValues("summary") ?? "",
        tech: getValues("tech") ?? [],
        coverImageUrl: (getValues("coverImageUrl") as string) || null,
        coverImageAlt: (getValues("coverImageAlt") as string) || null,
      });
      if (problems.length) {
        for (const p of problems) setError(p.field, { message: p.message });
        toast.error(problems[0].message);
        return;
      }
    }
    setValue("status", next, { shouldDirty: true });
    if (next === "draft") setValue("featured", false);
    await onSubmit();
  }

  async function confirmDelete() {
    if (!project) return;
    setDeletePending(true);
    const result = await deleteProject(project.id);
    setDeletePending(false);
    if (result.ok) {
      toast.success("Deleted — gone from your site");
      router.push("/admin/projects");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <form
        onSubmit={(e) => {
          // Enter in a text field saves with the status currently chosen.
          e.preventDefault();
          void submitAs(getValues("status") ?? "draft");
        }}
        className="max-w-2xl space-y-5"
        noValidate
      >
        <Field
          id="pj-title"
          label="Title"
          required
          error={err("title")}
          count={String(watch("title") ?? "").length}
          max={100}
        >
          <Input id="pj-title" aria-invalid={!!errors.title} {...titleField} />
        </Field>

        <Field
          id="pj-slug"
          label="Slug"
          required
          help={`Your project's web address: /projects/${slug || "…"}. It follows the title until you edit it.`}
          error={err("slug")}
          count={String(slug ?? "").length}
          max={80}
        >
          <Input
            id="pj-slug"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!!errors.slug}
            aria-describedby="pj-slug-help"
            {...slugField}
          />
        </Field>
        {slugChangedOnPublished ? (
          <p
            role="status"
            className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
          >
            This project is published. Changing its slug means old links will
            break.
          </p>
        ) : null}

        <Field
          id="pj-summary"
          label="Summary"
          required
          help="One or two sentences for the project card: what it is and why it matters."
          error={err("summary")}
          count={String(watch("summary") ?? "").length}
          max={200}
        >
          <Textarea
            id="pj-summary"
            rows={3}
            aria-invalid={!!errors.summary}
            aria-describedby="pj-summary-help"
            {...register("summary")}
          />
        </Field>

        <Field
          id="pj-role"
          label="Your role"
          help="e.g. “Solo project” or “Backend lead (team of 4)”."
          error={err("role")}
        >
          <Input
            id="pj-role"
            aria-invalid={!!errors.role}
            aria-describedby="pj-role-help"
            {...register("role")}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="pj-started" label="Started" error={err("startedOn")}>
            <Input
              id="pj-started"
              type="month"
              aria-invalid={!!errors.startedOn}
              {...register("startedOn")}
            />
          </Field>
          <Field id="pj-ended" label="Ended" error={err("endedOn")}>
            <Input
              id="pj-ended"
              type="month"
              disabled={ongoing}
              aria-invalid={!!errors.endedOn}
              {...register("endedOn")}
            />
          </Field>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="pj-ongoing"
            checked={ongoing}
            onCheckedChange={(checked) => {
              const value = checked === true;
              setOngoing(value);
              if (value) setValue("endedOn", "", { shouldDirty: true });
            }}
          />
          <Label htmlFor="pj-ongoing">Ongoing</Label>
        </div>

        <Field
          id="pj-tech"
          label="Technologies"
          help="Type a tool and press Enter (a comma works too). At least one is needed to publish. Up to 20."
          error={errors.tech?.message as string | undefined}
        >
          <Controller
            control={control}
            name="tech"
            render={({ field }) => (
              <TagInput
                id="pj-tech"
                value={field.value ?? []}
                onChange={field.onChange}
                max={20}
                maxLength={30}
                suggestions={tagSuggestions}
                invalid={!!errors.tech}
                describedBy="pj-tech-help"
              />
            )}
          />
        </Field>

        <fieldset className="space-y-5">
          <legend className="mb-2 text-sm font-medium">Links</legend>
          {(
            [
              ["liveUrl", "pj-live", "Live site"],
              ["repoUrl", "pj-repo", "Repository"],
              ["caseStudyUrl", "pj-case", "Case study"],
            ] as const
          ).map(([name, id, label]) => (
            <Field
              key={name}
              id={id}
              label={label}
              help={
                name === "caseStudyUrl"
                  ? "A blog post, Notion page or PDF. Must start with https://"
                  : "Must start with https://"
              }
              error={err(name)}
            >
              <Input
                id={id}
                inputMode="url"
                aria-invalid={!!errors[name]}
                aria-describedby={`${id}-help`}
                {...register(name)}
              />
            </Field>
          ))}
        </fieldset>

        <ImageField
          id="pj-cover"
          label="Cover image"
          kind="image"
          url={(watch("coverImageUrl") as string) || null}
          alt={(watch("coverImageAlt") as string) || null}
          minWidth={1200}
          help="Shown on the project card and at the top of the project page (16:9 works best). Required to publish."
          urlError={err("coverImageUrl")}
          altError={err("coverImageAlt")}
          onChange={({ url, alt }) => {
            setValue("coverImageUrl", url ?? "", { shouldDirty: true });
            setValue("coverImageAlt", alt ?? "", { shouldDirty: true });
            clearErrors(["coverImageUrl", "coverImageAlt"]);
          }}
        />

        <div className="space-y-3">
          {STORY_FIELDS.map((f) => (
            <details
              key={f.name}
              className="rounded-lg border p-3"
              open={!!project?.[f.name]}
            >
              <summary className="cursor-pointer text-sm font-medium">
                {f.label}
              </summary>
              <div className="mt-3">
                <Field
                  id={`pj-${f.name}`}
                  label={f.label}
                  help={`${f.help} Markdown works.`}
                  error={err(f.name)}
                  count={String(watch(f.name) ?? "").length}
                  max={f.max}
                >
                  <Controller
                    control={control}
                    name={f.name}
                    render={({ field }) => (
                      <MarkdownField
                        id={`pj-${f.name}`}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        rows={6}
                        invalid={!!errors[f.name]}
                        describedBy={`pj-${f.name}-help`}
                      />
                    )}
                  />
                </Field>
              </div>
            </details>
          ))}
        </div>

        <Controller
          control={control}
          name="gallery"
          render={({ field }) => (
            <GalleryField
              id="pj-gallery"
              value={(field.value ?? []) as GalleryItem[]}
              onChange={field.onChange}
              error={
                typeof errors.gallery?.message === "string"
                  ? errors.gallery.message
                  : undefined
              }
              errors={Object.fromEntries(
                (galleryErrors ?? []).map((e, i) => [
                  i,
                  { alt: e?.alt?.message, caption: e?.caption?.message },
                ]),
              )}
            />
          )}
        />

        <Field id="pj-status" label="Status">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  if (v === "draft") setValue("featured", false);
                }}
              >
                <SelectTrigger id="pj-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft (not public)</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Controller
          control={control}
          name="featured"
          render={({ field }) => (
            <SwitchRow
              id="pj-featured"
              label="Featured"
              help={
                status === "published"
                  ? "Featured projects appear on your home page."
                  : "Only published projects can be featured."
              }
              checked={status === "published" && (field.value ?? false)}
              onChange={(v) => {
                if (status === "published") field.onChange(v);
              }}
            />
          )}
        />

        <div className="flex flex-wrap gap-2">
          {isPublished ? (
            <Button
              type="button"
              size="lg"
              disabled={pending}
              onClick={() => void submitAs(getValues("status") ?? "published")}
            >
              {pending ? "Saving…" : "Save changes"}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="lg"
                variant="outline"
                disabled={pending}
                onClick={() => void submitAs("draft")}
              >
                {pending ? "Saving…" : "Save draft"}
              </Button>
              <Button
                type="button"
                size="lg"
                disabled={pending}
                onClick={() => void submitAs("published")}
              >
                Publish
              </Button>
            </>
          )}
          <Button asChild size="lg" variant="ghost">
            <Link href="/admin/projects">Back to projects</Link>
          </Button>
          {project ? (
            <Button asChild size="lg" variant="outline">
              <a
                href={`/admin/preview/projects/${project.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Eye aria-hidden /> Preview
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
          ) : null}
          {project && isPublished ? (
            <Button asChild size="lg" variant="ghost">
              <a
                href={`/projects/${project.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink aria-hidden /> View on site
              </a>
            </Button>
          ) : null}
          {project ? (
            <Button
              type="button"
              size="lg"
              variant="destructive"
              className="ml-auto"
              onClick={() => setDeleting(true)}
            >
              <Trash2 aria-hidden /> Delete
            </Button>
          ) : null}
        </div>
        {project ? (
          <p className="text-sm text-muted-foreground">
            Preview shows the last saved version. Save your changes first to see
            them.
          </p>
        ) : null}
      </form>

      {project ? (
        <ConfirmDialog
          open={deleting}
          onOpenChange={setDeleting}
          title={`Delete “${project.title}”?`}
          description="The project, its cover image and its gallery are deleted, and it disappears from your site immediately."
          requireTyped={project.title}
          pending={deletePending}
          onConfirm={confirmDelete}
        />
      ) : null}
    </>
  );
}
