import { AlertTriangle, Check, Circle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  profileChecklist,
  resumeStatus,
  STALE_RESUME_DAYS,
} from "@/lib/admin/dashboard";
import { formatAdminTimestamp, formatRelativeTime } from "@/lib/format";
import {
  countUnreadMessages,
  getAdminSettings,
  getDashboardData,
} from "@/server/admin/queries";
import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Dashboard" };

function Card({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  const body = (
    <>
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="mt-2">{children}</div>
    </>
  );
  const base = "block rounded-xl border bg-card p-4";
  return href ? (
    <Link href={href} className={`${base} transition-colors hover:bg-muted`}>
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}

const big = "text-3xl font-semibold tabular-nums";

export default async function DashboardPage() {
  await requireAdminPage();
  const [settings, data, unread] = await Promise.all([
    getAdminSettings(),
    getDashboardData(),
    countUnreadMessages(),
  ]);
  if (!settings) {
    return (
      <section>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p role="alert" className="mt-2 text-destructive">
          Settings row not found. Run the database seed.
        </p>
      </section>
    );
  }

  const now = new Date();
  const resume = resumeStatus(settings.resumeUpdatedAt, now);
  const checklist = profileChecklist({
    avatarUrl: settings.avatarUrl,
    aboutMd: settings.aboutMd,
    publishedProjects: data.publishedProjects,
    resumeUrl: settings.resumeUrl,
    visibleSocialLinks: data.visibleSocialLinks,
    seoDescription: settings.seoDescription,
  });
  const doneCount = checklist.filter((i) => i.done).length;

  return (
    <section className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          What is live on your site and what still needs attention.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/admin/projects/new">+ New project</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/profile#resume">Replace resume</Link>
        </Button>
        <Button asChild variant="outline">
          <a href="/" target="_blank" rel="noopener noreferrer">
            View site <ExternalLink aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Published projects" href="/admin/projects">
          <p className={big} data-testid="published-count">
            {data.publishedProjects}
          </p>
        </Card>
        <Card title="Draft projects" href="/admin/projects">
          <p className={big} data-testid="draft-count">
            {data.draftProjects}
          </p>
        </Card>
        <Card title="Unread messages" href="/admin/messages">
          <p className={big} data-testid="unread-count">
            {unread}
          </p>
        </Card>
        <Card title="Resume last updated" href="/admin/profile#resume">
          {resume.state === "missing" ? (
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle
                className="size-4 text-amber-600 dark:text-amber-400"
                aria-hidden
              />
              No resume uploaded
            </p>
          ) : (
            <>
              <p className="font-medium" data-testid="resume-updated">
                {settings.resumeUpdatedAt
                  ? formatRelativeTime(settings.resumeUpdatedAt, now)
                  : null}
              </p>
              <p className="text-sm text-muted-foreground">
                {settings.resumeUpdatedAt
                  ? formatAdminTimestamp(settings.resumeUpdatedAt)
                  : null}
              </p>
              {resume.state === "stale" ? (
                <p
                  role="status"
                  className="mt-2 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300"
                >
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                  Over {STALE_RESUME_DAYS} days old. Consider replacing it.
                </p>
              ) : null}
            </>
          )}
        </Card>
      </div>

      <section aria-labelledby="checklist-heading">
        <h2 id="checklist-heading" className="text-lg font-semibold">
          Profile completeness
        </h2>
        <p
          className="text-sm text-muted-foreground"
          data-testid="checklist-summary"
        >
          {doneCount} of {checklist.length} done
        </p>
        <ul className="mt-3 divide-y rounded-xl border bg-card">
          {checklist.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                data-done={item.done}
                data-testid={`check-${item.key}`}
                className="flex min-h-12 items-center gap-3 px-4 py-2 transition-colors hover:bg-muted"
              >
                {item.done ? (
                  <Check
                    className="size-5 text-green-600 dark:text-green-400"
                    aria-hidden
                  />
                ) : (
                  <Circle
                    className="size-5 text-muted-foreground"
                    aria-hidden
                  />
                )}
                <span
                  className={
                    item.done ? "text-muted-foreground" : "font-medium"
                  }
                >
                  {item.label}
                </span>
                <span className="sr-only">
                  {item.done ? "(done)" : "(not done yet)"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
