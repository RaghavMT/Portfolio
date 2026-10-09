import { Mail } from "lucide-react";
import { Section } from "@/components/public/section";
import { SocialLinks } from "@/components/public/social-links";
import type { getSocialLinks } from "@/server/queries/public";

type Socials = Awaited<ReturnType<typeof getSocialLinks>>;

/** Email + links only for now; the form arrives in Phase 6 (FR-PUB-07). */
export function ContactSection({
  email,
  socials,
}: {
  email: string;
  socials: Socials;
}) {
  return (
    <Section id="contact" title="Get in touch">
      <p className="mb-4 max-w-xl text-muted-foreground">
        The best way to reach me is by email.
      </p>
      <a
        href={`mailto:${email}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-5 font-medium text-brand-foreground transition-opacity hover:opacity-90"
      >
        <Mail className="size-4" aria-hidden />
        {email}
      </a>
      <SocialLinks links={socials} className="mt-6" />
    </Section>
  );
}
