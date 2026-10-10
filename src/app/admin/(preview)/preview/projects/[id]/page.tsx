import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectArticle } from "@/components/public/project-article";
import { getPreviewProject } from "@/server/admin/queries";
import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Project preview" };

// `params` is awaited inside <Suspense>, like the public project page (D30).
export default function ProjectPreviewPage(
  props: PageProps<"/admin/preview/projects/[id]">,
) {
  return (
    <Suspense
      fallback={<p className="px-4 py-12 text-muted-foreground">Loading…</p>}
    >
      <PreviewContent params={props.params} />
    </Suspense>
  );
}

async function PreviewContent({
  params,
}: Pick<PageProps<"/admin/preview/projects/[id]">, "params">) {
  await requireAdminPage();
  const { id } = await params;
  const data = await getPreviewProject(id);
  if (!data) notFound();
  const { project } = data;

  return (
    <>
      {/* Sits just under the 4rem sticky site header. */}
      <div
        role="status"
        data-testid="preview-banner"
        className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/50 bg-amber-100 px-4 py-2 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"
      >
        <p>
          <strong>Preview — not public.</strong>{" "}
          {project.status === "published"
            ? "This project is live; this shows the last saved version."
            : "This is a draft; this shows the last saved version."}
        </p>
        <Link
          href={`/admin/projects/${project.id}`}
          className="font-medium underline underline-offset-2"
        >
          Back to editing
        </Link>
      </div>
      <ProjectArticle {...data} structuredData={false} />
    </>
  );
}
