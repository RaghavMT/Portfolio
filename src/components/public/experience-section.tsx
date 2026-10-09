import { Duration } from "@/components/public/duration";
import { Section, TagList } from "@/components/public/section";
import { formatDateRange } from "@/lib/format";
import { EMPLOYMENT_LABELS } from "@/lib/labels";
import { Markdown } from "@/lib/markdown";
import type { getExperiences } from "@/server/queries/public";

type Experience = Awaited<ReturnType<typeof getExperiences>>[number];

export function ExperienceSection({ items }: { items: Experience[] }) {
  return (
    <Section id="experience" title="Experience">
      <ol className="flex flex-col gap-10 border-l pl-6">
        {items.map((job) => (
          <li key={job.id} className="relative">
            <span
              aria-hidden
              className="absolute -left-[1.85rem] top-2 size-2.5 rounded-full bg-brand"
            />
            <h3 className="text-lg font-semibold">{job.title}</h3>
            <p className="text-muted-foreground">
              {job.companyUrl ? (
                <a
                  href={job.companyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {job.company}
                </a>
              ) : (
                job.company
              )}
              <span className="ml-2 rounded-md bg-muted px-2 py-0.5 text-xs">
                {EMPLOYMENT_LABELS[job.employmentType]}
              </span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateRange(job.startOn, job.endOn)} ·{" "}
              <Duration start={job.startOn} end={job.endOn} />
              {job.location && <> · {job.location}</>}
            </p>
            {job.summaryMd && (
              <div className="mt-3">
                <Markdown>{job.summaryMd}</Markdown>
              </div>
            )}
            {job.highlights.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5">
                {job.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <TagList tags={job.tech} />
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
