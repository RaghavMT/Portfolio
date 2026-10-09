import { Section } from "@/components/public/section";
import { formatExpected, formatMonth } from "@/lib/format";
import { Markdown } from "@/lib/markdown";
import type { getEducation } from "@/server/queries/public";

type Entry = Awaited<ReturnType<typeof getEducation>>[number];

function period(e: Entry) {
  const start = formatMonth(e.startOn);
  if (!e.endOn) return `${start} – Present`;
  return `${start} – ${e.isExpected ? formatExpected(e.endOn) : formatMonth(e.endOn)}`;
}

export function EducationSection({ items }: { items: Entry[] }) {
  return (
    <Section id="education" title="Education">
      <ul className="grid gap-5 sm:grid-cols-2">
        {items.map((e) => (
          <li key={e.id} className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold">{e.institution}</h3>
            <p>
              {e.degree}
              {e.field && `, ${e.field}`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {period(e)}
              {e.grade && ` · ${e.grade}`}
            </p>
            {e.detailsMd && (
              <div className="mt-3 text-sm">
                <Markdown>{e.detailsMd}</Markdown>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}
