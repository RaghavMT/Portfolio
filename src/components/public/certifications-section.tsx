import { Section } from "@/components/public/section";
import { formatMonth } from "@/lib/format";
import { CERTIFICATION_LABELS } from "@/lib/labels";
import type { getCertifications } from "@/server/queries/public";

type Item = Awaited<ReturnType<typeof getCertifications>>[number];

export function CertificationsSection({ items }: { items: Item[] }) {
  return (
    <Section id="certifications" title="Certifications & awards">
      <ul className="grid gap-5 sm:grid-cols-2">
        {items.map((c) => (
          <li key={c.id} className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground">
              {CERTIFICATION_LABELS[c.kind]}
            </p>
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-sm text-muted-foreground">
              {[c.issuer, c.issuedOn && formatMonth(c.issuedOn)]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {c.description && <p className="mt-2 text-sm">{c.description}</p>}
            {c.credentialUrl && (
              <a
                href={c.credentialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm text-brand underline underline-offset-4"
              >
                View credential<span className="sr-only"> for {c.title}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}
